// A quiz score of at least 50% completes a lesson. Reading and practical work are optional.
const db = require("../db")
const { policy, scoreLesson } = require('../lib/learningPolicy')
const LESSON_WEIGHT = policy.lessonWeight
const ACTIVITY_WEIGHT = 0
const QUIZ_WEIGHT = policy.quizWeight
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

    const allComplete = lessonStates.length > 0 && lessonStates.every((lesson) => lesson.quizPassed)
    const percentComplete = allComplete ? 100 : lessonStates.length
        ? Math.min(99.99, Math.round((lessonStates.reduce((total, lesson) => total + lesson.percent, 0) / lessonStates.length) * 100) / 100)
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
