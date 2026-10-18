// Input validation and normalisation helpers.
//
// Every function throws an HttpError(400) with a message that is safe to show to
// the person using the form, so route handlers can validate without repeating
// status-code boilerplate.

const { HttpError } = require("./http")

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const QUESTION_TYPES = ["multiple_choice", "true_false", "short_answer"]
const ACTIVITY_TYPES = ["test_case", "bug_report", "reflection"]
const MODULE_STATUSES = ["draft", "published", "hidden"]

function requireString(value, field, { min = 1, max = 5000 } = {}) {
    const text = typeof value === "string" ? value.trim() : ""
    if (!text) throw new HttpError(400, `${field} is required`)
    if (text.length < min) throw new HttpError(400, `${field} must be at least ${min} characters`)
    if (text.length > max) throw new HttpError(400, `${field} must be ${max} characters or fewer`)
    return text
}

function optionalString(value, max = 5000) {
    if (value === undefined || value === null) return null
    const text = String(value).trim()
    if (!text) return null
    if (text.length > max) throw new HttpError(400, `Text must be ${max} characters or fewer`)
    return text
}

function requireEmail(value) {
    const email = String(value || "").trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, "A valid email address is required")
    return email
}

function requirePassword(value) {
    const password = typeof value === "string" ? value : ""
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters")
    return password
}

function requireOneOf(value, allowed, field) {
    const normalised = String(value || "").trim()
    if (!allowed.includes(normalised)) {
        throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`)
    }
    return normalised
}

function requirePositiveInt(value, field) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, `${field} must be a positive whole number`)
    return parsed
}

function optionalPositiveInt(value, fallback = 0) {
    if (value === undefined || value === null || value === "") return fallback
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) throw new HttpError(400, "Expected a non-negative whole number")
    return parsed
}

function optionalBoolean(value, fallback = false) {
    if (value === undefined || value === null) return fallback
    if (typeof value === "boolean") return value
    const text = String(value).toLowerCase()
    if (["true", "1", "yes"].includes(text)) return true
    if (["false", "0", "no"].includes(text)) return false
    throw new HttpError(400, "Expected a true or false value")
}

// Question options are stored as a JSON array in a TEXT column.
function parseOptions(value) {
    if (value === undefined || value === null || value === "") return null
    const raw = Array.isArray(value) ? value : JSON.parse(value)
    if (!Array.isArray(raw)) throw new HttpError(400, "Question options must be a list")
    const cleaned = raw.map((option) => String(option).trim()).filter(Boolean)
    if (!cleaned.length) throw new HttpError(400, "A choice question needs at least one option")
    return JSON.stringify(cleaned)
}

function readOptions(value) {
    if (!value) return []
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

// Robust short-answer comparison: case-insensitive, whitespace-insensitive and
// tolerant of the quoting/punctuation noise students add when typing by hand.
function normalizeAnswer(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/[.!;]+$/g, "")
        .trim()
}

function answersMatch(submitted, expected) {
    return normalizeAnswer(submitted) === normalizeAnswer(expected)
}

module.exports = {
    QUESTION_TYPES,
    ACTIVITY_TYPES,
    MODULE_STATUSES,
    requireString,
    optionalString,
    requireEmail,
    requirePassword,
    requireOneOf,
    requirePositiveInt,
    optionalPositiveInt,
    optionalBoolean,
    parseOptions,
    readOptions,
    normalizeAnswer,
    answersMatch,
}
