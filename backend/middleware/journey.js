// Student journey guards.
//
// The PRD requires the sequence to be enforced server-side, not just hidden in
// the UI: a student must belong to a class, then finish the pre-test, then work
// through modules in order, before the post-test. Contacting the API directly
// must not skip a stage, so these middleware run before the handlers that touch
// learning content.

const db = require("../db")
const { HttpError } = require("../lib/http")
const { asyncHandler } = require("../lib/http")

// Class-first: the student must be a member of at least one class.
const requireClassMembership = asyncHandler(async (req, res, next) => {
    const [rows] = await db.promise().execute(
        "SELECT class_member_id FROM `class_member` WHERE student_id = ? LIMIT 1",
        [req.auth.id]
    )
    if (!rows.length) throw new HttpError(403, "Join a class before accessing learning content")
    return next()
})

// Pre-test gate: a recorded 'pre' survey response is the proof of completion.
const requirePreTest = asyncHandler(async (req, res, next) => {
    const [rows] = await db.promise().execute(
        "SELECT response_id FROM `survey_response` WHERE user_id = ? AND phase = 'pre' LIMIT 1",
        [req.auth.id]
    )
    if (!rows.length) throw new HttpError(403, "Complete the pre-test before accessing modules")
    return next()
})

// Module catalogue helpers reused by the ordering rules below.
async function loadPublishedModuleIds() {
    const [rows] = await db.promise().query(
        "SELECT module_id FROM `module` WHERE status = 'published' ORDER BY sequence_no, module_id"
    )
    return rows.map((row) => Number(row.module_id))
}

async function loadCompletedModuleIds(userId) {
    const [rows] = await db.promise().execute(
        "SELECT module_id FROM progress WHERE user_id = ? AND status = 'complete'",
        [userId]
    )
    return new Set(rows.map((row) => Number(row.module_id)))
}

// Returns the module ids that are currently unlocked for this student.
// A module unlocks when every module before it in the published sequence is complete.
async function unlockedModuleIds(userId) {
    const ordered = await loadPublishedModuleIds()
    const completed = await loadCompletedModuleIds(userId)
    const unlocked = new Set()
    for (const moduleId of ordered) {
        unlocked.add(moduleId)
        if (!completed.has(moduleId)) break
    }
    return { unlocked, ordered, completed }
}

// Post-test gate: every published module must be complete.
const requireCompletedModules = asyncHandler(async (req, res, next) => {
    const { ordered, completed } = await unlockedModuleIds(req.auth.id)
    if (!ordered.length) throw new HttpError(403, "There are no published modules to complete yet")
    if (!ordered.every((moduleId) => completed.has(moduleId))) {
        throw new HttpError(403, "Complete every learning module before taking the post-test")
    }
    return next()
})

// Enforces in-order module access by resolving the lesson a request targets and
// checking its module is unlocked.
const requireUnlockedLesson = asyncHandler(async (req, res, next) => {
    const lessonId = Number(req.body?.lessonId ?? req.params?.lessonId)
    if (!Number.isInteger(lessonId) || lessonId <= 0) throw new HttpError(400, "A valid lesson is required")

    const [rows] = await db.promise().execute(
        "SELECT l.lesson_id, l.module_id FROM `lesson` l JOIN `module` m ON m.module_id = l.module_id WHERE l.lesson_id = ? AND m.status = 'published'",
        [lessonId]
    )
    if (!rows.length) throw new HttpError(404, "Published lesson not found")

    const moduleId = Number(rows[0].module_id)
    const { unlocked } = await unlockedModuleIds(req.auth.id)
    if (!unlocked.has(moduleId)) {
        throw new HttpError(403, "That module is not unlocked yet. Finish the earlier modules first.")
    }

    req.lesson = { lessonId, moduleId }
    return next()
})

module.exports = {
    requireClassMembership,
    requirePreTest,
    requireCompletedModules,
    requireUnlockedLesson,
    unlockedModuleIds,
    loadPublishedModuleIds,
}
