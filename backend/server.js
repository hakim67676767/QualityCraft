require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("node:fs");
const path = require("node:path");

const app = express();

app.disable("x-powered-by");
app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path === "/api" || req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
});
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "64kb" }));

const db = require("./db");
const content = require("./services/contentService");
const reporting = require("./services/reportingService");
const research = require("./services/researchService");
const assessments = require("./services/assessmentService");
const { gradeSubmission } = require("./lib/grading");
const { HttpError, asyncHandler, notFound, errorHandler } = require("./lib/http");
const { requirePositiveInt, requireEmail, requirePassword, requireString, optionalBoolean, readOptions } = require("./lib/validation");
const { recalculateModuleProgress } = require("./services/progressService");
const { awardOnce } = require("./services/rewardService");
const { unlockedModuleIds, requireUnlockedLesson } = require("./middleware/journey");
const { requireStudent, requireAdmin } = require("./middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET;
const loginAttempts = new Map();
function throttleLogin(req, res, next) {
    const key = `${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`;
    const now = Date.now();
    const state = loginAttempts.get(key);
    if (state && state.until > now && state.count >= 10) return res.status(429).json({ message: "Too many login attempts. Try again later" });
    if (!state || state.until <= now) loginAttempts.set(key, { count: 1, until: now + 15 * 60_000 });
    else state.count++;
    if (loginAttempts.size > 5000) for (const [entry, value] of loginAttempts) if (value.until <= now) loginAttempts.delete(entry);
    req.loginAttemptKey = key;
    next();
}

function createToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "1d" }
    );
}

const sessionCookie = { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000, path: "/" };
function setSession(res, token) { res.cookie("qualitycraft_session", token, sessionCookie); }

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";
    const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const cookie = (req.headers.cookie || "").split("; ").find((item) => item.startsWith("qualitycraft_session="));

    try {
        const token = bearer && bearer !== "null" ? bearer : cookie ? decodeURIComponent(cookie.slice("qualitycraft_session=".length)) : "";
        req.auth = jwt.verify(token, JWT_SECRET);
        if (!Number.isSafeInteger(req.auth.id) || req.auth.purpose === 'assessment') throw new Error('Invalid session');
        return next();
    } catch {
        return res.status(401).json({ message: "Authentication required" });
    }
}

async function loadUserRole(userId) {
    const [rows] = await db.promise().execute(
        "SELECT r.role_name FROM `user` u JOIN `role` r ON r.role_id = u.role_id WHERE u.user_id = ?",
        [userId]
    );
    return rows[0]?.role_name;
}

async function requireTeacherOrAdmin(req, res, next) {
    try {
        const role = await loadUserRole(req.auth.id);
        if (role !== "teacher" && role !== "administrator") {
            return res.status(403).json({ message: "Teacher or administrator access required" });
        }
        req.auth.role = role;
        return next();
    } catch (error) {
        console.error("Role check failed:", error.message);
        return res.status(500).json({ message: "Unable to verify permissions" });
    }
}

async function requirePreTest(req, res, next) {
    try {
        const [rows] = await db.promise().execute(
            "SELECT response_id FROM `survey_response` WHERE user_id = ? AND phase = 'pre' LIMIT 1",
            [req.auth.id]
        );
        if (!rows.length) return res.status(403).json({ message: "Complete the pre-test before accessing modules" });
        return next();
    } catch (error) {
        console.error("Pre-test check failed:", error.message);
        return res.status(500).json({ message: "Unable to verify pre-test status" });
    }
}

async function requireClassMembership(req, res, next) {
    try {
        const [rows] = await db.promise().execute(
            "SELECT class_member_id FROM `class_member` WHERE student_id = ? LIMIT 1",
            [req.auth.id]
        );
        if (!rows.length) return res.status(403).json({ message: "Join a class before starting the pre-test" });
        return next();
    } catch (error) {
        console.error("Class membership check failed:", error.message);
        return res.status(500).json({ message: "Unable to verify class membership" });
    }
}

async function requireResearchAuthorization(req, res, next) {
    try {
        const [settings] = await db.promise().execute("SELECT setting_value FROM `system_setting` WHERE setting_key = 'requireResearchAuthorisation'");
        const enabled = settings.length && (settings[0].setting_value === true || settings[0].setting_value === 1 || settings[0].setting_value === "true");
        if (!enabled) return next();
        const [participants] = await db.promise().execute("SELECT status, school_permission, guardian_consent, student_assent FROM `research_participant` WHERE user_id = ? LIMIT 1", [req.auth.id]);
        if (!participants.length || !research.isAuthorised(participants[0])) return res.status(403).json({ message: "Research participation requires recorded permission, consent, and assent" });
        return next();
    } catch (error) { next(error); }
}

async function requireCompletedModules(req, res, next) {
    try {
        const [rows] = await db.promise().execute(
            "SELECT COUNT(*) AS total_modules, SUM(CASE WHEN p.status = 'complete' THEN 1 ELSE 0 END) AS completed_modules FROM `module` m LEFT JOIN progress p ON p.module_id = m.module_id AND p.user_id = ? WHERE m.status = 'published'",
            [req.auth.id]
        );
        const totalModules = Number(rows[0]?.total_modules || 0);
        const completedModules = Number(rows[0]?.completed_modules || 0);
        if (!totalModules || completedModules < totalModules) {
            return res.status(403).json({ message: "Complete every learning module before taking the post-test" });
        }
        return next();
    } catch (error) {
        console.error("Completed module check failed:", error.message);
        return res.status(500).json({ message: "Unable to verify module completion" });
    }
}

async function requireUnlockedQuiz(req, res, next) {
    try {
        const lessonId = requirePositiveInt(req.body.lessonId, "Lesson id");
        const [rows] = await db.promise().execute(
            "SELECT l.module_id FROM `lesson` l JOIN `module` m ON m.module_id = l.module_id WHERE l.lesson_id = ? AND m.status = 'published'",
            [lessonId]
        );
        if (!rows.length) return res.status(404).json({ message: "Published lesson not found" });
        const { unlocked } = await unlockedModuleIds(req.auth.id);
        if (!unlocked.has(Number(rows[0].module_id))) return res.status(403).json({ message: "Complete earlier modules first" });
        const [completion] = await db.promise().execute(
            "SELECT completion_id FROM `lesson_completion` WHERE user_id = ? AND lesson_id = ? LIMIT 1",
            [req.auth.id, lessonId]
        );
        if (!completion.length) return res.status(403).json({ message: "Complete this lesson before taking its quiz" });
        const [requiredActivities] = await db.promise().execute(
            `SELECT a.activity_id FROM \`activity\` a
             LEFT JOIN \`activity_submission\` s ON s.activity_id = a.activity_id AND s.user_id = ?
             WHERE a.lesson_id = ? AND a.is_required = TRUE AND s.submission_id IS NULL`,
            [req.auth.id, lessonId]
        );
        if (requiredActivities.length) return res.status(403).json({ message: "Submit every required practical activity before taking this quiz" });
        req.moduleId = Number(rows[0].module_id);
        next();
    } catch (error) { next(error); }
}

