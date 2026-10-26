// Teacher-facing classroom reporting.
//
// The monitoring table previously selected a fixed set of aggregates inline in
// server.js and the route had to re-run the whole query a second time for the
// PDF export, which doubled the load per download. One query, one projection,
// and the CSV/PDF writers consume the same rows.

const db = require("../db")

// Aggregate columns shared by the table query and the exports. Everything is a
// correlated subquery rather than a JOIN + GROUP BY so that a student with many
// quiz attempts cannot inflate the submission counts.
const PROGRESS_COLUMNS = `
    u.user_id,
    u.name,
    u.email,
    u.xp_points,
    (SELECT GROUP_CONCAT(c.class_name ORDER BY c.class_name SEPARATOR ', ')
        FROM \`class_member\` cm JOIN \`class\` c ON c.class_id = cm.class_id
        WHERE cm.student_id = u.user_id) AS classes,
    (SELECT COUNT(*) FROM progress p JOIN \`module\` m ON m.module_id = p.module_id AND m.status = 'published' WHERE p.user_id = u.user_id AND p.status = 'complete') AS completed_modules,
    (SELECT COUNT(*) FROM \`module\` WHERE status = 'published') AS total_modules,
    (SELECT ROUND(AVG(best.score), 2) FROM
        (SELECT qa.user_id, qa.lesson_id, MAX(qa.score) AS score FROM \`quiz_attempt\` qa JOIN \`lesson\` l ON l.lesson_id = qa.lesson_id JOIN \`module\` m ON m.module_id = l.module_id AND m.status = 'published' GROUP BY qa.user_id, qa.lesson_id) best
        WHERE best.user_id = u.user_id) AS quiz_average,
    (SELECT COUNT(*) FROM \`quiz_attempt\` qa WHERE qa.user_id = u.user_id) AS quiz_attempts,
    (SELECT MAX(qa.score) FROM \`quiz_attempt\` qa WHERE qa.user_id = u.user_id) AS best_quiz_score,
    (SELECT COUNT(*) FROM \`activity_submission\` s WHERE s.user_id = u.user_id) AS activity_submissions,
    (SELECT COUNT(*) FROM \`activity\` a
        JOIN \`lesson\` l ON l.lesson_id = a.lesson_id
        JOIN \`module\` m ON m.module_id = l.module_id AND m.status = 'published'
        WHERE a.is_required = TRUE
          AND NOT EXISTS (SELECT 1 FROM \`activity_submission\` s WHERE s.activity_id = a.activity_id AND s.user_id = u.user_id)) AS activities_outstanding,
    (SELECT COUNT(*) FROM \`activity_submission\` s WHERE s.user_id = u.user_id AND s.status = 'reviewed') AS activities_reviewed,
    (SELECT sr.score FROM \`survey_response\` sr WHERE sr.user_id = u.user_id AND sr.phase = 'pre' ORDER BY sr.submitted_at DESC, sr.response_id DESC LIMIT 1) AS pre_score,
    (SELECT sr.score FROM \`survey_response\` sr WHERE sr.user_id = u.user_id AND sr.phase = 'post' ORDER BY sr.submitted_at DESC, sr.response_id DESC LIMIT 1) AS post_score,
    (SELECT sr.rating_mean FROM \`survey_response\` sr WHERE sr.user_id = u.user_id AND sr.phase = 'pre' ORDER BY sr.submitted_at DESC, sr.response_id DESC LIMIT 1) AS pre_rating_mean,
    (SELECT sr.rating_mean FROM \`survey_response\` sr WHERE sr.user_id = u.user_id AND sr.phase = 'post' ORDER BY sr.submitted_at DESC, sr.response_id DESC LIMIT 1) AS post_rating_mean,
    (SELECT sr.submitted_at FROM \`survey_response\` sr WHERE sr.user_id = u.user_id AND sr.phase = 'post' ORDER BY sr.submitted_at DESC, sr.response_id DESC LIMIT 1) AS post_submitted_at,
    (SELECT COUNT(*) FROM \`user_badge\` ub WHERE ub.user_id = u.user_id) AS badge_count`

