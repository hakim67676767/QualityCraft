// One-time deployment task. Remove DB_ADMIN_* variables after provisioning.
const mysql = require('mysql2/promise')

async function provisionDatabaseUser(env = process.env) {
  for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_ADMIN_USER', 'DB_ADMIN_PASSWORD']) {
    if (!env[key]) throw new Error(`Provisioning requires ${key}`)
  }
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(env.DB_NAME)) throw new Error('Invalid application database name')
  if (!/^[a-zA-Z0-9_]{1,32}$/.test(env.DB_USER) || env.DB_USER.toLowerCase() === 'root') throw new Error('Provision a dedicated non-root database account')
  if (env.DB_PASSWORD.length < 16) throw new Error('Application database password must contain at least 16 characters')
  const connection = { host: env.DB_HOST, port: Number(env.DB_PORT) || 3306 }
  const admin = await mysql.createConnection({ ...connection, user: env.DB_ADMIN_USER, password: env.DB_ADMIN_PASSWORD, database: env.DB_NAME })
  try {
    // Existing accounts retain their password. Verification below rejects a mismatch.
    await admin.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [env.DB_USER, '%', env.DB_PASSWORD])
    await admin.query(`GRANT ALL PRIVILEGES ON ${mysql.escapeId(env.DB_NAME)}.* TO ?@?`, [env.DB_USER, '%'])
  } finally { await admin.end() }
  const application = await mysql.createConnection({ ...connection, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME })
  try { await application.query('SELECT 1') } finally { await application.end() }
}

if (require.main === module) {
  provisionDatabaseUser().then(() => console.log('Application database account is ready')).catch(() => {
    console.error('Database account provisioning failed. Check the private deployment credentials and database permissions.')
    process.exitCode = 1
  })
}

module.exports = { provisionDatabaseUser }
