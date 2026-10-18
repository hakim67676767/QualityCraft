// Administrator content lifecycle management: modules, lessons, questions,
// activities, badges and gamification rules.
//
// All validation lives here rather than in the route handlers so the REST
// endpoints and any future importer share the same rules, and so every write
// can be paired with an audit entry in one place.

const db = require("../db")
const { HttpError } = require("../lib/http")
const {
    requireString,
    optionalString,
    requireOneOf,
    requirePositiveInt,
    optionalPositiveInt,
    optionalBoolean,
    parseOptions,
    QUESTION_TYPES,
    ACTIVITY_TYPES,
    MODULE_STATUSES,
} = require("../lib/validation")
const audit = require("./auditService")

const CONTENT_STATUSES = ["draft", "published", "hidden"]

// ---------------------------------------------------------------- modules ---

async function listModules({ includeHidden = false } = {}) {
    const [rows] = await db.promise().query(
        `SELECT m.module_id, m.title, m.description, m.status, m.sequence_no, m.published_at, m.updated_at,
                COUNT(l.lesson_id) AS lesson_count
         FROM \`module\` m
         LEFT JOIN \`lesson\` l ON l.module_id = m.module_id
         ${includeHidden ? "" : "WHERE m.status <> 'hidden'"}
         GROUP BY m.module_id
         ORDER BY m.sequence_no, m.module_id`
    )
    return rows
}

function modulePayload(body, { partial = false } = {}) {
    const payload = {}
    if (!partial || body.title !== undefined) payload.title = requireString(body.title, "Module title", { max: 160 })
    if (body.description !== undefined) payload.description = optionalString(body.description, 1000)
    if (body.status !== undefined) payload.status = requireOneOf(body.status, MODULE_STATUSES, "Module status")
    if (body.sequenceNo !== undefined) payload.sequence_no = optionalPositiveInt(body.sequenceNo, 0)
    return payload
}

async function createModule(body, actor) {
    const payload = modulePayload(body)
    const [result] = await db.promise().execute(
        `INSERT INTO \`module\` (title, description, status, sequence_no, published_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
            payload.title,
            payload.description ?? null,
            payload.status || "draft",
            payload.sequence_no ?? 0,
            payload.status === "published" ? new Date() : null,
        ]
    )
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "module.create",
        entityType: "module",
        entityId: result.insertId,
        summary: `Created module "${payload.title}"`,
        details: { status: payload.status || "draft" },
    })
    return findModule(result.insertId)
}

async function updateModule(moduleId, body, actor) {
    const id = requirePositiveInt(moduleId, "Module id")
    const existing = await findModule(id)
    const payload = modulePayload(body, { partial: true })
    if (!Object.keys(payload).length) throw new HttpError(400, "No module fields to update")

    // Publishing stamps published_at the first time; re-publishing keeps the
    // original date so reporting does not silently rewrite history.
    const sets = []
    const parameters = []
    for (const [column, value] of Object.entries(payload)) {
        sets.push(`\`${column}\` = ?`)
        parameters.push(value)
    }
    if (payload.status === "published" && !existing.published_at) {
        sets.push("published_at = ?")
        parameters.push(new Date())
    }
    parameters.push(id)

    await db.promise().execute(`UPDATE \`module\` SET ${sets.join(", ")} WHERE module_id = ?`, parameters)

    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "module.update",
        entityType: "module",
        entityId: id,
        summary: `Updated module "${existing.title}"`,
        details: payload,
    })
    return findModule(id)
}

async function findModule(moduleId) {
    const [rows] = await db.promise().execute(
        "SELECT module_id, title, description, status, sequence_no, published_at, updated_at FROM `module` WHERE module_id = ?",
        [moduleId]
    )
    if (!rows.length) throw new HttpError(404, "That module does not exist")
    return rows[0]
}

async function deleteModule(moduleId, actor) {
    const id = requirePositiveInt(moduleId, "Module id")
    const existing = await findModule(id)

    const [progressRows] = await db.promise().execute("SELECT COUNT(*) AS total FROM progress WHERE module_id = ?", [id])
    if (Number(progressRows[0].total) > 0) {
        throw new HttpError(409, "Students have progress recorded for this module. Hide it instead of deleting it.")
    }

    // Lessons cascade to questions and activities through the foreign keys.
    await db.promise().execute("DELETE FROM `module` WHERE module_id = ?", [id])
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "module.delete",
        entityType: "module",
        entityId: id,
        summary: `Deleted module "${existing.title}"`,
    })
    return { deleted: true, moduleId: id }
}

