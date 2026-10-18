const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { HttpError } = require('../lib/http');
const { gradeSubmission } = require('../lib/grading');
const { requireString, requireOneOf, readOptions } = require('../lib/validation');
const { RATING_OPTIONS, summariseRatings } = require('../lib/understandingSurvey');

async function loadQuestions(phase, instrumentId) {
  if (instrumentId === undefined) {
    const [rows] = await db.promise().execute("SELECT instrument_id FROM `assessment_instrument` WHERE phase = ? AND status = 'published' ORDER BY updated_at DESC, instrument_id DESC LIMIT 1", [phase]);
    instrumentId = rows[0]?.instrument_id || null;
  }
  if (instrumentId !== null) {
    const [rows] = await db.promise().execute(`SELECT ai.item_id AS question_id, ai.instrument_id, ai.construct_key, ai.prompt AS question_text, ai.type, ai.options, ai.answer_key
      FROM \`assessment_item\` ai JOIN \`assessment_instrument\` i ON i.instrument_id = ai.instrument_id
      WHERE i.instrument_id = ? AND i.phase = ? AND i.status IN ('published', 'retired') ORDER BY ai.sequence_no, ai.item_id`, [instrumentId, phase]);
    return rows;
  }
  const [rows] = await db.promise().query('SELECT question_id, NULL AS instrument_id, question_text, type, options, answer_key FROM `question` ORDER BY question_id LIMIT 5');
  return rows;
}

function fingerprint(questions) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(JSON.stringify(questions.map((q) => [q.question_id, q.question_text, q.type, readOptions(q.options), q.answer_key, q.construct_key]))).digest('hex');
}

async function deliverAssessment(userId, phase, retake = false) {
  const questions = await loadQuestions(phase);
  if (!questions.length) throw new HttpError(409, 'No assessment questions are available');
  let lastAttemptId = 0;
  if (retake) {
    if (!questions.every((question) => question.type === 'rating')) throw new HttpError(409, 'Survey retakes require a published rating survey');
    const [original] = await db.promise().execute('SELECT response_id FROM survey_response WHERE user_id = ? AND phase = ? LIMIT 1', [userId, phase]);
    if (!original.length) throw new HttpError(409, 'Complete the original survey before taking a retake');
    const [attempts] = await db.promise().execute('SELECT COALESCE(MAX(assessment_attempt_id), 0) AS latest FROM assessment_attempt WHERE user_id = ? AND phase = ?', [userId, phase]);
    lastAttemptId = Number(attempts[0].latest);
  }
  const assessmentToken = jwt.sign({ purpose: 'assessment', studentId: userId, phase, instrumentId: questions[0].instrument_id, fingerprint: fingerprint(questions), retake, lastAttemptId }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return questions.map(({ answer_key, ...question }) => ({ ...question, options: readOptions(question.options), assessmentToken }));
}

async function submitAssessment(userId, phase, body) {
  let delivery;
  try {
    delivery = jwt.verify(body.assessmentToken, process.env.JWT_SECRET);
  } catch { throw new HttpError(409, 'Reload the assessment before submitting'); }
  if (delivery.purpose !== 'assessment' || delivery.studentId !== userId || delivery.phase !== phase) throw new HttpError(403, 'This assessment belongs to a different student or phase');
  const questions = await loadQuestions(phase, delivery.instrumentId);
  if (!questions.length || delivery.fingerprint !== fingerprint(questions)) throw new HttpError(409, 'The assessment changed. Reload it before submitting');
  const answers = body.answers;
  if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((answer) => typeof answer !== 'string' || !answer.trim())) throw new HttpError(400, 'Answer every assessment question');
  const isRating = questions.every((question) => question.type === 'rating');
  const isRetake = delivery.retake === true;
  if (isRetake && !isRating) throw new HttpError(409, 'Only rating surveys can be retaken');
  if (isRating && answers.some((answer) => !RATING_OPTIONS.includes(answer))) throw new HttpError(400, 'Choose a rating from 1 to 5 for every statement');
  const graded = isRating ? null : gradeSubmission(questions, answers);
  const rating = isRating ? summariseRatings(questions, answers) : null;
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('SELECT user_id FROM `user` WHERE user_id = ? FOR UPDATE', [userId]);
    const [existing] = await connection.execute('SELECT response_id FROM `survey_response` WHERE user_id = ? AND phase = ? LIMIT 1', [userId, phase]);
    if (!isRetake && existing.length) throw new HttpError(409, 'This assessment is already completed. Choose Retake survey to submit a separate response.');
    if (isRetake) {
      if (!existing.length) throw new HttpError(409, 'Complete the original survey before taking a retake');
      const [attempts] = await connection.execute('SELECT COALESCE(MAX(assessment_attempt_id), 0) AS latest FROM assessment_attempt WHERE user_id = ? AND phase = ?', [userId, phase]);
      if (Number(attempts[0].latest) !== delivery.lastAttemptId) throw new HttpError(409, 'This retake has already been submitted or a newer response exists. Start a new retake.');
    } else {
      await connection.execute('INSERT INTO `survey_response` (user_id, phase, score, rating_mean, ratings) VALUES (?, ?, ?, ?, ?)', [userId, phase, graded?.score ?? null, rating?.ratingMean ?? null, rating ? JSON.stringify(rating.ratings) : null]);
    }
    await connection.execute('INSERT INTO `assessment_attempt` (user_id, instrument_id, phase, score, correct_count, total_questions, rating_mean, ratings, is_retake) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [userId, delivery.instrumentId, phase, graded?.score ?? null, graded?.correctAnswers ?? null, questions.length, rating?.ratingMean ?? null, rating ? JSON.stringify(rating.ratings) : null, isRetake]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  if (isRating) return { responseType: 'rating', isRetake, ratingMean: rating.ratingMean, totalQuestions: questions.length, message: isRetake ? 'Your survey retake has been saved separately.' : 'Your understanding survey has been recorded.' };
  return phase === 'pre' ? { score: graded.score, correctAnswers: graded.correctAnswers, totalQuestions: graded.totalQuestions } : graded;
}

function instrumentPayload(body) {
  const phase = requireOneOf(body.phase, ['pre', 'post'], 'Phase');
  const title = requireString(body.title, 'Title', { max: 160 });
  const version = requireString(body.version, 'Version', { max: 30 });
  const status = requireOneOf(body.status || 'draft', ['draft', 'published', 'retired'], 'Status');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new HttpError(400, 'Add between 1 and 100 assessment items');
  const items = body.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new HttpError(400, 'Every assessment item must be an object');
    const type = requireOneOf(item.type || 'multiple_choice', ['multiple_choice', 'true_false', 'short_answer', 'rating'], 'Question type');
    const prompt = requireString(item.prompt, 'Item prompt', { max: 5000 });
    const answerKey = type === 'rating' ? '' : requireString(item.answerKey ?? item.answer_key, 'Answer key', { max: 2000 });
    const options = type === 'rating' ? RATING_OPTIONS : type === 'true_false' ? ['True', 'False'] : type === 'multiple_choice' ? readOptions(item.options) : [];
    if (!['short_answer', 'rating'].includes(type) && (!options.length || options.some((option) => typeof option !== 'string' || !option.trim()) || !options.some((option) => option.toLowerCase() === answerKey.toLowerCase()))) throw new HttpError(400, 'The answer key must match a question option');
    return { type, prompt, answerKey, options, constructKey: String(item.constructKey ?? item.construct_key ?? '').slice(0, 80) };
  });
  const ratingItems = items.filter((item) => item.type === 'rating');
  if (ratingItems.length && ratingItems.length !== items.length) throw new HttpError(400, 'Keep rating statements separate from scored knowledge questions');
  if (ratingItems.length && (ratingItems.some((item) => !item.constructKey.trim()) || new Set(ratingItems.map((item) => item.constructKey)).size !== items.length)) throw new HttpError(400, 'Each rating statement needs a unique learning concept key for pre/post matching');
  return { phase, title, version, status, items };
}