// Optional classroom scoping. Teachers should only report on their own students
// when they are not an administrator, which is why teacherId is threaded in.
function buildFilters({ classId = null, teacherId = null } = {}) {
    const filters = ["r.role_name = 'student'"]
    const parameters = []
    if (classId) {
        filters.push("u.user_id IN (SELECT student_id FROM `class_member` WHERE class_id = ?)")
        parameters.push(Number(classId))
    }
    if (teacherId) {
        filters.push("u.user_id IN (SELECT cm.student_id FROM `class_member` cm JOIN `class` c ON c.class_id = cm.class_id WHERE c.teacher_id = ?)")
        parameters.push(Number(teacherId))
    }
    return { where: `WHERE ${filters.join(" AND ")}`, parameters }
}

function toReportRow(row) {
    const attended = Number(row.post_score != null || row.post_rating_mean != null) + Number(row.pre_score != null || row.pre_rating_mean != null)
    const pre = row.pre_score == null ? null : Number(row.pre_score)
    const post = row.post_score == null ? null : Number(row.post_score)

    return {
        userId: row.user_id,
        student: row.name,
        email: row.email,
        className: row.classes || "",
        completedModules: Number(row.completed_modules || 0),
        totalModules: Number(row.total_modules || 0),
        quizAverage: row.quiz_average == null ? null : Number(row.quiz_average),
        quizAttempts: Number(row.quiz_attempts || 0),
        bestQuizScore: row.best_quiz_score == null ? null : Number(row.best_quiz_score),
        activitySubmissions: Number(row.activity_submissions || 0),
        activitiesOutstanding: Number(row.activities_outstanding || 0),
        activitiesReviewed: Number(row.activities_reviewed || 0),
        preScore: pre,
        postScore: post,
        preRatingMean: row.pre_rating_mean == null ? null : Number(row.pre_rating_mean),
        postRatingMean: row.post_rating_mean == null ? null : Number(row.post_rating_mean),
        // The PRD calls this "quiz feedback status": whether the teacher has
        // reviewed the student's practical work and how they are doing.
        feedbackStatus: describeFeedbackStatus(row),
        improvement: pre == null || post == null ? null : Math.round((post - pre) * 100) / 100,
        assessmentsTaken: attended,
        postSubmittedAt: row.post_submitted_at || null,
        xpPoints: Number(row.xp_points || 0),
        badgeCount: Number(row.badge_count || 0),
    }
}

function describeFeedbackStatus(row) {
    const submitted = Number(row.activity_submissions || 0)
    if (submitted === 0) return "No activity submitted"
    const reviewed = Number(row.activities_reviewed || 0)
    if (reviewed >= submitted) return "Reviewed"
    return `${submitted - reviewed} awaiting review`
}