// ---------------------------------------------------------------- lessons ---

async function listLessons({ moduleId = null } = {}) {
    const parameters = []
    let where = ""
    if (moduleId) {
        where = "WHERE l.module_id = ?"
        parameters.push(requirePositiveInt(moduleId, "Module id"))
    }
    const [rows] = await db.promise().execute(
        `SELECT l.lesson_id, l.module_id, l.title, l.content, l.sequence_no, l.updated_at,
                m.title AS module_title,
                (SELECT COUNT(*) FROM \`question\` q WHERE q.lesson_id = l.lesson_id) AS question_count,
                (SELECT COUNT(*) FROM \`activity\` a WHERE a.lesson_id = l.lesson_id) AS activity_count
         FROM \`lesson\` l
         JOIN \`module\` m ON m.module_id = l.module_id
         ${where}
         ORDER BY l.module_id, l.sequence_no, l.lesson_id`,
        parameters
    )
    return rows
}

async function createLesson(body, actor) {
    const moduleId = requirePositiveInt(body.moduleId, "Module id")
    await findModule(moduleId)
    const title = requireString(body.title, "Lesson title", { max: 160 })
    const content = requireString(body.content, "Lesson content", { max: 20000 })
    const sequenceNo = optionalPositiveInt(body.sequenceNo, 0)

    const [result] = await db.promise().execute(
        "INSERT INTO `lesson` (module_id, title, content, sequence_no) VALUES (?, ?, ?, ?)",
        [moduleId, title, content, sequenceNo]
    )
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "lesson.create",
        entityType: "lesson",
        entityId: result.insertId,
        summary: `Created lesson "${title}"`,
        details: { moduleId },
    })
    return findLesson(result.insertId)
}

async function updateLesson(lessonId, body, actor) {
    const id = requirePositiveInt(lessonId, "Lesson id")
    const existing = await findLesson(id)

    const sets = []
    const parameters = []
    if (body.moduleId !== undefined) {
        const moduleId = requirePositiveInt(body.moduleId, "Module id")
        await findModule(moduleId)
        sets.push("module_id = ?")
        parameters.push(moduleId)
    }
    if (body.title !== undefined) {
        sets.push("title = ?")
        parameters.push(requireString(body.title, "Lesson title", { max: 160 }))
    }
    if (body.content !== undefined) {
        sets.push("content = ?")
        parameters.push(optionalString(body.content, 20000))
    }
    if (body.sequenceNo !== undefined) {
        sets.push("sequence_no = ?")
        parameters.push(optionalPositiveInt(body.sequenceNo, 0))
    }
    if (!sets.length) throw new HttpError(400, "No lesson fields to update")

    parameters.push(id)
    await db.promise().execute(`UPDATE \`lesson\` SET ${sets.join(", ")} WHERE lesson_id = ?`, parameters)
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "lesson.update",
        entityType: "lesson",
        entityId: id,
        summary: `Updated lesson "${existing.title}"`,
    })
    return findLesson(id)
}

async function findLesson(lessonId) {
    const [rows] = await db.promise().execute(
        "SELECT lesson_id, module_id, title, content, sequence_no, updated_at FROM `lesson` WHERE lesson_id = ?",
        [lessonId]
    )
    if (!rows.length) throw new HttpError(404, "That lesson does not exist")
    return rows[0]
}

async function deleteLesson(lessonId, actor) {
    const id = requirePositiveInt(lessonId, "Lesson id")
    const existing = await findLesson(id)

    const [attemptRows] = await db.promise().execute("SELECT COUNT(*) AS total FROM `quiz_attempt` WHERE lesson_id = ?", [id])
    if (Number(attemptRows[0].total) > 0) {
        throw new HttpError(409, "Students have already attempted this quiz. Archive the lesson instead of deleting it.")
    }
    if (!existing) throw new HttpError(404, "That lesson does not exist")

    await db.promise().execute("DELETE FROM `lesson` WHERE lesson_id = ?", [id])
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "lesson.delete",
        entityType: "lesson",
        entityId: id,
        summary: `Deleted lesson "${existing.title}"`,
    })
    return { deleted: true, lessonId: id }
}

