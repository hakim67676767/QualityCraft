// Authentication and role-based authorisation.
//
// The JWT carries identity only. The role is always re-read from the database so
// that an administrator promoting or demoting an account takes effect on the
// very next request instead of when the token expires.

const jwt = require("jsonwebtoken")
const config = require("../config")
const db = require("../db")
const { HttpError } = require("../lib/http")

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || ""
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""

    try {
        req.auth = jwt.verify(token, config.jwtSecret)
        return next()
    } catch {
        return next(new HttpError(401, "Authentication required"))
    }
}

async function loadUserRole(userId) {
    const [rows] = await db.promise().execute(
        "SELECT r.role_name FROM `user` u JOIN `role` r ON r.role_id = u.role_id WHERE u.user_id = ?",
        [userId]
    )
    return rows[0]?.role_name || null
}

// Returns middleware that only lets the listed roles through.
function requireRole(...roles) {
    return async (req, res, next) => {
        try {
            const role = await loadUserRole(req.auth.id)
            if (!role) throw new HttpError(401, "This account no longer exists")
            if (!roles.includes(role)) {
                throw new HttpError(403, `${roles.join(" or ")} access is required for this action`)
            }
            req.auth.role = role
            return next()
        } catch (error) {
            return next(error)
        }
    }
}

const requireStudent = requireRole("student")
const requireTeacherOrAdmin = requireRole("teacher", "administrator")
const requireAdmin = requireRole("administrator")

module.exports = { requireAuth, loadUserRole, requireRole, requireStudent, requireTeacherOrAdmin, requireAdmin }
