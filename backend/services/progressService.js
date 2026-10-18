// Computes a student's progress through a module from the underlying evidence:
// a completed lesson, practical activity submissions, and the best quiz score.
//
// A lesson is worth 100 points:
//   20 points for completing the lesson
//   30 points for submitting its required practical activity (free if none required)
//   50 points for its best quiz score, scaled from the 0-100 quiz result
// A module is complete when every lesson reaches 100 points.

const db = require("../db")

const LESSON_WEIGHT = 20
const ACTIVITY_WEIGHT = 30
const QUIZ_WEIGHT = 50
const COMPLETE_THRESHOLD = 100

async function loadLessonEvidence(userId, lessonId) {
    const pool = db.promise()

    const [completionRows] = await pool.execute(
        "SELECT completion_id FROM `lesson_completion` WHERE user_id = ? AND lesson_id = ? LIMIT 1",
        [userId, lessonId]
    )

    const [activityRows] = await pool.execute(
        `SELECT a.activity_id, a.is_required, s.submission_id
         FROM \`activity\` a
         LEFT JOIN \`activity_submission\` s ON s.activity_id = a.activity_id AND s.user_id = ?
         WHERE a.lesson_id = ?`,
        [userId, lessonId]
    )

    const [quizRows] = await pool.execute(
        "SELECT MAX(score) AS best_score FROM `quiz_attempt` WHERE user_id = ? AND lesson_id = ?",
        [userId, lessonId]
    )

    return { lessonCompleted: completionRows.length > 0, activityRows, bestQuizScore: Number(quizRows[0]?.best_score || 0) }
}

function scoreLesson(lessonCompleted, activityRows, bestQuizScore) {
    const requiredActivities = activityRows.filter((row) => row.is_required)
    const allRequiredSubmitted = requiredActivities.length === 0
        ? true
        : requiredActivities.every((row) => row.submission_id !== null)

    const activityPoints = allRequiredSubmitted ? ACTIVITY_WEIGHT : 0
    const quizPoints = (QUIZ_WEIGHT * Math.min(100, Math.max(0, bestQuizScore))) / 100
    const lessonPoints = lessonCompleted ? LESSON_WEIGHT : 0

    return {
        lessonCompleted,
        activitySubmitted: allRequiredSubmitted,
        bestQuizScore,
        percent: Math.round((lessonPoints + activityPoints + quizPoints) * 100) / 100,
    }
}

function statusFor(percentComplete) {
    if (percentComplete >= COMPLETE_THRESHOLD) return "complete"
    if (percentComplete > 0) return "in_progress"
    return "not_started"
}

async function findModuleIdForLesson(lessonId) {
    const [rows] = await db.promise().execute("SELECT module_id FROM `lesson` WHERE lesson_id = ?", [lessonId])
    return rows[0]?.module_id || null
}

// Recomputes and persists the progress row for one student/module pair.
// Returns the freshly calculated state plus whether this call completed the module.
async function recalculateModuleProgress(userId, moduleId) {
    const pool = db.promise()

    const [lessonRows] = await pool.execute(
        "SELECT lesson_id FROM `lesson` WHERE module_id = ? ORDER BY sequence_no, lesson_id",
        [moduleId]
    )

    const [previousRows] = await pool.execute(
        "SELECT status FROM progress WHERE user_id = ? AND module_id = ?",
        [userId, moduleId]
    )
    const previousStatus = previousRows[0]?.status || "not_started"

    const lessonStates = []
    for (const lesson of lessonRows) {
        const { lessonCompleted, activityRows, bestQuizScore } = await loadLessonEvidence(userId, lesson.lesson_id)
        lessonStates.push({ lessonId: lesson.lesson_id, ...scoreLesson(lessonCompleted, activityRows, bestQuizScore) })
    }

    const percentComplete = lessonStates.length
        ? Math.round((lessonStates.reduce((total, lesson) => total + lesson.percent, 0) / lessonStates.length) * 100) / 100
        : 0

    const status = statusFor(percentComplete)
    const completedAt = status === "complete" ? new Date() : null

    await pool.execute(
        `INSERT INTO progress (user_id, module_id, status, percent_complete, completed_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            percent_complete = VALUES(percent_complete),
            completed_at = IF(VALUES(status) = 'complete', COALESCE(progress.completed_at, VALUES(completed_at)), NULL)`,
        [userId, moduleId, status, percentComplete, completedAt]
    )

    return {
        moduleId,
        status,
        percentComplete,
        becameComplete: status === "complete" && previousStatus !== "complete",
        lessons: lessonStates,
    }
}

module.exports = { recalculateModuleProgress, findModuleIdForLesson, LESSON_WEIGHT, ACTIVITY_WEIGHT, QUIZ_WEIGHT }
