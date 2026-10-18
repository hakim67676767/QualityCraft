const db = require('../db')
const { evaluateBadges } = require('./badgeService')

// The event key is unique per learner and milestone. The ledger insert and XP
// update share one transaction, so retries cannot award the same action twice.
async function awardOnce(userId, eventKey, eventType, multiplier = 1) {
  const connection = await db.promise().getConnection()
  let amount = 0
  try {
    await connection.beginTransaction()
    const [rules] = await connection.execute('SELECT xp_amount FROM `gamification_rule` WHERE code = ? AND is_active = TRUE', [eventType])
    amount = Math.max(0, Math.round(Number(rules[0]?.xp_amount || 0) * multiplier))
    const [insert] = await connection.execute('INSERT IGNORE INTO `xp_event` (user_id, event_key, event_type, amount) VALUES (?, ?, ?, ?)', [userId, eventKey, eventType, amount])
    if (!insert.affectedRows) amount = 0
    if (amount) await connection.execute('UPDATE `user` SET xp_points = xp_points + ? WHERE user_id = ?', [amount, userId])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally { connection.release() }
  const newBadges = await evaluateBadges(userId)
  return { earnedXp: amount, newBadges }
}

module.exports = { awardOnce }