async function writeItems(connection, id, items) {
  for (const [index, item] of items.entries()) await connection.execute('INSERT INTO `assessment_item` (instrument_id, construct_key, type, prompt, options, answer_key, sequence_no) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, item.constructKey || null, item.type, item.prompt, JSON.stringify(item.options), item.answerKey, index + 1]);
}

async function saveInstrument(id, body, userId) {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    // Publication is infrequent; lock the role row so two administrators cannot publish competing active versions.
    await connection.execute("SELECT role_id FROM `role` WHERE role_name = 'administrator' FOR UPDATE");
    let payload;
    if (id) {
      const [rows] = await connection.execute('SELECT * FROM `assessment_instrument` WHERE instrument_id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new HttpError(404, 'Instrument not found');
      const existing = rows[0];
      const [attempts] = await connection.execute('SELECT assessment_attempt_id FROM `assessment_attempt` WHERE instrument_id = ? LIMIT 1', [id]);
      const editsContent = ['phase', 'title', 'version', 'items'].some((key) => Object.hasOwn(body, key));
      const status = requireOneOf(body.status || existing.status, ['draft', 'published', 'retired'], 'Status');
      if ((existing.status !== 'draft' || attempts.length) && (editsContent || status === 'draft')) throw new HttpError(409, 'Published instruments are locked. Copy this instrument to a new version');
      payload = editsContent ? instrumentPayload(body) : { ...existing, status };
      if (editsContent) {
        await connection.execute('UPDATE `assessment_instrument` SET phase = ?, title = ?, version = ?, status = ? WHERE instrument_id = ?', [payload.phase, payload.title, payload.version, payload.status, id]);
        await connection.execute('DELETE FROM `assessment_item` WHERE instrument_id = ?', [id]);
        await writeItems(connection, id, payload.items);
      } else await connection.execute('UPDATE `assessment_instrument` SET status = ? WHERE instrument_id = ?', [status, id]);
    } else {
      payload = instrumentPayload(body);
      const [result] = await connection.execute('INSERT INTO `assessment_instrument` (phase, title, version, status, created_by) VALUES (?, ?, ?, ?, ?)', [payload.phase, payload.title, payload.version, payload.status, userId]);
      id = result.insertId;
      await writeItems(connection, id, payload.items);
    }
    if (payload.status === 'published') await connection.execute("UPDATE `assessment_instrument` SET status = 'retired' WHERE phase = ? AND status = 'published' AND instrument_id <> ?", [payload.phase, id]);
    await connection.commit();
    return { instrumentId: id, phase: payload.phase, title: payload.title, version: payload.version, status: payload.status };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

module.exports = { deliverAssessment, submitAssessment, saveInstrument, instrumentPayload };