async function requireUnlockedActivity(req, res, next) {
    try {
        const activityId = requirePositiveInt(req.params.activityId, "Activity id");
        const [rows] = await db.promise().execute(
            "SELECT l.module_id, a.activity_type FROM `activity` a JOIN `lesson` l ON l.lesson_id = a.lesson_id JOIN `module` m ON m.module_id = l.module_id WHERE a.activity_id = ? AND m.status = 'published'",
            [activityId]
        );
        if (!rows.length) return res.status(404).json({ message: "Published activity not found" });
        const { unlocked } = await unlockedModuleIds(req.auth.id);
        if (!unlocked.has(Number(rows[0].module_id))) return res.status(403).json({ message: "Complete earlier modules first" });
        req.moduleId = Number(rows[0].module_id);
        req.activityType = rows[0].activity_type;
        next();
    } catch (error) { next(error); }
}

app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body || {};
    let cleanName, normalizedEmail, cleanPassword;
    try {
        cleanName = requireString(name, "Name", { max: 100 });
        normalizedEmail = requireEmail(email);
        cleanPassword = requirePassword(password);
    } catch (error) { return res.status(error.status || 400).json({ message: error.message }); }

    if (!JWT_SECRET) {
        return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const requestedRole = "student";

    try {
        const [registrationSettings] = await db.promise().execute("SELECT setting_value FROM `system_setting` WHERE setting_key = 'allowPublicRegistration'");
        if (registrationSettings.length && (registrationSettings[0].setting_value === false || registrationSettings[0].setting_value === 0 || registrationSettings[0].setting_value === "false")) {
            return res.status(403).json({ message: "Public registration is disabled. Ask an administrator to create your account" });
        }
        const [existingUsers] = await db.promise().execute(
            "SELECT user_id FROM `user` WHERE email = ?",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: "An account with this email already exists" });
        }

        const [roles] = await db.promise().execute(
            "SELECT role_id, role_name FROM `role` WHERE role_name = ?",
            [requestedRole]
        );
        if (!roles[0]) return res.status(400).json({ message: "Invalid account role" });

        const passwordHash = await bcrypt.hash(cleanPassword, 12);
        const [result] = await db.promise().execute(
            "INSERT INTO `user` (role_id, name, email, password_hash) VALUES (?, ?, ?, ?)",
            [roles[0].role_id, cleanName, normalizedEmail, passwordHash]
        );
        const user = { id: result.insertId, name: cleanName, email: normalizedEmail, role: roles[0].role_name };

        const token = createToken(user);
        setSession(res, token);
        return res.status(201).json({ user, token });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "An account with this email already exists" });
        console.error("Registration failed:", error.message);
        return res.status(500).json({ message: "Unable to create account" });
    }
});

app.post("/api/auth/login", throttleLogin, async (req, res) => {
    const { email, password, role } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    if (!JWT_SECRET) {
        return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    try {
        const [users] = await db.promise().execute(
            "SELECT u.user_id, u.name, u.email, u.password_hash, r.role_name FROM `user` u JOIN `role` r ON r.role_id = u.role_id WHERE u.email = ?",
            [email.trim().toLowerCase()]
        );
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const selectedRole = String(role || "").toLowerCase();
        if (selectedRole && selectedRole !== user.role_name) {
            return res.status(403).json({ message: `This account is registered as ${user.role_name}` });
        }

        const safeUser = { id: user.user_id, name: user.name, email: user.email, role: user.role_name };
        loginAttempts.delete(req.loginAttemptKey);
        const token = createToken(safeUser);
        setSession(res, token);
        return res.json({ user: safeUser, token });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({ message: "Unable to log in" });
    }
});

app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("qualitycraft_session", { path: "/", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    res.json({ message: "Signed out" });
});

app.get("/api/pre-test", requireAuth, requireStudent, requireClassMembership, requireResearchAuthorization, asyncHandler(async (req, res) => res.json(await assessments.deliverAssessment(req.auth.id, 'pre', req.query.retake === '1'))));
app.post("/api/pre-test", requireAuth, requireStudent, requireClassMembership, requireResearchAuthorization, asyncHandler(async (req, res) => {
    const result = await assessments.submitAssessment(req.auth.id, 'pre', req.body);
    const reward = result.isRetake ? { earnedXp: 0, newBadges: [] } : await awardOnce(req.auth.id, 'assessment:pre', 'pre_test_complete');
    res.status(201).json({ ...result, ...reward });
}));

app.post("/api/lessons/:lessonId/complete", requireAuth, requireStudent, requireClassMembership, requirePreTest, requireUnlockedLesson, asyncHandler(async (req, res) => {
    const [result] = await db.promise().execute(
        "INSERT IGNORE INTO `lesson_completion` (user_id, lesson_id) VALUES (?, ?)",
        [req.auth.id, req.lesson.lessonId]
    );
    const progress = await recalculateModuleProgress(req.auth.id, req.lesson.moduleId);
    res.status(result.affectedRows ? 201 : 200).json({ lessonId: req.lesson.lessonId, completed: true, progress });
}));

app.get("/api/modules", requireAuth, requireClassMembership, requirePreTest, async (req, res) => {
    try {
        const [rows] = await db.promise().execute(
            "SELECT m.module_id, m.title AS module_title, l.lesson_id, l.title AS lesson_title, l.content AS lesson_content, IF(lc.completion_id IS NULL, 0, 1) AS lesson_completed, q.question_id, q.type, q.options, q.question_text FROM `module` m JOIN `lesson` l ON l.module_id = m.module_id JOIN `question` q ON q.lesson_id = l.lesson_id LEFT JOIN `lesson_completion` lc ON lc.lesson_id = l.lesson_id AND lc.user_id = ? WHERE m.status = 'published' ORDER BY m.sequence_no, m.module_id, l.sequence_no, q.question_id",
            [req.auth.id]
        );
        return res.json(rows);
    } catch (error) {
        console.error("Loading modules failed:", error.message);
        return res.status(500).json({ message: "Unable to load questions" });
    }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
        const [classes] = await db.promise().execute(
            "SELECT c.class_id, c.class_name AS name, teacher.name AS teacher, COUNT(all_members.class_member_id) AS members, 1 AS joined FROM `class_member` membership JOIN `class` c ON c.class_id = membership.class_id JOIN `user` teacher ON teacher.user_id = c.teacher_id LEFT JOIN `class_member` all_members ON all_members.class_id = c.class_id WHERE membership.student_id = ? GROUP BY c.class_id, c.class_name, teacher.name ORDER BY c.class_id",
            [req.auth.id]
        );
        const [progress] = await db.promise().execute(
            "SELECT p.progress_id, p.module_id, m.title, p.status, p.percent_complete FROM progress p JOIN `module` m ON m.module_id = p.module_id WHERE p.user_id = ? ORDER BY p.module_id",
            [req.auth.id]
        );
        const [surveys] = await db.promise().execute(
            "SELECT response_id, phase, score, rating_mean, ratings, submitted_at FROM `survey_response` WHERE user_id = ? ORDER BY submitted_at DESC",
            [req.auth.id]
        );
        const [badges] = await db.promise().execute(
            "SELECT b.badge_id, b.name, b.code, b.description, b.criteria, b.criteria_type, b.criteria_threshold, ub.awarded_at FROM `user_badge` ub JOIN `badge` b ON b.badge_id = ub.badge_id WHERE ub.user_id = ? ORDER BY ub.awarded_at DESC",
            [req.auth.id]
        );
        const [attempts] = await db.promise().execute(
            "SELECT qa.attempt_id, qa.lesson_id, l.title AS lesson_title, qa.score, qa.completed_at FROM `quiz_attempt` qa JOIN `lesson` l ON l.lesson_id = qa.lesson_id WHERE qa.user_id = ? ORDER BY qa.completed_at DESC, qa.attempt_id DESC",
            [req.auth.id]
        );
        const [users] = await db.promise().execute(
            "SELECT xp_points FROM `user` WHERE user_id = ?",
            [req.auth.id]
        );

        const [surveyRetakes] = await db.promise().execute("SELECT aa.assessment_attempt_id, aa.phase, aa.rating_mean, aa.ratings, aa.submitted_at, i.version FROM assessment_attempt aa LEFT JOIN assessment_instrument i ON i.instrument_id = aa.instrument_id WHERE aa.user_id = ? AND aa.is_retake = TRUE ORDER BY aa.assessment_attempt_id DESC", [req.auth.id]);
        return res.json({ classes, progress, surveys, surveyRetakes, badges, attempts, xpPoints: users[0]?.xp_points || 0 });
    } catch (error) {
        console.error("Loading dashboard failed:", error.message);
        return res.status(500).json({ message: "Unable to load dashboard data" });
    }
});

