const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');

function identifier(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Database and table names must contain only letters, numbers, and underscores');
  return `\`${value}\``;
}

async function backupDatabase(connection) {
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  try {
    const [names] = await connection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tables = [];
    for (const row of names) {
      const name = Object.values(row)[0];
      const [schema] = await connection.query(`SHOW CREATE TABLE ${identifier(name)}`);
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${identifier(name)}`);
      const [rows] = await connection.query(`SELECT * FROM ${identifier(name)}`);
      tables.push({ name, schema: schema[0]['Create Table'], jsonColumns: columns.filter((column) => column.Type === 'json').map((column) => column.Field), rows });
    }
    await connection.commit();
    return { format: 'qualitycraft-database-backup-v1', createdAt: new Date().toISOString(), tables };
  } catch (error) { await connection.rollback(); throw error; }
}

async function restoreDatabase(connection, backup, target) {
  identifier(target);
  if (backup.format !== 'qualitycraft-database-backup-v1' || !Array.isArray(backup.tables) || !backup.tables.length) throw new Error('Not a full QualityCraft database backup');
  // CREATE DATABASE deliberately fails if the target exists; recovery never overwrites an installation.
  await connection.query(`CREATE DATABASE ${identifier(target)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE ${identifier(target)}`);
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of backup.tables) {
      identifier(table.name);
      await connection.query(table.schema);
      for (const row of table.rows) {
        const columns = Object.keys(row);
        await connection.execute(`INSERT INTO ${identifier(table.name)} (${columns.map(identifier).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, columns.map((column) => table.jsonColumns.includes(column) && row[column] !== null ? JSON.stringify(row[column]) : row[column]));
      }
    }
  } finally { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); }
}

async function main() {
  const config = require('../config');
  const mode = process.argv[2];
  const file = process.argv[3];
  if (!['backup', 'restore'].includes(mode) || !file) throw new Error('Usage: node scripts/database-backup.js backup|restore <file.json> [new_database_name]');
  const connection = await mysql.createConnection({ ...config.database, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true });
  try {
    if (mode === 'backup') {
      const backup = await backupDatabase(connection);
      await fs.writeFile(path.resolve(file), JSON.stringify(backup, null, 2), { flag: 'wx' });
      console.log(`Full database backup written: ${path.resolve(file)} (${backup.tables.length} tables)`);
    } else {
      const target = process.argv[4];
      if (!target || target === config.database.database) throw new Error('Restore requires a new database name, different from the current database');
      await restoreDatabase(connection, JSON.parse(await fs.readFile(path.resolve(file), 'utf8')), target);
      console.log(`Restored into ${target}. Verify it before updating DB_NAME. The current database was not changed.`);
    }
  } finally { await connection.end(); }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { backupDatabase, restoreDatabase };