// -------------------------------------------------------------- questions ---

async function listQuestions({ lessonId = null } = {}) {
    const parameters = []
    let where = ""
    if (lessonId) {
        where = "WHERE q.lesson_id = ?"
        parameters.push(requirePositiveInt(lessonId, "Lesson id"))
    }
    const [rows] = await db.promise().execute(
        `SELECT q.question_id, q.lesson_id, q.type, q.question_text, q.options, q.answer_key,
                q.explanation, q.points, q.updated_at,
                l.title AS lesson_title, l.module_id, m.title AS module_title
         FROM \`question\` q
         JOIN \`lesson\` l ON l.lesson_id = q.lesson_id
         JOIN \`module\` m ON m.module_id = l.module_id
         ${where}
         ORDER BY q.lesson_id, q.question_id`,
        parameters
    )
    return rows.map((row) => ({ ...row, options: parseOptionsSafe(row.options) }))
}

function parseOptionsSafe(value) {
    if (!value) return []
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// A choice question is only valid if its answer key is one of its options,
// otherwise the quiz becomes unanswerable and every student scores zero.
function validateQuestionConsistency({ type, options, answerKey }) {
    if (["multiple_choice", "true_false"].includes(type)) {
        if (type === "true_false") {
            if (!["true", "false"].includes(String(answerKey).trim().toLowerCase())) {
                throw new HttpError(400, "A true/false question must have an answer key of 'true' or 'false'")
            }
            return JSON.stringify(["True", "False"])
        }
        const parsed = parseOptions(options)
        const list = parseOptionsSafe(parsed)
        const match = list.some((option) => option.toLowerCase() === String(answerKey).trim().toLowerCase())
        if (!match) throw new HttpError(400, "The answer key must match one of the question options")
        return parsed
    }
    if (!String(answerKey).trim()) throw new HttpError(400, "A short-answer question needs an expected answer")
    return null
}

async function createQuestion(body, actor) {
    const lessonId = requirePositiveInt(body.lessonId, "Lesson id")
    await findLesson(lessonId)

    const type = requireOneOf(body.type, QUESTION_TYPES, "Question type")
    const questionText = requireString(body.questionText, "Question text", { max: 2000 })
    const answerKey = requireString(body.answerKey, "Answer key", { max: 500 })
    const explanation = optionalString(body.explanation, 2000)
    const points = body.points === undefined ? 1 : requirePositiveInt(body.points, "Points")
    const options = validateQuestionConsistency({ type, options: body.options, answerKey })

    const [result] = await db.promise().execute(
        `INSERT INTO \`question\` (lesson_id, type, question_text, options, answer_key, explanation, points)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [lessonId, type, questionText, options, answerKey, explanation, points]
    )
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "question.create",
        entityType: "question",
        entityId: result.insertId,
        summary: `Created ${type} question for lesson ${lessonId}`,
    })
    return findQuestion(result.insertId)
}

async function updateQuestion(questionId, body, actor) {
    const id = requirePositiveInt(questionId, "Question id")
    const existing = await findQuestion(id)

    const type = body.type === undefined ? existing.type : requireOneOf(body.type, QUESTION_TYPES, "Question type")
    const answerKey = body.answerKey === undefined ? existing.answer_key : requireString(body.answerKey, "Answer key", { max: 500 })
    // Re-validate the option/key pairing whenever either side changes.
    let options = existing.options
    if (body.options !== undefined || body.type !== undefined || body.answerKey !== undefined) {
        options = validateQuestionConsistency({ type, options: body.options ?? existing.options, answerKey })
    }

    const sets = ["type = ?", "answer_key = ?", "options = ?"]
    const parameters = [type, answerKey, options]
    if (body.lessonId !== undefined) {
        const lessonId = requirePositiveInt(body.lessonId, "Lesson id")
        await findLesson(lessonId)
        sets.push("lesson_id = ?")
        parameters.push(lessonId)
    }
    if (body.questionText !== undefined) {
        sets.push("question_text = ?")
        parameters.push(requireString(body.questionText, "Question text", { max: 2000 }))
    }
    if (body.explanation !== undefined) {
        sets.push("explanation = ?")
        parameters.push(optionalString(body.explanation, 2000))
    }
    if (body.points !== undefined) {
        sets.push("points = ?")
        parameters.push(requirePositiveInt(body.points, "Points"))
    }

    parameters.push(id)
    await db.promise().execute(`UPDATE \`question\` SET ${sets.join(", ")} WHERE question_id = ?`, parameters)
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "question.update",
        entityType: "question",
        entityId: id,
        summary: `Updated question ${id}`,
    })
    return findQuestion(id)
}