async function submitQuizAttempt(req, res, isRetake) {
    const { lessonId, answers, previousAttemptId } = req.body;

    if (!Number.isInteger(Number(lessonId)) || !Array.isArray(answers)) {
        return res.status(400).json({ message: "A lesson and answer list are required" });
    }
    if (isRetake && (!Number.isSafeInteger(Number(previousAttemptId)) || Number(previousAttemptId) <= 0)) {
        return res.status(400).json({ message: "The latest quiz attempt is required to start a retake" });
    }

    try {
        const [questions] = await db.promise().execute(
            "SELECT question_id, question_text, type, options, answer_key, explanation FROM `question` WHERE lesson_id = ? ORDER BY question_id",
            [lessonId]
        );

        if (questions.length === 0 || questions.length !== answers.length) {
            return res.status(400).json({ message: "This quiz has an invalid question set" });
        }

        if (answers.some((answer) => !String(answer ?? "").trim())) return res.status(400).json({ message: "Answer every question before submitting" });
        const graded = gradeSubmission(questions, answers);
        // Lock the student's row so two fast requests cannot both create a first attempt.
        const connection = await db.promise().getConnection();
        let attemptId;
        try {
            await connection.beginTransaction();
            await connection.execute("SELECT user_id FROM `user` WHERE user_id = ? FOR UPDATE", [req.auth.id]);
            const [previous] = await connection.execute("SELECT attempt_id FROM `quiz_attempt` WHERE user_id = ? AND lesson_id = ? ORDER BY attempt_id DESC LIMIT 1", [req.auth.id, lessonId]);
            if (!isRetake && previous.length) {
                await connection.rollback();
                return res.status(409).json({ message: "This quiz was already submitted. Use Retake Quiz on Learning Path to try again." });
            }
            if (isRetake && !previous.length) {
                await connection.rollback();
                return res.status(409).json({ message: "Submit the quiz once before choosing Retake Quiz." });
            }
            if (isRetake && Number(previous[0].attempt_id) !== Number(previousAttemptId)) {
                await connection.rollback();
                return res.status(409).json({ message: "This retake was already submitted. Return to Learning Path to start another." });
            }
            const [attempt] = await connection.execute(
                "INSERT INTO `quiz_attempt` (user_id, lesson_id, score, correct_count, total_questions, completed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                [req.auth.id, lessonId, graded.score, graded.correctAnswers, graded.totalQuestions]
            );
            attemptId = attempt.insertId;
            for (const item of graded.feedback) {
                await connection.execute("INSERT INTO `quiz_attempt_answer` (attempt_id, question_id, submitted_answer, correct_answer, is_correct, feedback) VALUES (?, ?, ?, ?, ?, ?)",
                    [attemptId, item.questionId, item.submittedAnswer, item.correctAnswer, item.isCorrect, item.explanation || item.message]);
            }
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        const progress = await recalculateModuleProgress(req.auth.id, req.moduleId);
        const quizReward = isRetake ? { earnedXp: 0, newBadges: [] } : await awardOnce(req.auth.id, `quiz:${lessonId}`, "quiz_submission");
        const answerReward = isRetake ? { earnedXp: 0, newBadges: [] } : await awardOnce(req.auth.id, `quiz-answers:${lessonId}`, "quiz_correct_answer", graded.correctAnswers);
        const moduleReward = progress.becameComplete ? await awardOnce(req.auth.id, `module:${req.moduleId}`, "module_complete") : { earnedXp: 0, newBadges: [] };
        return res.status(201).json({
            ...graded,
            attemptId,
            earnedXp: quizReward.earnedXp + answerReward.earnedXp + moduleReward.earnedXp,
            newBadges: [...quizReward.newBadges, ...answerReward.newBadges, ...moduleReward.newBadges],
            progress
        });
    } catch (error) {
        console.error("Quiz submission failed:", error.message);
        return res.status(500).json({ message: "Unable to submit quiz" });
    }
}

app.post("/api/quiz-attempts", requireAuth, requireStudent, requireClassMembership, requirePreTest, requireUnlockedQuiz, (req, res) => submitQuizAttempt(req, res, false));
app.post("/api/quiz-attempts/retake", requireAuth, requireStudent, requireClassMembership, requirePreTest, requireUnlockedQuiz, (req, res) => submitQuizAttempt(req, res, true));

app.get("/api/classes", requireAuth, async (req, res) => {
    try {
        const [rows] = await db.promise().execute(
            "SELECT c.class_id, c.class_name AS name, teacher.name AS teacher, COUNT(all_members.class_member_id) AS members, EXISTS (SELECT 1 FROM `class_member` own_membership WHERE own_membership.class_id = c.class_id AND own_membership.student_id = ?) AS joined FROM `class` c JOIN `user` teacher ON teacher.user_id = c.teacher_id LEFT JOIN `class_member` all_members ON all_members.class_id = c.class_id GROUP BY c.class_id, c.class_name, teacher.name ORDER BY c.class_id",
            [req.auth.id]
        );
        return res.json(rows);
    } catch (error) {
        console.error("Loading classes failed:", error.message);
        return res.status(500).json({ message: "Unable to load classes" });
    }
});

app.post("/api/classes/:classId/join", requireAuth, requireStudent, async (req, res) => {
    try {
        const classId = requirePositiveInt(req.params.classId, "Class id");
        await db.promise().execute(
            "INSERT INTO `class_member` (class_id, student_id) VALUES (?, ?)",
            [classId, req.auth.id]
        );
        const reward = await awardOnce(req.auth.id, `class:${classId}`, "class_join");
        return res.status(201).json({ message: "Class joined successfully", ...reward });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "You are already a member of this class" });
        }
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({ message: "Class not found" });
        }
        console.error("Joining class failed:", error.message);
        return res.status(500).json({ message: "Unable to join class" });
    }
});

