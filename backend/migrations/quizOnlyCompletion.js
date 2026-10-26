const fs = require('node:fs/promises')
const path = require('node:path')
const { policy, scoreLesson } = require('../lib/learningPolicy')

// Separate revision: never rerun the catalogue rewrite to update completion rules.
async function applyQuizOnlyCompletion(pool) {
    const [applied] = await pool.execute('SELECT revision_key FROM curriculum_revision WHERE revision_key = ?', [policy.completionRevision])
    if (applied.length) return []
    const [modules] = await pool.query("SELECT module_id FROM `module` WHERE status = 'published' ORDER BY sequence_no, module_id")
    if (!modules.length) return []
    const ids = modules.map((module) => Number(module.module_id))
    const placeholders = ids.map(() => '?').join(',')
    const [before] = await pool.execute(`SELECT * FROM progress WHERE module_id IN (${placeholders})`, ids)
    const directory = path.resolve(__dirname, '../../design-review/curriculum')
    await fs.mkdir(directory, { recursive: true })
    const backupPath = path.join(directory, `${policy.completionRevision}-${Date.now()}.database-backup.json`)
    await fs.writeFile(backupPath, JSON.stringify({ revision: policy.completionRevision, createdAt: new Date().toISOString(), progress: before }, null, 2), { flag: 'wx' })
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const [evidence] = await connection.execute(`SELECT l.module_id, l.lesson_id, u.user_id,
            (SELECT MAX(qa.score) FROM quiz_attempt qa WHERE qa.user_id = u.user_id AND qa.lesson_id = l.lesson_id) AS best_score
            FROM \`lesson\` l CROSS JOIN (
                SELECT user_id FROM progress WHERE module_id IN (${placeholders})
                UNION SELECT qa.user_id FROM quiz_attempt qa JOIN \`lesson\` ll ON ll.lesson_id = qa.lesson_id WHERE ll.module_id IN (${placeholders})
            ) u WHERE l.module_id IN (${placeholders})`, [...ids, ...ids, ...ids])
        const groups = new Map()
        for (const row of evidence) {
            const key = `${row.user_id}:${row.module_id}`
            if (!groups.has(key)) groups.set(key, { userId: row.user_id, moduleId: row.module_id, lessons: [] })
            groups.get(key).lessons.push(scoreLesson(false, [], Number(row.best_score || 0)))
        }
        for (const group of groups.values()) {
            const complete = group.lessons.every((lesson) => lesson.quizPassed)
            const percent = complete ? 100 : Math.min(99.99, Math.round(group.lessons.reduce((sum, lesson) => sum + lesson.percent, 0) / group.lessons.length * 100) / 100)
            await connection.execute(`INSERT INTO progress (user_id, module_id, status, percent_complete, completed_at) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), percent_complete = VALUES(percent_complete),
                completed_at = IF(VALUES(status) = 'complete', COALESCE(progress.completed_at, VALUES(completed_at)), NULL)`, [group.userId, group.moduleId, complete ? 'complete' : percent > 0 ? 'in_progress' : 'not_started', percent, complete ? new Date() : null])
        }
        await connection.execute('INSERT INTO curriculum_revision (revision_key, backup_path) VALUES (?, ?)', [policy.completionRevision, backupPath])
        await connection.commit()
        return [`applied ${policy.completionRevision}; backup: ${backupPath}`]
    } catch (error) {
        await connection.rollback()
        throw error
    } finally { connection.release() }
}

module.exports = { applyQuizOnlyCompletion }
