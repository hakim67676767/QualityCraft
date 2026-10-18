// Idempotent schema migration runner.
//
// MySQL (unlike MariaDB) does not support "ADD COLUMN IF NOT EXISTS", so every
// change is checked against information_schema before it is applied. Running this
// file repeatedly is safe and will simply report what was already present.
//
// Usage:  npm run migrate        (from the backend directory)

const db = require("../db")
const { tables, columns, indexes, foreignKeys } = require("./schema")
const { seeds, postDedupeIndexes, gamificationRules, badgeCatalogue } = require("./seeds")
const { seedUnderstandingSurveys } = require('./understandingSurveys')

const applied = []
const skipped = []

async function tableExists(pool, table) {
    const [rows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [table]
    )
    return Number(rows[0].total) > 0
}

async function columnExists(pool, table, column) {
    const [rows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, column]
    )
    return Number(rows[0].total) > 0
}

async function indexExists(pool, table, index) {
    const [rows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [table, index]
    )
    return Number(rows[0].total) > 0
}

async function constraintExists(pool, table, name) {
    const [rows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?",
        [table, name]
    )
    return Number(rows[0].total) > 0
}

async function applyTables(pool) {
    for (const table of tables) {
        if (await tableExists(pool, table.name)) {
            skipped.push(`table ${table.name} already exists`)
            continue
        }
        await pool.query(table.sql)
        applied.push(`created table ${table.name}`)
    }
}

async function applyColumns(pool) {
    for (const entry of columns) {
        if (await columnExists(pool, entry.table, entry.column)) {
            skipped.push(`column ${entry.table}.${entry.column} already exists`)
            continue
        }
        if (!(await tableExists(pool, entry.table))) {
            throw new Error(`Cannot add column ${entry.table}.${entry.column}: table is missing`)
        }
        const clause = entry.after ? ` AFTER \`${entry.after}\`` : ""
        await pool.query(`ALTER TABLE \`${entry.table}\` ADD COLUMN \`${entry.column}\` ${entry.definition}${clause}`)
        applied.push(`added column ${entry.table}.${entry.column}`)
    }
}

async function applySeeds(pool, phase) {
    for (const seed of seeds) {
        if (seed.phase !== phase) continue
        const [result] = await pool.query(seed.sql)
        if (result.affectedRows) applied.push(`seed ${seed.name} (${result.affectedRows} rows)`)
        else skipped.push(`seed ${seed.name} (no change needed)`)
    }
}

async function applyIndexes(pool, list) {
    for (const entry of list) {
        if (await indexExists(pool, entry.table, entry.name)) {
            skipped.push(`index ${entry.name} already exists`)
            continue
        }
        await pool.query(`ALTER TABLE \`${entry.table}\` ADD ${entry.definition}`)
        applied.push(`added index ${entry.name}`)
    }
}

async function applyForeignKeys(pool) {
    for (const entry of foreignKeys) {
        if (await constraintExists(pool, entry.table, entry.name)) {
            skipped.push(`constraint ${entry.name} already exists`)
            continue
        }
        await pool.query(`ALTER TABLE \`${entry.table}\` ADD ${entry.definition}`)
        applied.push(`added constraint ${entry.name}`)
    }
}

async function seedGamificationRules(pool) {
    for (const rule of gamificationRules) {
        const [result] = await pool.execute(
            "INSERT IGNORE INTO `gamification_rule` (code, name, event_type, xp_amount, description) VALUES (?, ?, ?, ?, ?)",
            [rule.code, rule.name, rule.eventType, rule.xp, rule.description]
        )
        if (result.affectedRows) applied.push(`rule ${rule.code}`)
        else skipped.push(`rule ${rule.code} already exists`)
    }
}

async function seedBadges(pool) {
    for (const badge of badgeCatalogue) {
        const [result] = await pool.execute(
            "INSERT IGNORE INTO `badge` (name, code, criteria, description, icon, criteria_type, criteria_threshold, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)",
            [badge.name, badge.code, badge.criteria, badge.description, badge.icon, badge.criteriaType, badge.threshold, badge.sortOrder]
        )
        if (result.affectedRows) applied.push(`badge ${badge.code}`)
        else skipped.push(`badge ${badge.code} already exists`)
    }
}

async function runMigrations() {
    const pool = db.promise()

    await applyTables(pool)
    await applyColumns(pool)
    await applySeeds(pool, "backfill")
    await applySeeds(pool, "preIndex")
    await applyIndexes(pool, indexes)
    await applyIndexes(pool, postDedupeIndexes)
    await applyForeignKeys(pool)
    await applySeeds(pool, "postIndex")
    await seedGamificationRules(pool)
    await seedBadges(pool)

    // Rating surveys have no correct/incorrect answers or percentage score.
    // Keep existing scores while allowing NULL for the new response format.
    for (const [table, column, definition] of [
        ['survey_response', 'score', 'DECIMAL(5, 2) NULL'],
        ['assessment_attempt', 'score', 'DECIMAL(5, 2) NULL DEFAULT NULL'],
        ['assessment_attempt', 'correct_count', 'INT NULL DEFAULT NULL'],
    ]) {
        const [rows] = await pool.execute('SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [table, column])
        if (rows[0]?.IS_NULLABLE === 'NO') {
            await pool.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`)
            applied.push(`allow ungraded responses in ${table}.${column}`)
        }
    }
    applied.push(...await seedUnderstandingSurveys(pool))
    await pool.query('UPDATE assessment_attempt aa JOIN survey_response sr ON sr.user_id = aa.user_id AND sr.phase = aa.phase SET aa.ratings = sr.ratings WHERE aa.is_retake = FALSE AND aa.ratings IS NULL AND sr.ratings IS NOT NULL')

    return { applied, skipped }
}

async function main() {
    try {
        const result = await runMigrations()
        console.log("MIGRATION COMPLETE")
        console.log(`  applied: ${result.applied.length}`)
        result.applied.forEach((line) => console.log(`    + ${line}`))
        console.log(`  already present: ${result.skipped.length}`)
        process.exit(0)
    } catch (error) {
        console.error("MIGRATION FAILED:", error.message)
        process.exit(1)
    }
}

if (require.main === module) {
    main()
}

module.exports = { runMigrations }