app.post("/api/classes", requireAuth, requireTeacherOrAdmin, async (req, res) => {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 150) {
        return res.status(400).json({ message: "Class name is required" });
    }

    try {
        const [result] = await db.promise().execute(
            "INSERT INTO `class` (teacher_id, class_name) VALUES (?, ?)",
            [req.auth.id, name.trim()]
        );
        return res.status(201).json({ classId: result.insertId, name: name.trim() });
    } catch (error) {
        console.error("Creating class failed:", error.message);
        return res.status(500).json({ message: "Unable to create class" });
    }
});

app.patch("/api/management/users/:userId/role", requireAuth, async (req, res) => {
    try {
        if (await loadUserRole(req.auth.id) !== "administrator") {
            return res.status(403).json({ message: "Administrator access required" });
        }
        const { role } = req.body;
        const roleName = String(role || "student").toLowerCase();
        const [roles] = await db.promise().execute("SELECT role_id FROM `role` WHERE role_name = ?", [roleName]);
        if (!roles[0]) return res.status(400).json({ message: "Invalid role" });
        const userId = requirePositiveInt(req.params.userId, "User id");
        if (userId === req.auth.id && roleName !== "administrator") return res.status(409).json({ message: "You cannot remove your own administrator access" });
        const [result] = await db.promise().execute("UPDATE `user` SET role_id = ? WHERE user_id = ?", [roles[0].role_id, userId]);
        if (!result.affectedRows) return res.status(404).json({ message: "User not found" });
        return res.json({ message: "User role updated" });
    } catch (error) {
        console.error("Updating role failed:", error.message);
        return res.status(500).json({ message: "Unable to update role" });
    }
});

app.get("/api/activities", requireAuth, requireStudent, requireClassMembership, requirePreTest, async (req, res) => {
    try {
        const [rows] = await db.promise().execute(
            "SELECT a.activity_id, a.lesson_id, a.activity_type, a.title, a.instructions, a.is_required, s.submission_id, s.content, s.status, s.feedback, s.reviewed_at, s.submitted_at FROM `activity` a JOIN `lesson` l ON l.lesson_id = a.lesson_id JOIN `module` m ON m.module_id = l.module_id AND m.status = 'published' LEFT JOIN `activity_submission` s ON s.activity_id = a.activity_id AND s.user_id = ? ORDER BY m.sequence_no, l.sequence_no, a.activity_id",
            [req.auth.id]
        );
        const [assignments] = await db.promise().execute(`SELECT ca.assignment_id, ca.activity_id, ca.due_at, c.class_id, c.class_name
            FROM \`class_assignment\` ca JOIN \`class\` c ON c.class_id = ca.class_id JOIN \`class_member\` cm ON cm.class_id = c.class_id
            WHERE cm.student_id = ? ORDER BY ca.due_at, ca.assignment_id`, [req.auth.id]);
        return res.json(rows.map((row) => ({ ...row, assignments: assignments.filter((assignment) => assignment.activity_id === row.activity_id) })));
    } catch (error) {
        console.error("Loading activities failed:", error.message);
        return res.status(500).json({ message: "Unable to load activities" });
    }
});

app.post("/api/activities/:activityId/submissions", requireAuth, requireStudent, requireClassMembership, requirePreTest, requireUnlockedActivity, async (req, res) => {
    const content = req.body.content;
    const fields = { test_case: ["title", "input", "steps", "expectedResult", "actualResult"], bug_report: ["title", "steps", "expectedResult", "actualResult", "severity"], reflection: ["improvement", "measurement"] }[req.activityType];
    if (!fields || !content || typeof content !== "object" || Array.isArray(content) || fields.some((field) => typeof content[field] !== "string" || !content[field].trim() || content[field].length > 5000) || (req.activityType === "bug_report" && !["Low", "Medium", "High"].includes(content.severity))) {
        return res.status(400).json({ message: "Complete every activity field before submitting" });
    }
    const safeContent = Object.fromEntries(fields.map((field) => [field, content[field].trim()]));

    try {
        const [existingSubmissions] = await db.promise().execute(
            "SELECT submission_id, xp_awarded FROM `activity_submission` WHERE activity_id = ? AND user_id = ?",
            [req.params.activityId, req.auth.id]
        );
        await db.promise().execute(
            `INSERT INTO \`activity_submission\` (activity_id, user_id, content) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                status = IF(content = VALUES(content), status, 'submitted'),
                feedback = IF(content = VALUES(content), feedback, NULL),
                reviewed_by = IF(content = VALUES(content), reviewed_by, NULL),
                reviewed_at = IF(content = VALUES(content), reviewed_at, NULL),
                submitted_at = CURRENT_TIMESTAMP, content = VALUES(content)`,
            [req.params.activityId, req.auth.id, JSON.stringify(safeContent)]
        );
        const activityReward = existingSubmissions[0]?.xp_awarded ? { earnedXp: 0, newBadges: [] } : await awardOnce(req.auth.id, `activity:${req.params.activityId}`, "activity_submission");
        if (activityReward.earnedXp) {
            await db.promise().execute(
                "UPDATE `activity_submission` SET xp_awarded = TRUE WHERE activity_id = ? AND user_id = ?",
                [req.params.activityId, req.auth.id]
            );
        }
        const progress = await recalculateModuleProgress(req.auth.id, req.moduleId);
        const moduleReward = progress.becameComplete ? await awardOnce(req.auth.id, `module:${req.moduleId}`, "module_complete") : { earnedXp: 0, newBadges: [] };
        return res.status(201).json({
            message: "Activity submitted successfully",
            earnedXp: activityReward.earnedXp + moduleReward.earnedXp,
            newBadges: [...activityReward.newBadges, ...moduleReward.newBadges],
            progress
        });
    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") return res.status(404).json({ message: "Activity not found" });
        console.error("Activity submission failed:", error.message);
        return res.status(500).json({ message: "Unable to submit activity" });
    }
});

app.get("/api/post-test", requireAuth, requireStudent, requireClassMembership, requireResearchAuthorization, requirePreTest, requireCompletedModules, asyncHandler(async (req, res) => res.json(await assessments.deliverAssessment(req.auth.id, 'post', req.query.retake === '1'))));
app.post("/api/post-test", requireAuth, requireStudent, requireClassMembership, requireResearchAuthorization, requirePreTest, requireCompletedModules, asyncHandler(async (req, res) => {
    const result = await assessments.submitAssessment(req.auth.id, 'post', req.body);
    const reward = result.isRetake ? { earnedXp: 0, newBadges: [] } : await awardOnce(req.auth.id, 'assessment:post', 'post_test_complete');
    res.status(201).json({ ...result, ...reward });
}));