async function findQuestion(questionId) {
    const [rows] = await db.promise().execute(
        "SELECT question_id, lesson_id, type, question_text, options, answer_key, explanation, points FROM `question` WHERE question_id = ?",
        [questionId]
    )
    if (!rows.length) throw new HttpError(404, "That question does not exist")
    const row = rows[0]
    return { ...row, options: parseOptionsSafe(row.options) }
}

async function deleteQuestion(questionId, actor) {
    const id = requirePositiveInt(questionId, "Question id")
    await findQuestion(id)
    await db.promise().execute("DELETE FROM `question` WHERE question_id = ?", [id])
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "question.delete",
        entityType: "question",
        entityId: id,
        summary: `Deleted question ${id}`,
    })
    return { deleted: true, questionId: id }
}

// ------------------------------------------------------------- activities ---

async function listActivities({ lessonId = null } = {}) {
    const parameters = []
    let where = ""
    if (lessonId) {
        where = "WHERE a.lesson_id = ?"
        parameters.push(requirePositiveInt(lessonId, "Lesson id"))
    }
    const [rows] = await db.promise().execute(
        `SELECT a.activity_id, a.lesson_id, a.title, a.activity_type, a.instructions, a.is_required, a.updated_at,
                l.title AS lesson_title, l.module_id,
                (SELECT COUNT(*) FROM \`activity_submission\` s WHERE s.activity_id = a.activity_id) AS submission_count
         FROM \`activity\` a
         JOIN \`lesson\` l ON l.lesson_id = a.lesson_id
         ${where}
         ORDER BY a.lesson_id, a.activity_id`,
        parameters
    )
    return rows
}

async function createActivity(body, actor) {
    const lessonId = requirePositiveInt(body.lessonId, "Lesson id")
    await findLesson(lessonId)
    const title = requireString(body.title, "Activity title", { max: 160 })
    const activityType = requireOneOf(body.activityType, ACTIVITY_TYPES, "Activity type")
    const instructions = requireString(body.instructions, "Activity instructions", { max: 5000 })
    const isRequired = optionalBoolean(body.isRequired, true)

    const [result] = await db.promise().execute(
        "INSERT INTO `activity` (lesson_id, title, activity_type, instructions, is_required) VALUES (?, ?, ?, ?, ?)",
        [lessonId, title, activityType, instructions, isRequired]
    )
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "activity.create",
        entityType: "activity",
        entityId: result.insertId,
        summary: `Created ${activityType} activity "${title}"`,
    })
    return findActivity(result.insertId)
}

async function updateActivity(activityId, body, actor) {
    const id = requirePositiveInt(activityId, "Activity id")
    const existing = await findActivity(id)

    const sets = []
    const parameters = []
    if (body.lessonId !== undefined) {
        const lessonId = requirePositiveInt(body.lessonId, "Lesson id")
        await findLesson(lessonId)
        sets.push("lesson_id = ?")
        parameters.push(lessonId)
    }
    if (body.title !== undefined) {
        sets.push("title = ?")
        parameters.push(requireString(body.title, "Activity title", { max: 160 }))
    }
    if (body.activityType !== undefined) {
        sets.push("activity_type = ?")
        parameters.push(requireOneOf(body.activityType, ACTIVITY_TYPES, "Activity type"))
    }
    if (body.instructions !== undefined) {
        sets.push("instructions = ?")
        parameters.push(requireString(body.instructions, "Activity instructions", { max: 5000 }))
    }
    if (body.isRequired !== undefined) {
        sets.push("is_required = ?")
        parameters.push(optionalBoolean(body.isRequired, true))
    }
    if (!sets.length) throw new HttpError(400, "No activity fields to update")

    parameters.push(id)
    await db.promise().execute(`UPDATE \`activity\` SET ${sets.join(", ")} WHERE activity_id = ?`, parameters)
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "activity.update",
        entityType: "activity",
        entityId: id,
        summary: `Updated activity "${existing.title}"`,
    })
    return findActivity(id)
}

