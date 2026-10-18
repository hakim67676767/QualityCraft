const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeUnderstanding, summarizePairedRecords } = require('../services/researchService');
const { SURVEY_ITEMS, summariseRatings } = require('../lib/understandingSurvey');

const consent = { status: 'authorised', guardian_consent: 1, student_assent: 1, school_permission: 1 };
function ratings(values) { return values.map((rating, index) => ({ constructKey: `concept_${index}`, statement: `Statement ${index}`, rating })); }

test('paired understanding matches concepts independently of item order and stays on the 1–5 scale', () => {
  const result = summarizeUnderstanding([{ ...consent, pre_ratings: ratings([1, 3]), post_ratings: ratings([3, 5]).reverse() }]);
  assert.equal(result.validPairs, 1);
  assert.equal(result.preMean, 2);
  assert.equal(result.postMean, 4);
  assert.equal(result.averageChange, 2);
  assert.equal(result.items[0].change, 2);
  assert.equal(result.items[1].postFrequency[5], 1);
  assert.equal(summarizePairedRecords([{ ...consent, pre_ratings: ratings([1]), post_ratings: ratings([5]), pre_score: null, post_score: null }]).validPairCount, 0);
});

test('withdrawal, incomplete responses, changed statements and invalid ratings never create matched pairs', () => {
  const original = ratings([2]);
  const result = summarizeUnderstanding([
    { ...consent, status: 'withdrawn', pre_ratings: original, post_ratings: ratings([4]) },
    { ...consent, pre_ratings: original },
    { ...consent, pre_ratings: original, post_ratings: [{ ...original[0], statement: 'Different construct wording', rating: 5 }] },
    { ...consent, pre_ratings: ratings([0]), post_ratings: ratings([6]) },
  ]);
  assert.equal(result.validPairs, 0);
  assert.equal(result.incompatiblePairs, 1);
  assert.equal(result.averageChange, null);
  assert.deepEqual(result.items, []);
  assert.equal(result.eligibleParticipants, 3);
});

test('default statements are distinct and response snapshots retain the statement and concept', () => {
  assert.equal(SURVEY_ITEMS.length, 10);
  assert.equal(new Set(SURVEY_ITEMS.map(([key]) => key)).size, 10);
  const result = summariseRatings([{ question_id: 42, construct_key: 'testing_purpose', question_text: SURVEY_ITEMS[0][1] }], ['3']);
  assert.equal(result.ratingMean, 3);
  assert.deepEqual(result.ratings[0], { itemId: 42, constructKey: 'testing_purpose', statement: SURVEY_ITEMS[0][1], rating: 3 });
});