app.get("/api/me", requireAuth, asyncHandler(async (req, res) => {
    const [rows] = await db.promise().execute("SELECT u.user_id AS id, u.name, u.email, r.role_name AS role FROM `user` u JOIN `role` r ON r.role_id = u.role_id WHERE u.user_id = ?", [req.auth.id]);
    if (!rows.length) throw new HttpError(401, "Account no longer exists");
    res.json(rows[0]);
}));

app.get("/api/me/journey", requireAuth, requireStudent, asyncHandler(async (req, res) => {
    const [memberships] = await db.promise().execute("SELECT class_id FROM `class_member` WHERE student_id = ?", [req.auth.id]);
    const [assessments] = await db.promise().execute("SELECT phase FROM `survey_response` WHERE user_id = ?", [req.auth.id]);
    const { ordered, unlocked, completed } = await unlockedModuleIds(req.auth.id);
    const joinedClass = memberships.length > 0;
    const preTestDone = assessments.some((row) => row.phase === "pre");
    const postTestDone = assessments.some((row) => row.phase === "post");
    const allModulesComplete = ordered.length > 0 && ordered.every((id) => completed.has(id));
    res.json({ joinedClass, preTestDone, postTestDone, moduleIds: ordered, unlockedModuleIds: joinedClass && preTestDone ? [...unlocked] : [], completedModuleIds: [...completed], allModulesComplete,
        nextAction: !joinedClass ? "Join a class" : !preTestDone ? "Complete the pre-test" : !allModulesComplete ? "Continue learning" : !postTestDone ? "Take the post-test" : "Course complete" });
}));

app.get("/api/suitability", requireAuth, requireStudent, asyncHandler(async (req, res) => {
    const [rows] = await db.promise().execute("SELECT response_id, answers, comment, submitted_at FROM `suitability_response` WHERE user_id = ?", [req.auth.id]);
    res.json(rows[0] || null);
}));
app.post("/api/suitability", requireAuth, requireStudent, requireResearchAuthorization, asyncHandler(async (req, res) => {
    const [post] = await db.promise().execute("SELECT response_id FROM `survey_response` WHERE user_id = ? AND phase = 'post'", [req.auth.id]);
    if (!post.length) throw new HttpError(403, "Complete the post-test first");
    const answers = req.body.answers;
    if (!Array.isArray(answers) || answers.length !== 6 || answers.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) throw new HttpError(400, "Answer all six suitability questions from 1 to 5");
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim().slice(0, 1000) : null;
    await db.promise().execute("INSERT INTO `suitability_response` (user_id, answers, comment) VALUES (?, ?, ?)", [req.auth.id, JSON.stringify(answers), comment]);
    res.status(201).json({ message: "Feedback recorded" });
}));

app.get("/api/management/users", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const [rows] = await db.promise().query("SELECT u.user_id, u.name, u.email, r.role_name AS role, u.created_at FROM `user` u JOIN `role` r ON r.role_id = u.role_id ORDER BY u.created_at DESC LIMIT 500");
    res.json(rows);
}));

app.post("/api/management/users", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const name = requireString(req.body.name, "Name", { max: 100 });
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const role = ["student", "teacher", "administrator"].includes(req.body.role) ? req.body.role : null;
    if (!role) throw new HttpError(400, "Valid role is required");
    const [roles] = await db.promise().execute("SELECT role_id FROM `role` WHERE role_name = ?", [role]);
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.promise().execute("INSERT INTO `user` (role_id, name, email, password_hash) VALUES (?, ?, ?, ?)", [roles[0].role_id, name, email, hash]);
    res.status(201).json({ id: result.insertId, name, email, role });
}));

