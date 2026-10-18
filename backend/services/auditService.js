// Append-only audit trail for administrator actions.
//
// Writes never throw into the caller: an audit failure must not roll back the
// action the user actually asked for, so problems are logged and swallowed.

const db = require("../db")

async function record({ actorId = null, actorRole = null, action, entityType, entityId = null, summary, details = null }) {
    try {
        await db.promise().execute(
            `INSERT INTO audit_log (actor_id, actor_role, action, entity_type, entity_id, summary, details)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [actorId, actorRole, action, entityType, entityId, summary, details ? JSON.stringify(details) : null]
        )
    } catch (error) {
        console.error("Audit log write failed:", error.message)
    }
}

async function list({ limit = 100, entityType = null, action = null } = {}) {
    const pool = db.promise()
    const filters = []
    const parameters = []

    if (entityType) {
        filters.push("a.entity_type = ?")
        parameters.push(entityType)
    }
    if (action) {
        filters.push("a.action = ?")
        parameters.push(action)
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : ""
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100))

    const [rows] = await pool.execute(
        `SELECT a.log_id, a.actor_id, a.actor_role, a.action, a.entity_type, a.entity_id,
                a.summary, a.details, a.created_at, u.name AS actor_name
         FROM \`audit_log\` a
         LEFT JOIN \`user\` u ON u.user_id = a.actor_id
         ${where}
         ORDER BY a.created_at DESC, a.log_id DESC
         LIMIT ${safeLimit}`,
        parameters
    )
    return rows
}

module.exports = { record, list }
