const { SURVEY_VERSION, SURVEY_ITEMS, RATING_OPTIONS } = require('../lib/understandingSurvey');

// Adds a default only where no published instrument exists; never replaces an
// administrator's version or changes questions attached to earlier responses.
async function seedUnderstandingSurveys(pool) {
  const connection = await pool.getConnection();
  const created = [];
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT role_id FROM `role` WHERE role_name = 'administrator' FOR UPDATE");
    for (const phase of ['pre', 'post']) {
      const [existing] = await connection.execute("SELECT instrument_id FROM assessment_instrument WHERE phase = ? AND (status = 'published' OR version = ?) LIMIT 1", [phase, SURVEY_VERSION]);
      if (existing.length) continue;
      const [result] = await connection.execute("INSERT INTO assessment_instrument (phase, title, version, status) VALUES (?, ?, ?, 'published')", [phase, `Software testing understanding — ${phase === 'pre' ? 'before learning' : 'after learning'}`, SURVEY_VERSION]);
      for (const [index, [key, prompt]] of SURVEY_ITEMS.entries()) {
        await connection.execute("INSERT INTO assessment_item (instrument_id, construct_key, type, prompt, options, answer_key, sequence_no) VALUES (?, ?, 'rating', ?, ?, '', ?)", [result.insertId, key, prompt, JSON.stringify(RATING_OPTIONS), index + 1]);
      }
      created.push(`${phase} understanding survey ${SURVEY_VERSION}`);
    }
    await connection.commit();
    return created;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { seedUnderstandingSurveys };
