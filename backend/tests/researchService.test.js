const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateStudyCode,
  summarizePairedRecords,
  validateConsent,
} = require('../services/researchService');

test('validateConsent requires guardian consent, student assent, and school permission', () => {
  assert.deepEqual(validateConsent({
    guardianConsent: true,
    studentAssent: true,
    schoolPermission: true,
  }), { valid: true, errors: [] });

  assert.deepEqual(validateConsent({ guardian_consent: 1, student_assent: 0 }), {
    valid: false,
    errors: ['studentAssent', 'schoolPermission'],
  });
});

test('generateStudyCode creates an opaque uppercase code and avoids supplied codes', () => {
  const first = generateStudyCode();
  const second = generateStudyCode([first.toLowerCase()]);
  assert.match(first, /^QC-[0-9A-F]{8}$/);
  assert.match(second, /^QC-[0-9A-F]{8}$/);
  assert.notEqual(second, first);
});

test('summarizePairedRecords reports paired outcomes without returning participant details', () => {
  const result = summarizePairedRecords([
    {
      name: 'Must not leak', email: 'private@example.com', status: 'authorised',
      preScore: 40, postScore: 60, suitabilityResponses: { usability: 4, usefulness: 5 },
    },
    {
      status: 'authorized', pre_score: 60, post_score: 90,
      suitability_responses: [{ item: 'usability', value: 5 }, { item: 'usefulness', value: 3 }],
    },
    { status: 'authorised', preScore: 80, postScore: null, suitabilityResponses: [3] },
    { status: 'pending', preScore: 20, postScore: 100, suitabilityResponses: [5] },
  ].map((record) => ({ guardianConsent: true, studentAssent: true, schoolPermission: true, ...record })));

  assert.equal(result.authorisedParticipantCount, 3);
  assert.equal(result.validPairCount, 2);
  assert.equal(result.incompletePairCount, 1);
  assert.equal(result.excludedParticipantCount, 1);
  assert.deepEqual(result.pre, { mean: 50, median: 50 });
  assert.deepEqual(result.post, { mean: 75, median: 75 });
  assert.deepEqual(result.gain, {
    mean: 25,
    median: 25,
    sampleStandardDeviation: 7.07,
    interquartileRange: 10,
    averagePercentChange: 50,
  });
  assert.equal(result.suitability.responseCount, 5);
  assert.equal(result.suitability.average, 4);
  assert.deepEqual(result.suitability.frequency, { 1: 0, 2: 0, 3: 2, 4: 1, 5: 2 });
  assert.equal(result.suitability.byItem.usability.average, 4.5);
  assert.equal(JSON.stringify(result).includes('private@example.com'), false);
  assert.equal(JSON.stringify(result).includes('Must not leak'), false);
});

test('summarizePairedRecords handles empty data and zero pre-test scores safely', () => {
  const empty = summarizePairedRecords([]);
  assert.equal(empty.validPairCount, 0);
  assert.equal(empty.gain.mean, null);
  assert.equal(empty.gain.sampleStandardDeviation, null);
  assert.equal(empty.suitability.average, null);

  const zeroPre = summarizePairedRecords([{
    status: 'authorised',
    guardianConsent: true,
    studentAssent: true,
    schoolPermission: true,
    pre: 0,
    post: 20,
  }]);
  assert.equal(zeroPre.validPairCount, 1);
  assert.equal(zeroPre.gain.averagePercentChange, null);
});

test('withdrawn and pending statuses override historical consent, and missing consent excludes an authorised record', () => {
  const consent = { guardianConsent: true, studentAssent: true, schoolPermission: true, pre: 20, post: 100 };
  const summary = summarizePairedRecords([
    { ...consent, status: 'withdrawn' },
    { ...consent, status: 'pending' },
    { ...consent, status: 'authorised', studentAssent: false },
    { ...consent, status: 'authorised' },
  ]);
  assert.equal(summary.authorisedParticipantCount, 1);
  assert.equal(summary.validPairCount, 1);
  assert.equal(summary.excludedParticipantCount, 3);
});
