// Badge evaluation.
//
// Badges are never awarded by hand in the run of normal use: after any learning
// event we recompute the student's milestones and grant whichever badges are now
// satisfied. The unique key on (user_id, badge_id) makes double-awarding safe.

const db = require("../db")

async function collectStats(userId) {
    const [rows] = await db.promise().execute(
        `SELECT
            (SELECT COUNT(*) FROM \`class_member\` WHERE student_id = ?) AS class_memberships,
            (SELECT COUNT(*) FROM \`quiz_attempt\` WHERE user_id = ?) AS quiz_attempts,
            (SELECT COUNT(*) FROM \`quiz_attempt\` WHERE user_id = ? AND score >= 100) AS perfect_quizzes,
            (SELECT COUNT(*) FROM \`activity_submission\` WHERE user_id = ?) AS activity_submissions,
            (SELECT COUNT(*) FROM progress p JOIN \`module\` m ON m.module_id = p.module_id AND m.status = 'published' WHERE p.user_id = ? AND p.status = 'complete') AS modules_completed,
            (SELECT COUNT(*) FROM \`module\` WHERE status = 'published') AS published_modules,
            (SELECT COUNT(*) FROM \`survey_response\` WHERE user_id = ? AND phase = 'post') AS post_tests,
            (SELECT xp_points FROM \`user\` WHERE user_id = ?) AS xp_points`,
        [userId, userId, userId, userId, userId, userId, userId]
    )
    const row = rows[0] || {}
    return {
        classMemberships: Number(row.class_memberships || 0),
        quizAttempts: Number(row.quiz_attempts || 0),
        perfectQuizzes: Number(row.perfect_quizzes || 0),
        activitySubmissions: Number(row.activity_submissions || 0),
        modulesCompleted: Number(row.modules_completed || 0),
        publishedModules: Number(row.published_modules || 0),
        postTests: Number(row.post_tests || 0),
        xpPoints: Number(row.xp_points || 0),
    }
}

function meetsCriteria(badge, stats) {
    const threshold = Number(badge.criteria_threshold || 0)

    switch (badge.criteria_type) {
        case "class_join":
            return stats.classMemberships >= threshold
        case "quiz_attempt_count":
            return stats.quizAttempts >= threshold
        case "perfect_quiz":
            return stats.perfectQuizzes >= threshold
        case "activity_count":
            return stats.activitySubmissions >= threshold
        case "module_count":
            return stats.modulesCompleted >= threshold
        case "module_count_all":
            return stats.publishedModules > 0 && stats.modulesCompleted >= stats.publishedModules
        case "post_test_count":
            return stats.postTests >= threshold
        case "xp_threshold":
            return stats.xpPoints >= threshold
        default:
            return false
    }
}

async function listActiveBadges() {
    const [rows] = await db.promise().query(
        "SELECT badge_id, name, code, description, icon, criteria, criteria_type, criteria_threshold, sort_order FROM `badge` WHERE is_active = TRUE ORDER BY sort_order, badge_id"
    )
    return rows
}

async function getEarnedBadgeIds(userId) {
    const [rows] = await db.promise().execute("SELECT badge_id FROM `user_badge` WHERE user_id = ?", [userId])
    return new Set(rows.map((row) => row.badge_id))
}

// Grants every badge whose criteria the student now satisfies.
// Returns the badges that were newly awarded by this call.
async function evaluateBadges(userId) {
    const pool = db.promise()
    const [badges, earned] = await Promise.all([listActiveBadges(), getEarnedBadgeIds(userId)])
    const stats = await collectStats(userId)

    const newlyAwarded = []
    for (const badge of badges) {
        if (earned.has(badge.badge_id)) continue
        if (!meetsCriteria(badge, stats)) continue

        const [result] = await pool.execute(
            "INSERT IGNORE INTO `user_badge` (user_id, badge_id) VALUES (?, ?)",
            [userId, badge.badge_id]
        )
        if (result.affectedRows) {
            newlyAwarded.push({ badgeId: badge.badge_id, name: badge.name, code: badge.code, icon: badge.icon })
        }
    }
    return newlyAwarded
}

module.exports = { evaluateBadges, collectStats, meetsCriteria, listActiveBadges }
