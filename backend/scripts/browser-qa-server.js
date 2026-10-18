const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

async function main() {
  const name = `qualitycraft_browser_${crypto.randomBytes(4).toString('hex')}`;
  const credentials = { host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, port: Number(process.env.DB_PORT) || 3306 };
  const root = await mysql.createConnection(credentials);
  let pool;
  let server;
  let stopping = false;
  async function stop(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.promise().end();
    if (!/^qualitycraft_browser_[0-9a-f]{8}$/.test(name)) throw new Error('Invalid temporary database name');
    await root.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await root.end();
    console.log('Browser QA server stopped; temporary database removed.');
    process.exit(exitCode);
  }
  try {
    await root.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    process.env.DB_NAME = name;
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    const setup = await mysql.createConnection({ ...credentials, database: name, multipleStatements: true });
    try {
      await setup.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
      await setup.query(fs.readFileSync(path.join(__dirname, '..', 'seed.sql'), 'utf8'));
    } finally { await setup.end(); }
    pool = require('../db');
    await require('../migrations/run').runMigrations();
    const passwordHash = await bcrypt.hash('BrowserTest2026!', 4);
    await pool.promise().execute("INSERT INTO `user` (role_id, name, email, password_hash) SELECT role_id, 'Browser QA Admin', 'admin@browser.test', ? FROM `role` WHERE role_name = 'administrator'", [passwordHash]);
    const [lessons] = await pool.promise().query('SELECT l.lesson_id, l.title, m.title AS module_title, q.question_id, q.type, q.options, q.question_text, q.answer_key FROM `lesson` l JOIN `module` m ON m.module_id = l.module_id JOIN `question` q ON q.lesson_id = l.lesson_id ORDER BY m.sequence_no, l.sequence_no, q.question_id');
    const [activities] = await pool.promise().query('SELECT activity_id, lesson_id, title, activity_type FROM `activity` ORDER BY activity_id');
    const output = path.join(__dirname, '..', '..', 'design-review', 'playwright');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'fixtures.json'), JSON.stringify({ lessons, activities }, null, 2));
    const app = require('../server');
    server = app.listen(4179, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    console.log('Browser QA ready: http://127.0.0.1:4179');
    console.log('Temporary test administrator: admin@browser.test / BrowserTest2026!');
    console.log('Send stop on stdin to remove the temporary database.');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => { if (data.trim() === 'stop') stop().catch((error) => { console.error(error.message); process.exitCode = 1; }); });
    process.on('SIGINT', () => stop().catch(console.error));
    process.on('SIGTERM', () => stop().catch(console.error));
  } catch (error) { console.error(error.message); await stop(1); }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
