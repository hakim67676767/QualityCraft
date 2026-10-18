const test = require('node:test')
const assert = require('node:assert/strict')
const { validateProductionEnvironment } = require('../config')

test('production startup rejects incomplete credentials, placeholder secrets and the root database user', () => {
  const valid = { NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64), DB_HOST: '127.0.0.1', DB_USER: 'qualitycraft_app', DB_PASSWORD: 'private-password', DB_NAME: 'qualitycraft' }
  assert.doesNotThrow(() => validateProductionEnvironment(valid))
  for (const JWT_SECRET of ['', 'short', 'replace-with-a-long-random-secret-that-is-not-configured']) {
    assert.throws(() => validateProductionEnvironment({ ...valid, JWT_SECRET }), /JWT_SECRET/)
  }
  for (const key of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
    assert.throws(() => validateProductionEnvironment({ ...valid, [key]: '' }), /Production requires explicit/)
  }
  assert.throws(() => validateProductionEnvironment({ ...valid, DB_PASSWORD: 'replace-with-your-database-password' }), /Production requires explicit/)
  assert.throws(() => validateProductionEnvironment({ ...valid, DB_USER: 'root' }), /dedicated database account/)
  assert.doesNotThrow(() => validateProductionEnvironment({ NODE_ENV: 'development' }))
})
