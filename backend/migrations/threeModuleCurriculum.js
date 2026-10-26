const fs = require('node:fs/promises')
const path = require('node:path')
const { policy, scoreLesson } = require('../lib/learningPolicy')
const { catalogue, archivedShortAnswerChoices } = require('./mcqCatalogue')

async function applyCatalogueRevision(pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS curriculum_revision (
        revision_key VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        backup_path TEXT NULL
    )`)
    await pool.execute("UPDATE gamification_rule SET description = ? WHERE code = 'module_complete'", ['Awarded when every lesson quiz score is at least 50%. Reading and practical submissions are optional.'])
    const [applied] = await pool.execute('SELECT revision_key FROM curriculum_revision WHERE revision_key = ?', [policy.revision])
    if (applied.length) return []
    const [modules] = await pool.query('SELECT * FROM `module` ORDER BY module_id')
    if (!modules.length) return [] // Setup may not have loaded the base content yet.
    const selected = policy.modules.map((stage) => ({ ...stage, row: modules.find((module) => module.title === stage.title) }))
    if (selected.some((stage) => !stage.row)) throw new Error('The three selected curriculum modules must exist before applying this revision')

    const backup = { revision: policy.revision, createdAt: new Date().toISOString(), modules }
    for (const table of ['lesson', 'question', 'activity', 'progress']) {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``)
        backup[table] = rows
    }
    const directory = process.env.BACKUP_DIR || path.resolve(__dirname, '../.curriculum-backups')
    await fs.mkdir(directory, { recursive: true })
    const backupPath = path.join(directory, `${policy.revision}-${Date.now()}.database-backup.json`)
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), { flag: 'wx' })

    await pool.query('ALTER TABLE `activity` ALTER COLUMN is_required SET DEFAULT FALSE')
    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const ids = selected.map((stage) => Number(stage.row.module_id))
        const placeholders = ids.map(() => '?').join(',')
        await connection.execute(`UPDATE \`module\` SET status = 'hidden' WHERE module_id NOT IN (${placeholders})`, ids)
        for (const stage of selected) {
            await connection.execute("UPDATE `module` SET status = 'published', sequence_no = ?, published_at = COALESCE(published_at, CURRENT_TIMESTAMP) WHERE module_id = ?", [stage.sequence, stage.row.module_id])
            const lessons = backup.lesson.filter((lesson) => Number(lesson.module_id) === Number(stage.row.module_id))
            if (!lessons.length) throw new Error(`No lesson found for ${stage.title}`)
            const lesson = lessons.sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no) || a.lesson_id - b.lesson_id)[0]
            for (const item of catalogue[stage.title]) {
                const existing = backup.question.find((question) => Number(question.lesson_id) === Number(lesson.lesson_id) && [item.match, item.question].includes(question.question_text))
                if (existing) {
                    await connection.execute("UPDATE `question` SET type = 'multiple_choice', question_text = ?, options = ?, answer_key = ?, explanation = ? WHERE question_id = ?", [item.question, JSON.stringify(item.options), item.answer, item.explanation, existing.question_id])
                } else {
                    await connection.execute("INSERT INTO `question` (lesson_id, type, question_text, options, answer_key, explanation) VALUES (?, 'multiple_choice', ?, ?, ?, ?)", [lesson.lesson_id, item.question, JSON.stringify(item.options), item.answer, item.explanation])
                }
            }
        }
        // Convert remaining legacy question types too, including hidden content.
        const [legacy] = await connection.query("SELECT question_id, type, answer_key FROM `question` WHERE type <> 'multiple_choice'")
        for (const question of legacy) {
            const choices = question.type === 'true_false' ? ['True', 'False'] : archivedShortAnswerChoices[question.answer_key]
            if (!choices) throw new Error(`Question ${question.question_id} needs authored multiple-choice alternatives`)
            await connection.execute("UPDATE `question` SET type = 'multiple_choice', options = ? WHERE question_id = ?", [JSON.stringify(choices), question.question_id])
        }
        await connection.query('UPDATE `activity` SET is_required = FALSE')
        const phrases = [
            ['Before the quiz, complete the test case activity below.', 'You may try the optional test case activity below. It is not required to take or pass the quiz.'],
            ['Complete the bug report activity before taking the quiz.', 'The bug report activity is optional. Read the lesson, then take the multiple-choice quiz.'],
            ['Complete the reflection activity before the quiz.', 'The reflection activity is optional and does not affect module completion.'],
        ]
        for (const [before, after] of phrases) await connection.execute('UPDATE `lesson` SET content = REPLACE(content, ?, ?) WHERE content LIKE ?', [before, after, `%${before}%`])

        // Recompute existing active-course progress without awarding duplicate XP
        // or changing any quiz attempt, submission, answer snapshot or badge.
        const [evidence] = await connection.execute(`SELECT l.module_id, l.lesson_id, u.user_id,
            EXISTS(SELECT 1 FROM lesson_completion lc WHERE lc.user_id = u.user_id AND lc.lesson_id = l.lesson_id) AS was_read,
            (SELECT MAX(qa.score) FROM quiz_attempt qa WHERE qa.user_id = u.user_id AND qa.lesson_id = l.lesson_id) AS best_score
            FROM \`lesson\` l CROSS JOIN (
                SELECT user_id FROM progress WHERE module_id IN (${placeholders})
                UNION SELECT lc.user_id FROM lesson_completion lc JOIN \`lesson\` ll ON ll.lesson_id = lc.lesson_id WHERE ll.module_id IN (${placeholders})
                UNION SELECT qa.user_id FROM quiz_attempt qa JOIN \`lesson\` ll ON ll.lesson_id = qa.lesson_id WHERE ll.module_id IN (${placeholders})
            ) u WHERE l.module_id IN (${placeholders})`, [...ids, ...ids, ...ids, ...ids])
        const groups = new Map()
        for (const row of evidence) {
            const key = `${row.user_id}:${row.module_id}`
            if (!groups.has(key)) groups.set(key, { userId: row.user_id, moduleId: row.module_id, lessons: [] })
            groups.get(key).lessons.push(scoreLesson(Boolean(row.was_read), [], Number(row.best_score || 0)))
        }
        for (const group of groups.values()) {
            const complete = group.lessons.every((lesson) => lesson.quizPassed)
            const percent = complete ? 100 : Math.min(99.99, Math.round(group.lessons.reduce((sum, lesson) => sum + lesson.percent, 0) / group.lessons.length * 100) / 100)
            await connection.execute(`INSERT INTO progress (user_id, module_id, status, percent_complete, completed_at) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), percent_complete = VALUES(percent_complete),
                completed_at = IF(VALUES(status) = 'complete', COALESCE(progress.completed_at, VALUES(completed_at)), NULL)`, [group.userId, group.moduleId, complete ? 'complete' : percent > 0 ? 'in_progress' : 'not_started', percent, complete ? new Date() : null])
        }
        await connection.execute('INSERT INTO curriculum_revision (revision_key, backup_path) VALUES (?, ?)', [policy.revision, backupPath])
        await connection.commit()
        return [`applied ${policy.revision}; backup: ${backupPath}`]
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}

async function applyCurriculumRevision(pool) {
    const changes = await applyCatalogueRevision(pool)
    changes.push(...await require('./quizOnlyCompletion').applyQuizOnlyCompletion(pool))
    return changes
}

module.exports = { applyCurriculumRevision }