// Classroom-scale safe: the PRD's performance note is addressed by paginating
// in the database and by the shared projection for the export endpoints.
async function loadStudentProgress({ classId = null, teacherId = null, limit = 1000, offset = 0 } = {}) {
    const { where, parameters } = buildFilters({ classId, teacherId })
    const safeLimit = Math.min(5000, Math.max(1, Number(limit) || 1000))
    const safeOffset = Math.max(0, Number(offset) || 0)

    const [rows] = await db.promise().execute(
        `SELECT ${PROGRESS_COLUMNS}
         FROM \`user\` u
         JOIN \`role\` r ON r.role_id = u.role_id
         ${where}
         ORDER BY u.name ASC
         LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        parameters
    )
    return rows.map(toReportRow)
}

async function loadClassAnalytics({ classId = null, teacherId = null } = {}) {
    const students = await loadStudentProgress({ classId, teacherId, limit: 5000 })

    const withNumber = (list) => list.filter((value) => typeof value === "number" && !Number.isNaN(value))
    const average = (list) => (list.length ? Math.round((list.reduce((total, value) => total + value, 0) / list.length) * 100) / 100 : null)

    const preScores = withNumber(students.map((student) => student.preScore))
    const postScores = withNumber(students.map((student) => student.postScore))
    const improvements = withNumber(students.map((student) => student.improvement))

    const completionBands = [
        { label: "Not started", count: students.filter((student) => student.completedModules === 0).length },
        { label: "In progress", count: students.filter((student) => student.completedModules > 0 && student.completedModules < student.totalModules).length },
        { label: "All modules complete", count: students.filter((student) => student.totalModules > 0 && student.completedModules >= student.totalModules).length },
    ]

    return {
        studentCount: students.length,
        classCount: new Set(students.flatMap((student) => student.className.split(", ").filter(Boolean))).size,
        averagePreScore: average(preScores),
        averagePostScore: average(postScores),
        averageImprovement: average(improvements),
        averageQuizScore: average(withNumber(students.map((student) => student.quizAverage))),
        averagePreUnderstanding: average(withNumber(students.map((student) => student.preRatingMean))),
        averagePostUnderstanding: average(withNumber(students.map((student) => student.postRatingMean))),
        totalXpAwarded: students.reduce((total, student) => total + student.xpPoints, 0),
        totalBadgesAwarded: students.reduce((total, student) => total + student.badgeCount, 0),
        activitiesAwaitingReview: students.reduce((total, student) => total + Math.max(0, student.activitySubmissions - student.activitiesReviewed), 0),
        postTestCompletionRate: students.length
            ? Math.round((students.filter((student) => student.postScore != null || student.postRatingMean != null).length / students.length) * 10000) / 100
            : 0,
        completionBands,
        preTestReported: preScores.length,
        postTestReported: postScores.length,
    }
}

const CSV_COLUMNS = [
    { header: "Student", value: (row) => row.student },
    { header: "Email", value: (row) => row.email },
    { header: "Class", value: (row) => row.className },
    { header: "Modules complete", value: (row) => row.completedModules },
    { header: "Total modules", value: (row) => row.totalModules },
    { header: "Quiz attempts", value: (row) => row.quizAttempts },
    { header: "Quiz average", value: (row) => (row.quizAverage == null ? "" : `${row.quizAverage}%`) },
    { header: "Best quiz score", value: (row) => (row.bestQuizScore == null ? "" : `${row.bestQuizScore}%`) },
    { header: "Activities submitted", value: (row) => row.activitySubmissions },
    { header: "Activities outstanding", value: (row) => row.activitiesOutstanding },
    { header: "Feedback status", value: (row) => row.feedbackStatus },
    { header: "Pre-test score", value: (row) => formatScore(row.preScore, row.preRatingMean) },
    { header: "Post-test score", value: (row) => formatScore(row.postScore, row.postRatingMean) },
    { header: "Improvement", value: (row) => (row.improvement == null ? "" : row.improvement) },
    { header: "Badges", value: (row) => row.badgeCount },
    { header: "XP", value: (row) => row.xpPoints },
]

function escapeCsv(value) {
    const cell = String(value ?? "")
    const safe = /^[\s]*[=+\-@]/.test(cell) ? `'${cell}` : cell
    return `"${safe.replaceAll('"', '""')}"`
}

// A BOM is prepended so Excel opens UTF-8 names correctly, and CRLF line
// endings keep both Excel and Sheets happy.
function buildCsv(rows, { generatedAt = new Date() } = {}) {
    const lines = []
    lines.push(CSV_COLUMNS.map((column) => escapeCsv(column.header)).join(","))
    for (const row of rows) {
        lines.push(CSV_COLUMNS.map((column) => escapeCsv(column.value(row))).join(","))
    }
    lines.push("")
    lines.push(escapeCsv(`Generated ${generatedAt.toISOString()} by QualityCraft`))
    return `\uFEFF${lines.join("\r\n")}`
}

// Streams the PDF rather than buffering it: the document is piped straight to
// the response, so memory stays flat regardless of how many students match.
function streamProgressPdf(rows, { title = "QualityCraft student progress", generatedAt = new Date(), analytics = null }, destination) {
    const PDFDocument = require("pdfkit")
    const document = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" })
    document.pipe(destination)

    document.fontSize(18).text(title)
    document.moveDown(0.2)
    document.fontSize(9).fillColor("#555").text(`Generated ${generatedAt.toISOString()}`)
    document.moveDown(0.8)

    if (analytics) {
        document.fillColor("#000").fontSize(11).text("Class summary")
        document.moveDown(0.2)
        const summary = [
            `Students: ${analytics.studentCount}`,
            `Average pre-test: ${analytics.averagePreScore == null ? 'n/a' : `${analytics.averagePreScore}/5`}`,
            `Average post-test: ${analytics.averagePostScore == null ? 'n/a' : `${analytics.averagePostScore}/5`}`,
            `Pre-survey understanding: ${analytics.averagePreUnderstanding == null ? 'n/a' : `${analytics.averagePreUnderstanding}/5`}`,
            `Post-survey understanding: ${analytics.averagePostUnderstanding == null ? 'n/a' : `${analytics.averagePostUnderstanding}/5`}`,
            `Average improvement: ${analytics.averageImprovement == null ? "n/a" : analytics.averageImprovement}`,
            `Average quiz score: ${formatPercent(analytics.averageQuizScore)}`,
            `Post-test completion: ${formatPercent(analytics.postTestCompletionRate)}`,
            `Activities awaiting review: ${analytics.activitiesAwaitingReview}`,
        ]
        document.fontSize(9).fillColor("#333").text(summary.join("   |   "))
        document.moveDown(0.8)
    }

    const columns = [
        { header: "Student", width: 130, value: (row) => row.student },
        { header: "Class", width: 110, value: (row) => row.className || "-" },
        { header: "Modules", width: 62, value: (row) => `${row.completedModules}/${row.totalModules}` },
        { header: "Quizzes", width: 50, value: (row) => row.quizAttempts },
        { header: "Quiz avg", width: 58, value: (row) => formatPercent(row.quizAverage) },
        { header: "Activities", width: 60, value: (row) => row.activitySubmissions },
        { header: "Feedback", width: 110, value: (row) => row.feedbackStatus },
        { header: "Pre", width: 44, value: (row) => formatScore(row.preScore, row.preRatingMean) },
        { header: "Post", width: 44, value: (row) => formatScore(row.postScore, row.postRatingMean) },
        { header: "XP", width: 50, value: (row) => row.xpPoints },
        { header: "Badges", width: 46, value: (row) => row.badgeCount },
    ]

    const startX = document.x
    let y = document.y
    const rowHeight = 16

    function drawRow(cells, { bold = false } = {}) {
        let x = startX
        cells.forEach((cell, index) => {
            document.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#111")
            document.text(String(cell), x, y, { width: columns[index].width - 4, ellipsis: true, lineBreak: false })
            x += columns[index].width
        })
        y += rowHeight
    }

    drawRow(columns.map((column) => column.header), { bold: true })
    document.moveTo(startX, y - 4).lineTo(startX + columns.reduce((total, column) => total + column.width, 0), y - 4).strokeColor("#cccccc").stroke()

    for (const row of rows) {
        // Manual pagination: pdfkit only flows text automatically, and the
        // table needs to keep its alignment on every page.
        if (y > document.page.height - 50) {
            document.addPage()
            y = document.page.margins.top
            drawRow(columns.map((column) => column.header), { bold: true })
        }
        drawRow(columns.map((column) => column.value(row)))
    }

    if (!rows.length) {
        document.moveDown(1).fontSize(10).fillColor("#666").text("No students match this filter.")
    }

    document.end()
    return document
}

function formatPercent(value) {
    return value == null ? "-" : `${value}%`
}

// A survey (rating) response stores its 1–5 mean in `score`, while a knowledge
// check stores a 0–100 percentage. Both are reported as a single raw score:
// the presence of a rating_mean tells us the raw score is on the 1–5 scale.
function formatScore(score, ratingMean) {
    if (ratingMean != null) return `${ratingMean}/5`
    return formatPercent(score)
}

module.exports = {
    PROGRESS_COLUMNS,
    CSV_COLUMNS,
    loadStudentProgress,
    loadClassAnalytics,
    buildCsv,
    streamProgressPdf,
}
