const mysql = require("mysql2")
const config = require("./config")

// A single shared connection pool. Every query in the application goes through
// this pool, which keeps connection count bounded and lets MySQL recover from
// dropped connections automatically.
const db = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    port: config.database.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})

db.getConnection((error, connection) => {
    if (error) {
        console.error("MySQL connection failed:", error.message)
        return
    }
    console.log("MySQL connected successfully!")
    connection.release()
})

module.exports = db
