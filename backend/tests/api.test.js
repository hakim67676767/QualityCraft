const test = require('node:test')
const assert = require('node:assert/strict')

process.env.JWT_SECRET = 'test-secret-only-for-local-api-checks'
process.env.NODE_ENV = 'production'
Object.assign(process.env, { DB_HOST: '127.0.0.1', DB_USER: 'qualitycraft_test', DB_PASSWORD: 'temporary-test-password', DB_NAME: 'qualitycraft_test' })
const dbPath = require.resolve('../db')
const queries = []
const mockDb = {
  promise: () => ({
    execute: async (sql, params = []) => {
      queries.push({ sql, params })
      if (sql.includes('SELECT user_id FROM `user` WHERE email')) return [[]]
      if (sql.includes('SELECT role_id, role_name FROM `role`')) return [[{ role_id: 1, role_name: 'student' }]]
      if (sql.includes('INSERT INTO `user`')) return [{ insertId: 12 }]
      if (sql.includes('SELECT r.role_name FROM `user`')) return [[{ role_name: 'student' }]]
      if (sql.includes('AS id, u.name, u.email')) return [[{ id: 12, name: 'Example Student', email: 'student@example.test', role: 'student' }]]
      return [[]]
    },
  }),
}
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: mockDb }
const app = require('../server')

test('public sign-up cannot request administrator access', async () => {
  const server = app.listen(0)
  try {
    await new Promise((resolve) => server.once('listening', resolve))
    const address = `http://127.0.0.1:${server.address().port}`
    const response = await fetch(`${address}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Example Student', email: 'student@example.test', password: 'long-password', role: 'administrator' }),
    })
    assert.equal(response.status, 201)
    const body = await response.json()
    assert.equal(body.user.role, 'student')
    const session = response.headers.get('set-cookie')
    assert.match(session, /HttpOnly/i)
    assert.match(session, /SameSite=Strict/i)
    assert.match(session, /; Secure/i)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('x-powered-by'), null)
    assert.ok(queries.some(({ sql, params }) => sql.includes('INSERT INTO `user`') && params[0] === 1))
    const adminResponse = await fetch(`${address}/api/admin/modules`, { headers: { Authorization: `Bearer ${body.token}` } })
    assert.equal(adminResponse.status, 403)
    const anonymousResponse = await fetch(`${address}/api/me`)
    assert.equal(anonymousResponse.status, 401)
    const cookieResponse = await fetch(`${address}/api/me`, { headers: { Cookie: session.split(';')[0] } })
    assert.equal(cookieResponse.status, 200)
  } finally { await new Promise((resolve) => server.close(resolve)) }
})

test('invalid sessions and request bodies fail safely, and repeated login failures are limited', async () => {
  const server = app.listen(0)
  try {
    await new Promise((resolve) => server.once('listening', resolve))
    const base = `http://127.0.0.1:${server.address().port}`
    const malformedCookie = await fetch(`${base}/api/me`, { headers: { Cookie: 'qualitycraft_session=%ZZ' } })
    assert.equal(malformedCookie.status, 401)
    for (const route of ['register', 'login']) {
      const empty = await fetch(`${base}/api/auth/${route}`, { method: 'POST' })
      assert.equal(empty.status, 400)
      const malformed = await fetch(`${base}/api/auth/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })
      assert.equal(malformed.status, 400)
      assert.match((await malformed.json()).message, /valid JSON/)
    }
    const oversized = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(65_536) }) })
    assert.equal(oversized.status, 413)
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'limited@example.test', password: 'wrong-password' }) })
      assert.equal(response.status, attempt < 10 ? 401 : 429)
    }
  } finally { await new Promise((resolve) => server.close(resolve)) }
})