async function findActivity(activityId) {
    const [rows] = await db.promise().execute(
        "SELECT activity_id, lesson_id, title, activity_type, instructions, is_required FROM `activity` WHERE activity_id = ?",
        [activityId]
    )
    if (!rows.length) throw new HttpError(404, "That activity does not exist")
    return rows[0]
}

async function deleteActivity(activityId, actor) {
    const id = requirePositiveInt(activityId, "Activity id")
    const existing = await findActivity(id)
    const [submissionRows] = await db.promise().execute("SELECT COUNT(*) AS total FROM `activity_submission` WHERE activity_id = ?", [id])
    if (Number(submissionRows[0].total) > 0) {
        throw new HttpError(409, "Students have submitted this activity. Mark it optional instead of deleting it.")
    }

    await db.promise().execute("DELETE FROM `activity` WHERE activity_id = ?", [id])
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "activity.delete",
        entityType: "activity",
        entityId: id,
        summary: `Deleted activity "${existing.title}"`,
    })
    return { deleted: true, activityId: id }
}

// ------------------------------------------------- gamification and badges ---

async function listRules() {
    return db.promise().query(
        "SELECT rule_id, code, name, event_type, xp_amount, is_active, description, updated_at FROM `gamification_rule` ORDER BY rule_id"
    ).then(([rows]) => rows)
}

async function updateRule(ruleId, body, actor) {
    const id = requirePositiveInt(ruleId, "Rule id")
    const [rows] = await db.promise().execute("SELECT rule_id, code, name, xp_amount FROM `gamification_rule` WHERE rule_id = ?", [id])
    if (!rows.length) throw new HttpError(404, "That gamification rule does not exist")

    const sets = []
    const parameters = []
    if (body.name !== undefined) {
        sets.push("name = ?")
        parameters.push(requireString(body.name, "Rule name", { max: 120 }))
    }
    if (body.xpAmount !== undefined) {
        sets.push("xp_amount = ?")
        parameters.push(optionalPositiveInt(body.xpAmount, 0))
    }
    if (body.isActive !== undefined) {
        sets.push("is_active = ?")
        parameters.push(optionalBoolean(body.isActive, true))
    }
    if (body.description !== undefined) {
        sets.push("description = ?")
        parameters.push(optionalString(body.description, 255))
    }
    if (!sets.length) throw new HttpError(400, "No rule fields to update")

    parameters.push(id)
    await db.promise().execute(`UPDATE \`gamification_rule\` SET ${sets.join(", ")} WHERE rule_id = ?`, parameters)
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "gamification_rule.update",
        entityType: "gamification_rule",
        entityId: id,
        summary: `Updated rule "${rows[0].name}"`,
        details: body,
    })
    const [updated] = await db.promise().execute("SELECT * FROM `gamification_rule` WHERE rule_id = ?", [id])
    return updated[0]
}

const BADGE_CRITERIA_TYPES = [
    "class_join",
    "quiz_attempt_count",
    "perfect_quiz",
    "activity_count",
    "module_count",
    "module_count_all",
    "post_test_count",
    "xp_threshold",
]

async function listBadges({ includeInactive = true } = {}) {
    const [rows] = await db.promise().query(
        `SELECT badge_id, name, code, description, criteria, icon, criteria_type, criteria_threshold, is_active, sort_order, updated_at
         FROM \`badge\`
         ${includeInactive ? "" : "WHERE is_active = TRUE"}
         ORDER BY sort_order, badge_id`
    )
    return rows
}

