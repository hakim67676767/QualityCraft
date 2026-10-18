const fs = require('node:fs')
const path = require('node:path')
const mysql = require('mysql2/promise')
const config = require('../config')
const db = require('../db')
const { runMigrations } = require('../migrations/run')

async function main() {
  const connection = await mysql.createConnection({ ...config.database, multipleStatements: true })
  try {
    await connection.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'))
    await connection.query(fs.readFileSync(path.join(__dirname, '..', 'seed.sql'), 'utf8'))
    await runMigrations()
    console.log('QualityCraft database ready')
  } finally { await connection.end() }
}
main().catch((error) => { console.error('Database setup failed:', error.message); process.exitCode = 1 }).finally(() => db.promise().end())