// Admin content management uses the validated service layer. Students only see published content.
const admin = [requireAuth, requireAdmin];
const actor = (req) => ({ id: req.auth.id, role: "administrator" });
async function writeAudit(req, action, entityType, entityId, summary, details = null) {
    await db.promise().execute("INSERT INTO `audit_log` (actor_id, actor_role, action, entity_type, entity_id, summary, details) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.auth.id, req.auth.role || "administrator", action, entityType, entityId || null, summary, details ? JSON.stringify(details) : null]);
}

app.get("/api/admin/research-participants", ...admin, asyncHandler(async (req, res) => {
    const [rows] = await db.promise().query(`SELECT rp.participant_id, rp.user_id, rp.study_code, rp.status, rp.school_permission, rp.guardian_consent, rp.student_assent, rp.approved_at, rp.updated_at, u.name, u.email
        FROM \`research_participant\` rp JOIN \`user\` u ON u.user_id = rp.user_id ORDER BY rp.updated_at DESC LIMIT 1000`);
    const [eligibleUsers] = await db.promise().query(`SELECT u.user_id, u.name, u.email FROM \`user\` u JOIN \`role\` r ON r.role_id = u.role_id LEFT JOIN \`research_participant\` rp ON rp.user_id = u.user_id WHERE r.role_name = 'student' AND rp.participant_id IS NULL ORDER BY u.name`);
    res.json({ participants: rows, eligibleUsers });
}));
app.post("/api/admin/research-participants", ...admin, asyncHandler(async (req, res) => {
    const userId = requirePositiveInt(req.body.userId, "Student");
    const consentValues = { schoolPermission: optionalBoolean(req.body.schoolPermission), guardianConsent: optionalBoolean(req.body.guardianConsent), studentAssent: optionalBoolean(req.body.studentAssent) };
    const consent = research.validateConsent(consentValues);
    const status = req.body.status === "withdrawn" ? "withdrawn" : consent.valid ? "authorised" : "pending";
    const [users] = await db.promise().execute("SELECT u.user_id FROM `user` u JOIN `role` r ON r.role_id = u.role_id WHERE u.user_id = ? AND r.role_name = 'student'", [userId]);
    if (!users.length) throw new HttpError(404, "Student account not found");
    const [codes] = await db.promise().query("SELECT study_code FROM `research_participant`");
    const studyCode = research.generateStudyCode(codes.map((row) => row.study_code));
    const [result] = await db.promise().execute(`INSERT INTO \`research_participant\` (user_id, study_code, status, school_permission, guardian_consent, student_assent, approved_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, studyCode, status, consentValues.schoolPermission, consentValues.guardianConsent, consentValues.studentAssent, status === "authorised" ? new Date() : null]);
    await writeAudit(req, "create", "research_participant", result.insertId, `Research participant ${studyCode} enrolled`, { status });
    res.status(201).json({ participantId: result.insertId, userId, studyCode, status, consentErrors: consent.errors });
}));
app.patch("/api/admin/research-participants/:id", ...admin, asyncHandler(async (req, res) => {
    const id = requirePositiveInt(req.params.id, "Participant");
    const [current] = await db.promise().execute("SELECT * FROM `research_participant` WHERE participant_id = ?", [id]);
    if (!current.length) throw new HttpError(404, "Participant not found");
    const consentValues = {
        schoolPermission: optionalBoolean(req.body.schoolPermission ?? current[0].school_permission),
        guardianConsent: optionalBoolean(req.body.guardianConsent ?? current[0].guardian_consent),
        studentAssent: optionalBoolean(req.body.studentAssent ?? current[0].student_assent),
    };
    const consent = research.validateConsent(consentValues);
    const requested = req.body.status ?? current[0].status;
    if (!["pending", "authorised", "withdrawn"].includes(requested)) throw new HttpError(400, 'Invalid participant status');
    if (requested === "authorised" && !consent.valid) throw new HttpError(400, "All permissions, consent, and assent are required before authorisation");
    const status = requested === "withdrawn" ? "withdrawn" : requested === "authorised" ? "authorised" : "pending";
    const [result] = await db.promise().execute(`UPDATE \`research_participant\` SET status = ?, school_permission = ?, guardian_consent = ?, student_assent = ?, approved_at = CASE WHEN ? = 'authorised' THEN COALESCE(approved_at, CURRENT_TIMESTAMP) ELSE NULL END WHERE participant_id = ?`, [status, !!consentValues.schoolPermission, !!consentValues.guardianConsent, !!consentValues.studentAssent, status, id]);
    if (!result.affectedRows) throw new HttpError(404, "Participant not found");
    await writeAudit(req, "update", "research_participant", id, `Research participant status changed to ${status}`);
    res.json({ participantId: id, status, consentErrors: consent.errors });
}));

app.get("/api/admin/assessment-instruments", ...admin, asyncHandler(async (req, res) => {
    const [instruments] = await db.promise().query("SELECT instrument_id, phase, title, version, status, created_at, updated_at FROM `assessment_instrument` ORDER BY phase, updated_at DESC");
    const [items] = await db.promise().query("SELECT item_id, instrument_id, construct_key, type, prompt, options, answer_key, sequence_no, is_required FROM `assessment_item` ORDER BY sequence_no, item_id");
    res.json(instruments.map((instrument) => ({ ...instrument, items: items.filter((item) => item.instrument_id === instrument.instrument_id).map((item) => ({ prompt: item.prompt, type: item.type, options: readOptions(item.options), answerKey: item.answer_key, constructKey: item.construct_key || '' })) })));
}));
app.post("/api/admin/assessment-instruments", ...admin, asyncHandler(async (req, res) => {
    const result = await assessments.saveInstrument(null, req.body, req.auth.id);
    await writeAudit(req, "create", "assessment_instrument", result.instrumentId, `${result.phase} assessment ${result.version} created`);
    res.status(201).json(result);
}));
app.patch("/api/admin/assessment-instruments/:id", ...admin, asyncHandler(async (req, res) => {
    const id = requirePositiveInt(req.params.id, "Instrument");
    const result = await assessments.saveInstrument(id, req.body, req.auth.id);
    await writeAudit(req, "update", "assessment_instrument", id, `Assessment instrument changed to ${result.status}`);
    res.json(result);
}));

app.get("/api/admin/audit-logs", ...admin, asyncHandler(async (req, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const [rows] = await db.promise().execute("SELECT al.log_id, al.action, al.entity_type, al.entity_id, al.summary, al.details, al.created_at, u.name AS actor_name FROM `audit_log` al LEFT JOIN `user` u ON u.user_id = al.actor_id ORDER BY al.created_at DESC, al.log_id DESC LIMIT ?", [limit]);
    res.json(rows);
}));
app.get("/api/admin/settings", ...admin, asyncHandler(async (req, res) => {
    const [rows] = await db.promise().query("SELECT setting_key, setting_value, updated_at FROM `system_setting`");
    const settings = { researchModeEnabled: false, allowPublicRegistration: true, requireResearchAuthorisation: false };
    for (const row of rows) settings[row.setting_key] = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
    res.json(settings);
}));
app.patch("/api/admin/settings", ...admin, asyncHandler(async (req, res) => {
    const allowed = ["researchModeEnabled", "allowPublicRegistration", "requireResearchAuthorisation"];
    for (const key of allowed) if (Object.hasOwn(req.body, key)) await db.promise().execute("INSERT INTO `system_setting` (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)", [key, JSON.stringify(optionalBoolean(req.body[key])), req.auth.id]);
    await writeAudit(req, "update", "system_setting", null, "System governance settings updated", Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body, key)).map((key) => [key, !!req.body[key]])));
    res.json({ message: "Settings saved" });
}));
async function loadResearchRecords() {
    const [rows] = await db.promise().query(`SELECT rp.study_code, rp.status, rp.school_permission, rp.guardian_consent, rp.student_assent,
        MAX(CASE WHEN sr.phase = 'pre' THEN sr.score END) AS pre_score,
        MAX(CASE WHEN sr.phase = 'post' THEN sr.score END) AS post_score,
        MAX(CASE WHEN sr.phase = 'pre' THEN sr.ratings END) AS pre_ratings,
        MAX(CASE WHEN sr.phase = 'post' THEN sr.ratings END) AS post_ratings,
        MAX(su.answers) AS suitability_responses,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('phase', aa.phase, 'ratingMean', aa.rating_mean, 'ratings', aa.ratings, 'submittedAt', aa.submitted_at, 'version', i.version)) FROM assessment_attempt aa LEFT JOIN assessment_instrument i ON i.instrument_id = aa.instrument_id WHERE aa.user_id = rp.user_id AND aa.is_retake = TRUE) AS retake_responses,
        (SELECT i.version FROM \`assessment_attempt\` aa JOIN \`assessment_instrument\` i ON i.instrument_id = aa.instrument_id WHERE aa.user_id = rp.user_id AND aa.phase = 'pre' AND aa.is_retake = FALSE ORDER BY aa.assessment_attempt_id DESC LIMIT 1) AS pre_instrument_version,
        (SELECT i.version FROM \`assessment_attempt\` aa JOIN \`assessment_instrument\` i ON i.instrument_id = aa.instrument_id WHERE aa.user_id = rp.user_id AND aa.phase = 'post' AND aa.is_retake = FALSE ORDER BY aa.assessment_attempt_id DESC LIMIT 1) AS post_instrument_version
        FROM \`research_participant\` rp
        LEFT JOIN \`survey_response\` sr ON sr.user_id = rp.user_id
        LEFT JOIN \`suitability_response\` su ON su.user_id = rp.user_id
        GROUP BY rp.participant_id, rp.study_code, rp.status, rp.school_permission, rp.guardian_consent, rp.student_assent
        ORDER BY rp.study_code`);
    return rows;
}
app.get("/api/admin/research-summary", ...admin, asyncHandler(async (req, res) => {
    const records = await loadResearchRecords();
    const summary = research.summarizePairedRecords(records);
    res.json({ ...summary, understanding: research.summarizeUnderstanding(records), eligibleParticipants: summary.authorisedParticipantCount, validPairs: summary.validPairCount, incompleteCount: summary.incompletePairCount + summary.excludedParticipantCount, averageGain: summary.gain.mean, medianGain: summary.gain.median, standardDeviation: summary.gain.sampleStandardDeviation, interquartileRange: summary.gain.interquartileRange });
}));
app.get("/api/admin/research-export.csv", ...admin, asyncHandler(async (req, res) => {
    const rows = (await loadResearchRecords()).filter(research.isAuthorised);
    const quote = (value) => {
        const cell = String(value ?? '');
        const safe = /^\s*[=+\-@]/.test(cell) ? `'${cell}` : cell;
        return `"${safe.replaceAll('"', '""')}"`;
    };
    const csv = ["study_code,pre_score,post_score,gain,paired,suitability_responses,pre_instrument_version,post_instrument_version,pre_understanding_mean_1_to_5,post_understanding_mean_1_to_5,understanding_change,understanding_paired,pre_understanding_ratings,post_understanding_ratings,survey_retake_responses", ...rows.map((row) => {
        const understanding = research.summarizeUnderstanding([row]);
        const json = (value) => typeof value === 'string' ? value : JSON.stringify(value || []);
        return [row.study_code, row.pre_score, row.post_score, row.pre_score != null && row.post_score != null ? Number(row.post_score) - Number(row.pre_score) : "", row.pre_score != null && row.post_score != null ? "yes" : "no", json(row.suitability_responses), row.pre_instrument_version || 'Legacy quiz questions', row.post_instrument_version || 'Legacy quiz questions', understanding.preMean, understanding.postMean, understanding.averageChange, understanding.validPairs ? 'yes' : 'no', json(row.pre_ratings), json(row.post_ratings), json(row.retake_responses)].map(quote).join(',');
    })].join("\n");
    res.type("text/csv").attachment("qualitycraft-anonymised-research.csv").send(csv);
}));
app.get(["/api/admin/configuration-export", "/api/admin/backup"], ...admin, asyncHandler(async (req, res) => {
    const tableQueries = {
        modules: "SELECT * FROM `module`", lessons: "SELECT * FROM `lesson`", questions: "SELECT * FROM `question`", activities: "SELECT * FROM `activity`",
        badges: "SELECT * FROM `badge`", rules: "SELECT * FROM `gamification_rule`", instruments: "SELECT * FROM `assessment_instrument`", assessmentItems: "SELECT * FROM `assessment_item`", settings: "SELECT * FROM `system_setting`"
    };
    const backup = { format: "qualitycraft-configuration-export-v1", scope: 'Content and settings only; excludes accounts and individual study records', createdAt: new Date().toISOString(), researchSummary: research.summarizePairedRecords(await loadResearchRecords()) };
    for (const [key, sql] of Object.entries(tableQueries)) { const [rows] = await db.promise().query(sql); backup[key] = rows; }
    await writeAudit(req, "export", "configuration", null, "Configuration export downloaded");
    res.type("application/json").attachment(`qualitycraft-configuration-${new Date().toISOString().slice(0, 10)}.json`).send(JSON.stringify(backup, null, 2));
}));
app.get("/api/admin/modules", ...admin, asyncHandler(async (req, res) => res.json(await content.listModules({ includeHidden: true }))));
app.post("/api/admin/modules", ...admin, asyncHandler(async (req, res) => res.status(201).json(await content.createModule({ ...req.body, status: "draft" }, actor(req)))));
app.patch("/api/admin/modules/:id", ...admin, asyncHandler(async (req, res) => {
    if (req.body.status === "published") {
        const preview = await content.previewModule(req.params.id);
        if (!preview.publishable) throw new HttpError(400, "Resolve publish warnings first", preview.warnings);
    }
    res.json(await content.updateModule(req.params.id, req.body, actor(req)));
}));
app.delete("/api/admin/modules/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.deleteModule(req.params.id, actor(req)))));
app.get("/api/admin/modules/:id/preview", ...admin, asyncHandler(async (req, res) => res.json(await content.previewModule(req.params.id))));
app.get("/api/admin/lessons", ...admin, asyncHandler(async (req, res) => res.json(await content.listLessons({ moduleId: req.query.moduleId }))));
app.post("/api/admin/lessons", ...admin, asyncHandler(async (req, res) => res.status(201).json(await content.createLesson(req.body, actor(req)))));
app.patch("/api/admin/lessons/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.updateLesson(req.params.id, req.body, actor(req)))));
app.delete("/api/admin/lessons/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.deleteLesson(req.params.id, actor(req)))));
app.get("/api/admin/questions", ...admin, asyncHandler(async (req, res) => res.json(await content.listQuestions({ lessonId: req.query.lessonId }))));
app.post("/api/admin/questions", ...admin, asyncHandler(async (req, res) => res.status(201).json(await content.createQuestion(req.body, actor(req)))));
app.patch("/api/admin/questions/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.updateQuestion(req.params.id, req.body, actor(req)))));
app.delete("/api/admin/questions/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.deleteQuestion(req.params.id, actor(req)))));
app.get("/api/admin/activities", ...admin, asyncHandler(async (req, res) => res.json(await content.listActivities({ lessonId: req.query.lessonId }))));
app.post("/api/admin/activities", ...admin, asyncHandler(async (req, res) => res.status(201).json(await content.createActivity(req.body, actor(req)))));
app.patch("/api/admin/activities/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.updateActivity(req.params.id, req.body, actor(req)))));
app.delete("/api/admin/activities/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.deleteActivity(req.params.id, actor(req)))));
app.get("/api/admin/badges", ...admin, asyncHandler(async (req, res) => res.json(await content.listBadges())));
app.post("/api/admin/badges", ...admin, asyncHandler(async (req, res) => res.status(201).json(await content.createBadge(req.body, actor(req)))));
app.patch("/api/admin/badges/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.updateBadge(req.params.id, req.body, actor(req)))));
app.get("/api/admin/rules", ...admin, asyncHandler(async (req, res) => res.json(await content.listRules())));
app.patch("/api/admin/rules/:id", ...admin, asyncHandler(async (req, res) => res.json(await content.updateRule(req.params.id, req.body, actor(req)))));

async function reportScope(req) {
    const role = await loadUserRole(req.auth.id);
    const classId = req.query.classId ? requirePositiveInt(req.query.classId, "Class id") : null;
    if (classId && role === "teacher") {
        const [owned] = await db.promise().execute("SELECT class_id FROM `class` WHERE class_id = ? AND teacher_id = ?", [classId, req.auth.id]);
        if (!owned.length) throw new HttpError(403, "This class is not yours");
    }
    return { classId, teacherId: role === "teacher" ? req.auth.id : null };
}
app.get("/api/management/classes", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const role = await loadUserRole(req.auth.id);
    const sql = "SELECT c.class_id, c.class_name AS name, teacher.name AS teacher, COUNT(cm.class_member_id) AS students FROM `class` c JOIN `user` teacher ON teacher.user_id = c.teacher_id LEFT JOIN `class_member` cm ON cm.class_id = c.class_id";
    const [rows] = role === "teacher"
        ? await db.promise().execute(`${sql} WHERE c.teacher_id = ? GROUP BY c.class_id, c.class_name, teacher.name ORDER BY c.class_name`, [req.auth.id])
        : await db.promise().query(`${sql} GROUP BY c.class_id, c.class_name, teacher.name ORDER BY c.class_name`);
    res.json(rows);
}));
app.get("/api/management/assignments", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const role = await loadUserRole(req.auth.id);
    const ownership = role === "teacher" ? "WHERE c.teacher_id = ?" : "";
    const parameters = role === "teacher" ? [req.auth.id] : [];
    const [classes] = await db.promise().execute(`SELECT c.class_id, c.class_name AS name FROM \`class\` c ${ownership} ORDER BY c.class_name`, parameters);
    const [activities] = await db.promise().query(`SELECT a.activity_id, a.title, a.activity_type, l.title AS lesson_title, m.title AS module_title FROM \`activity\` a JOIN \`lesson\` l ON l.lesson_id = a.lesson_id JOIN \`module\` m ON m.module_id = l.module_id WHERE m.status = 'published' ORDER BY m.sequence_no, l.sequence_no, a.activity_id`);
    const [assignments] = await db.promise().execute(`SELECT ca.assignment_id, ca.class_id, ca.activity_id, ca.due_at, ca.created_at, c.class_name AS class_name, a.title AS activity, l.title AS lesson_title, m.title AS module_title
        FROM \`class_assignment\` ca JOIN \`class\` c ON c.class_id = ca.class_id JOIN \`activity\` a ON a.activity_id = ca.activity_id JOIN \`lesson\` l ON l.lesson_id = a.lesson_id JOIN \`module\` m ON m.module_id = l.module_id ${ownership} ORDER BY ca.created_at DESC`, parameters);
    res.json({ classes, activities, assignments });
}));
app.post("/api/management/classes/:classId/assignments", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const classId = requirePositiveInt(req.params.classId, "Class");
    const activityId = requirePositiveInt(req.body.activityId, "Activity");
    const role = await loadUserRole(req.auth.id);
    const [owned] = await db.promise().execute(`SELECT class_id FROM \`class\` WHERE class_id = ? ${role === "teacher" ? "AND teacher_id = ?" : ""}`, role === "teacher" ? [classId, req.auth.id] : [classId]);
    if (!owned.length) throw new HttpError(404, "Class not found in your workspace");
    const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new HttpError(400, "Due date is invalid");
    const [result] = await db.promise().execute("INSERT INTO `class_assignment` (class_id, activity_id, assigned_by, due_at) VALUES (?, ?, ?, ?)", [classId, activityId, req.auth.id, dueAt]);
    res.status(201).json({ assignmentId: result.insertId, classId, activityId, dueAt });
}));
app.delete("/api/management/assignments/:assignmentId", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const id = requirePositiveInt(req.params.assignmentId, "Assignment");
    const role = await loadUserRole(req.auth.id);
    const [result] = await db.promise().execute(`DELETE ca FROM \`class_assignment\` ca JOIN \`class\` c ON c.class_id = ca.class_id WHERE ca.assignment_id = ? ${role === "teacher" ? "AND c.teacher_id = ?" : ""}`, role === "teacher" ? [id, req.auth.id] : [id]);
    if (!result.affectedRows) throw new HttpError(404, "Assignment not found in your workspace");
    res.json({ message: "Assignment removed" });
}));
app.get("/api/management/activity-submissions", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const scope = await reportScope(req);
    const conditions = scope.classId ? "AND c.class_id = ?" : "";
    const ownership = scope.teacherId ? "AND c.teacher_id = ?" : "";
    const parameters = [...(scope.classId ? [scope.classId] : []), ...(scope.teacherId ? [scope.teacherId] : [])];
    const [rows] = await db.promise().execute(`SELECT DISTINCT s.submission_id, s.user_id, u.name AS student, c.class_name AS class_name, a.title AS activity, s.content, s.status, s.feedback, s.submitted_at
        FROM \`activity_submission\` s JOIN \`user\` u ON u.user_id = s.user_id JOIN \`activity\` a ON a.activity_id = s.activity_id
        JOIN \`class_member\` cm ON cm.student_id = s.user_id JOIN \`class\` c ON c.class_id = cm.class_id
        WHERE 1=1 ${conditions} ${ownership} ORDER BY s.submitted_at DESC LIMIT 200`, parameters);
    res.json(rows);
}));
app.patch("/api/management/activity-submissions/:id/review", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const id = requirePositiveInt(req.params.id, "Submission id");
    const role = await loadUserRole(req.auth.id);
    const [rows] = await db.promise().execute(`SELECT s.submission_id FROM \`activity_submission\` s JOIN \`class_member\` cm ON cm.student_id = s.user_id JOIN \`class\` c ON c.class_id = cm.class_id
        WHERE s.submission_id = ? ${role === "teacher" ? "AND c.teacher_id = ?" : ""} LIMIT 1`, role === "teacher" ? [id, req.auth.id] : [id]);
    if (!rows.length) throw new HttpError(404, "Submission not found in your classes");
    const feedback = requireString(req.body.feedback, "Feedback", { max: 2000 });
    await db.promise().execute("UPDATE `activity_submission` SET status = 'reviewed', feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE submission_id = ?", [feedback, req.auth.id, id]);
    res.json({ message: "Feedback saved" });
}));
app.get("/api/management/analytics", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => res.json(await reporting.loadClassAnalytics(await reportScope(req)))));
app.get("/api/management/suitability-summary", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const scope = await reportScope(req);
    const clauses = [];
    const params = [];
    if (scope.classId) { clauses.push("c.class_id = ?"); params.push(scope.classId); }
    if (scope.teacherId) { clauses.push("c.teacher_id = ?"); params.push(scope.teacherId); }
    const where = clauses.length ? `AND ${clauses.join(" AND ")}` : "";
    const [rows] = await db.promise().execute(`SELECT DISTINCT sr.response_id, sr.answers FROM \`suitability_response\` sr JOIN \`class_member\` cm ON cm.student_id = sr.user_id JOIN \`class\` c ON c.class_id = cm.class_id WHERE 1=1 ${where} LIMIT 5000`, params);
    const totals = Array(6).fill(0);
    for (const row of rows) { const answers = typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers; answers.forEach((value, index) => { if (index < 6) totals[index] += Number(value) }); }
    res.json({ responses: rows.length, averages: totals.map((total) => rows.length ? Math.round(total / rows.length * 100) / 100 : null) });
}));
app.get("/api/management/reports/students", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    res.json(await reporting.loadStudentProgress({ ...await reportScope(req), limit, offset }));
}));
app.get("/api/management/reports/students.csv", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const rows = await reporting.loadStudentProgress({ ...await reportScope(req), limit: 5000 });
    res.type("text/csv").attachment("qualitycraft-student-progress.csv").send(reporting.buildCsv(rows));
}));
app.get("/api/management/reports/students.pdf", requireAuth, requireTeacherOrAdmin, asyncHandler(async (req, res) => {
    const scope = await reportScope(req);
    const [rows, analytics] = await Promise.all([reporting.loadStudentProgress({ ...scope, limit: 5000 }), reporting.loadClassAnalytics(scope)]);
    res.type("application/pdf").attachment("qualitycraft-student-progress.pdf");
    reporting.streamProgressPdf(rows, { analytics }, res);
}));

const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(path.join(frontendDist, "index.html"))) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}
app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
if (require.main === module) app.listen(PORT, () => console.log(`QualityCraft backend listening on ${PORT}`));
module.exports = app;
