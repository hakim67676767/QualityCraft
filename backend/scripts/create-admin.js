const bcrypt = require('bcryptjs')
const db = require('../db')

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const name = (process.env.ADMIN_NAME || '').trim()
  const password = process.env.ADMIN_PASSWORD || ''
  if (!email || !name || password.length < 12) throw new Error('Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD (12+ characters)')
  const [roles] = await db.promise().execute("SELECT role_id FROM `role` WHERE role_name = 'administrator'")
  const [existing] = await db.promise().execute('SELECT user_id FROM `user` WHERE email = ?', [email])
  if (existing.length) throw new Error('That email already has an account; refusing to overwrite it')
  const hash = await bcrypt.hash(password, 12)
  await db.promise().execute('INSERT INTO `user` (role_id, name, email, password_hash) VALUES (?, ?, ?, ?)', [roles[0].role_id, name, email, hash])
  console.log(`Administrator account created: ${email}`)
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 }).finally(() => db.end())
