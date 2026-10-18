// Shared HTTP plumbing: a typed error, an async wrapper, and the terminal
// middleware that turns thrown errors into consistent JSON responses.

// Every deliberate failure in the API is raised as an HttpError so the error
// handler can answer with the right status code and a user-friendly message.
class HttpError extends Error {
    constructor(status, message, details) {
        super(message)
        this.name = "HttpError"
        this.status = status
        this.details = details
    }
}

// Express 5 forwards rejected promises automatically, but wrapping keeps the
// behaviour identical across every route module and avoids unhandled rejections.
function asyncHandler(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function notFound(req, res) {
    res.status(404).json({ message: `No API route matches ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
function errorHandler(error, req, res, next) {
    if (error?.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Request body must contain valid JSON" })
    }
    if (error?.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body is too large" })
    }
    if (error instanceof HttpError) {
        const body = { message: error.message }
        if (error.details) body.details = error.details
        return res.status(error.status).json(body)
    }

    // Translate the MySQL errors that user input can realistically trigger into
    // meaningful responses instead of leaking a 500.
    if (error && error.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "That record already exists" })
    }
    if (error && error.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(404).json({ message: "The referenced record was not found" })
    }
    if (error && error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ message: "This record is still referenced elsewhere and cannot be removed" })
    }

    console.error("Unhandled API error:", error)
    return res.status(500).json({ message: "Something went wrong on the server" })
}

module.exports = { HttpError, asyncHandler, notFound, errorHandler }
