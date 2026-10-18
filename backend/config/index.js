// Central place for every environment-driven setting. Reading process.env in one
// module means the rest of the codebase never has to know how configuration is
// loaded or which variables exist.

require("dotenv").config()

function validateProductionEnvironment(env) {
    if (env.NODE_ENV !== "production") return
    if (Buffer.byteLength(env.JWT_SECRET || "") < 32 || /replace-with|change-me|your-secret/i.test(env.JWT_SECRET)) {
        throw new Error("Production requires a random JWT_SECRET of at least 32 bytes")
    }
    if (!["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"].every((key) => env[key] && !/^replace-with/i.test(env[key]))) {
        throw new Error("Production requires explicit DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME")
    }
    if (env.DB_USER.toLowerCase() === "root") {
        throw new Error("Production requires a dedicated database account instead of root")
    }
}

validateProductionEnvironment(process.env)

const config = {
    port: Number(process.env.PORT) || 5000,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: "1d",
    passwordSaltRounds: 12,
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306,
    },
}

// Fail loudly on the one setting that silently breaks auth if it is missing.
if (!config.jwtSecret) {
    console.warn("WARNING: JWT_SECRET is not configured. Authentication will be rejected.")
}

module.exports = config
module.exports.validateProductionEnvironment = validateProductionEnvironment