async function createBadge(body, actor) {
    const name = requireString(body.name, "Badge name", { max: 120 })
    const criteriaType = requireOneOf(body.criteriaType, BADGE_CRITERIA_TYPES, "Badge criteria type")
    const threshold = requirePositiveInt(body.threshold, "Badge threshold")
    const code = optionalString(body.code, 60) || slugify(name)
    const description = optionalString(body.description, 255)
    const criteria = optionalString(body.criteria, 255) || `Reach ${threshold} for ${criteriaType}.`
    const icon = optionalString(body.icon, 40)
    const sortOrder = optionalPositiveInt(body.sortOrder, 0)

    const [result] = await db.promise().execute(
        `INSERT INTO \`badge\` (name, code, criteria, description, icon, criteria_type, criteria_threshold, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, code, criteria, description, icon, criteriaType, threshold, true, sortOrder]
    )
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "badge.create",
        entityType: "badge",
        entityId: result.insertId,
        summary: `Created badge "${name}"`,
    })
    return findBadge(result.insertId)
}

async function updateBadge(badgeId, body, actor) {
    const id = requirePositiveInt(badgeId, "Badge id")
    await findBadge(id)

    const sets = []
    const parameters = []
    if (body.name !== undefined) {
        sets.push("name = ?")
        parameters.push(requireString(body.name, "Badge name", { max: 120 }))
    }
    if (body.criteriaType !== undefined) {
        sets.push("criteria_type = ?")
        parameters.push(requireOneOf(body.criteriaType, BADGE_CRITERIA_TYPES, "Badge criteria type"))
    }
    if (body.threshold !== undefined) {
        sets.push("criteria_threshold = ?")
        parameters.push(requirePositiveInt(body.threshold, "Badge threshold"))
    }
    if (body.description !== undefined) {
        sets.push("description = ?")
        parameters.push(optionalString(body.description, 255))
    }
    if (body.criteria !== undefined) {
        sets.push("criteria = ?")
        parameters.push(optionalString(body.criteria, 255))
    }
    if (body.isActive !== undefined) {
        sets.push("is_active = ?")
        parameters.push(optionalBoolean(body.isActive, true))
    }
    if (body.sortOrder !== undefined) {
        sets.push("sort_order = ?")
        parameters.push(optionalPositiveInt(body.sortOrder, 0))
    }
    if (!sets.length) throw new HttpError(400, "No badge fields to update")

    parameters.push(id)
    await db.promise().execute(`UPDATE \`badge\` SET ${sets.join(", ")} WHERE badge_id = ?`, parameters)
    await audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: "badge.update",
        entityType: "badge",
        entityId: id,
        summary: `Updated badge ${id}`,
        details: body,
    })
    return findBadge(id)
}

async function findBadge(badgeId) {
    const [rows] = await db.promise().execute("SELECT * FROM `badge` WHERE badge_id = ?", [badgeId])
    if (!rows.length) throw new HttpError(404, "That badge does not exist")
    return rows[0]
}

function slugify(value) {
    return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60)
}

// ---------------------------------------------------------------- preview ---

// The PRD asks for preview-before-publish. A preview returns the content as a
// student would receive it, including hidden modules, plus the validation
// problems that would stop it going live.
async function previewModule(moduleId) {
    const id = requirePositiveInt(moduleId, "Module id")
    const module = await findModule(id)
    const lessons = await listLessons({ moduleId: id })

    const warnings = []
    if (lessons.length === 0) {
        warnings.push("This module has no lessons yet, so students have nothing to study.")
    }
    for (const lesson of lessons) {
        if (Number(lesson.question_count) === 0) {
            warnings.push(`Lesson "${lesson.title}" has no quiz questions.`)
        }
    }

    const [activities] = await db.promise().execute(
        "SELECT activity_id, lesson_id, title, activity_type, is_required FROM `activity` WHERE lesson_id IN (SELECT lesson_id FROM `lesson` WHERE module_id = ?)",
        [id]
    )

    return {
        module,
        lessons: lessons.map((lesson) => ({ ...lesson, questions: [], activities: activities.filter((activity) => activity.lesson_id === lesson.lesson_id) })),
        questions: await listQuestionsInModule(id),
        warnings,
        publishable: warnings.length === 0,
    }
}

async function listQuestionsInModule(moduleId) {
    const [rows] = await db.promise().execute(
        `SELECT q.question_id, q.lesson_id, q.type, q.question_text, q.options, q.answer_key, q.explanation
         FROM \`question\` q
         JOIN \`lesson\` l ON l.lesson_id = q.lesson_id
         WHERE l.module_id = ?
         ORDER BY l.sequence_no, q.question_id`,
        [moduleId]
    )
    return rows.map((row) => ({ ...row, options: parseOptionsSafe(row.options) }))
}

module.exports = {
    CONTENT_STATUSES,
    BADGE_CRITERIA_TYPES,
    listModules,
    createModule,
    updateModule,
    deleteModule,
    findModule,
    listLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    listQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    listActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    listRules,
    updateRule,
    listBadges,
    createBadge,
    updateBadge,
    previewModule,
}
