const fs = require('node:fs/promises')
const path = require('node:path')
const db = require('../db')

const emailIndex = process.argv.indexOf('--email')
const email = emailIndex >= 0 ? String(process.argv[emailIndex + 1] || '').trim().toLowerCase() : ''

if (!email) {
    console.error('Usage: node scripts/reset-legacy-pretest.js --email student@example.com')
    process.exitCode = 1
} else {
    resetLegacyPretest(email)
        .then((result) => console.log(JSON.stringify(result, null, 2)))
        .catch((error) => { console.error('Unable to reset legacy pre-test:', error.message); process.exitCode = 1 })
        .finally(() => db.promise().end())
}

async function resetLegacyPretest(studentEmail) {
    const pool = db.promise()
    const [rows] = await pool.execute(`SELECT u.user_id, u.email, pre.response_id, pre.score, pre.rating_mean, pre.ratings, pre.submitted_at,
        post.response_id AS post_response_id, post.rating_mean AS post_rating_mean
        FROM \`user\` u
        JOIN survey_response pre ON pre.user_id = u.user_id AND pre.phase = 'pre'
        LEFT JOIN survey_response post ON post.user_id = u.user_id AND post.phase = 'post'
        WHERE LOWER(u.email) = ?`, [studentEmail])
    const record = rows[0]
    if (!record) throw new Error('No pre-test record exists for that account')
    if (record.rating_mean != null || record.ratings != null || record.score == null) throw new Error('The pre-test is already a 1–5 survey; nothing was changed')
    if (record.post_response_id == null || record.post_rating_mean == null) throw new Error('This reset only supports a legacy pre-test paired with a current 1–5 post-test')

    const directory = path.resolve(__dirname, '../../design-review/survey-resets')
    await fs.mkdir(directory, { recursive: true })
    const backupPath = path.join(directory, `legacy-pretest-${record.user_id}-${Date.now()}.database-backup.json`)
    await fs.writeFile(backupPath, JSON.stringify({ resetAt: new Date().toISOString(), pretest: record }, null, 2), { flag: 'wx' })

    const connection = await pool.getConnection()
    try {
        await connection.beginTransaction()
        const [result] = await connection.execute('DELETE FROM survey_response WHERE response_id = ? AND user_id = ? AND phase = \'pre\' AND rating_mean IS NULL AND ratings IS NULL', [record.response_id, record.user_id])
        if (result.affectedRows !== 1) throw new Error('The pre-test changed before it could be reset')
        await connection.commit()
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }

    return { email: record.email, resetResponseId: record.response_id, retainedPostResponseId: record.post_response_id, backupPath }
}
