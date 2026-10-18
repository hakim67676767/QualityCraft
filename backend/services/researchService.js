const crypto = require('node:crypto');

const REQUIRED_CONSENTS = [
  ['guardianConsent', 'guardian_consent'],
  ['studentAssent', 'student_assent'],
  ['schoolPermission', 'school_permission'],
];

function readFirst(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined) return source[key];
  }
  return undefined;
}

function isGranted(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function validateConsent(input = {}) {
  const errors = [];
  for (const [camelKey, snakeKey] of REQUIRED_CONSENTS) {
    if (!isGranted(readFirst(input, [camelKey, snakeKey]))) errors.push(camelKey);
  }

  return { valid: errors.length === 0, errors };
}

function generateStudyCode(existingCodes = []) {
  const used = new Set(Array.from(existingCodes, (code) => String(code).toUpperCase()));
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = `QC-${crypto.randomBytes(5).toString('hex').slice(0, 8).toUpperCase()}`;
    if (!used.has(code)) return code;
  }
  throw new Error('Unable to generate a unique study code');
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? null
    : Math.round((value + Number.EPSILON) * 100) / 100;
}

function mean(values) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sampleStandardDeviation(values) {
  if (values.length < 2) return null;
  const average = mean(values);
  const variance = values.reduce((total, value) => total + ((value - average) ** 2), 0)
    / (values.length - 1);
  return Math.sqrt(variance);
}

function interquartileRange(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return 0;
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, middle);
  const upper = sorted.slice(sorted.length % 2 ? middle + 1 : middle);
  return median(upper) - median(lower);
}

function isAuthorised(record) {
  const status = String(readFirst(record, ['status', 'researchStatus', 'research_status']) || '').toLowerCase();
  return ['authorised', 'authorized'].includes(status) && validateConsent(record).valid;
}

function normaliseSuitability(raw) {
  let responses = raw;
  if (typeof responses === 'string') {
    try {
      responses = JSON.parse(responses);
    } catch {
      return [];
    }
  }

  if (Array.isArray(responses)) {
    return responses.flatMap((entry, index) => {
      if (entry && typeof entry === 'object') {
        const item = readFirst(entry, ['item', 'itemKey', 'questionId', 'question_id', 'construct']) || `item_${index + 1}`;
        return [{ item: String(item), value: finiteNumber(readFirst(entry, ['value', 'response', 'score', 'rating'])) }];
      }
      return [{ item: `item_${index + 1}`, value: finiteNumber(entry) }];
    });
  }

  if (responses && typeof responses === 'object') {
    return Object.entries(responses).map(([item, value]) => ({ item, value: finiteNumber(value) }));
  }
  return [];
}

function frequency(values) {
  const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const value of values) {
    if (Number.isInteger(value) && value >= 1 && value <= 5) result[value] += 1;
  }
  return result;
}

function summarizeSuitability(records) {
  const byItemValues = new Map();
  const allValues = [];

  for (const record of records) {
    const raw = readFirst(record, ['suitabilityResponses', 'suitability_responses', 'suitability']);
    for (const { item, value } of normaliseSuitability(raw)) {
      if (!Number.isInteger(value) || value < 1 || value > 5) continue;
      allValues.push(value);
      if (!byItemValues.has(item)) byItemValues.set(item, []);
      byItemValues.get(item).push(value);
    }
  }

  const byItem = {};
  for (const [item, values] of byItemValues) {
    byItem[item] = {
      responseCount: values.length,
      average: round(mean(values)),
      frequency: frequency(values),
    };
  }

  return {
    responseCount: allValues.length,
    average: round(mean(allValues)),
    frequency: frequency(allValues),
    byItem,
  };
}

function summarizePairedRecords(records = []) {
  const safeRecords = Array.isArray(records) ? records : [];
  const authorised = safeRecords.filter(isAuthorised);
  const pairs = authorised.flatMap((record) => {
    const pre = finiteNumber(readFirst(record, ['preScore', 'pre_score', 'pre']));
    const post = finiteNumber(readFirst(record, ['postScore', 'post_score', 'post']));
    return pre === null || post === null ? [] : [{ pre, post, gain: post - pre, preVersion: record.pre_instrument_version || 'Legacy quiz questions', postVersion: record.post_instrument_version || 'Legacy quiz questions' }];
  });

  const preScores = pairs.map((pair) => pair.pre);
  const postScores = pairs.map((pair) => pair.post);
  const gains = pairs.map((pair) => pair.gain);
  const percentChanges = pairs
    .filter((pair) => pair.pre > 0)
    .map((pair) => (pair.gain / pair.pre) * 100);
  const instrumentGroups = [];
  for (const pair of pairs) {
    const group = instrumentGroups.find((item) => item.preVersion === pair.preVersion && item.postVersion === pair.postVersion);
    if (group) group.pairs++;
    else instrumentGroups.push({ preVersion: pair.preVersion, postVersion: pair.postVersion, pairs: 1 });
  }

  return {
    authorisedParticipantCount: authorised.length,
    validPairCount: pairs.length,
    instrumentGroups,
    incompletePairCount: authorised.length - pairs.length,
    excludedParticipantCount: safeRecords.length - authorised.length,
    pre: { mean: round(mean(preScores)), median: round(median(preScores)) },
    post: { mean: round(mean(postScores)), median: round(median(postScores)) },
    gain: {
      mean: round(mean(gains)),
      median: round(median(gains)),
      sampleStandardDeviation: round(sampleStandardDeviation(gains)),
      interquartileRange: round(interquartileRange(gains)),
      averagePercentChange: round(mean(percentChanges)),
    },
    suitability: summarizeSuitability(authorised),
  };
}

function readRatings(raw) {
  let items = raw;
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch { return []; } }
  if (!Array.isArray(items) || !items.length) return [];
  if (items.some((item) => !item || typeof item.constructKey !== 'string' || !item.constructKey.trim() || typeof item.statement !== 'string' || !Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5)) return [];
  if (new Set(items.map((item) => item.constructKey)).size !== items.length) return [];
  return items;
}

function summarizeUnderstanding(records = []) {
  const eligible = records.filter(isAuthorised);
  const pairs = [];
  const byItem = new Map();
  let responseCount = 0;
  let incompatiblePairs = 0;
  for (const record of eligible) {
    const pre = readRatings(record.pre_ratings);
    const post = readRatings(record.post_ratings);
    responseCount += Number(pre.length > 0) + Number(post.length > 0);
    if (!pre.length || !post.length) continue;
    const postByKey = new Map(post.map((item) => [item.constructKey, item]));
    if (pre.length !== post.length || pre.some((item) => postByKey.get(item.constructKey)?.statement !== item.statement)) { incompatiblePairs++; continue; }
    const before = mean(pre.map((item) => item.rating));
    const after = mean(post.map((item) => item.rating));
    pairs.push({ pre: before, post: after, change: after - before, preVersion: record.pre_instrument_version, postVersion: record.post_instrument_version });
    for (const item of pre) {
      const rowKey = JSON.stringify([item.constructKey, item.statement]);
      if (!byItem.has(rowKey)) byItem.set(rowKey, { key: item.constructKey, statement: item.statement, pre: [], post: [] });
      const group = byItem.get(rowKey);
      group.pre.push(item.rating);
      group.post.push(postByKey.get(item.constructKey).rating);
    }
  }
  return {
    scale: '1–5 agreement rating', measure: 'Self-reported understanding',
    eligibleParticipants: eligible.length, responseCount, validPairs: pairs.length, incompatiblePairs,
    incompleteCount: eligible.length - pairs.length,
    preMean: round(mean(pairs.map((pair) => pair.pre))), postMean: round(mean(pairs.map((pair) => pair.post))),
    averageChange: round(mean(pairs.map((pair) => pair.change))),
    items: [...byItem.values()].map((item) => ({ key: item.key, statement: item.statement, pairs: item.pre.length, preMean: round(mean(item.pre)), postMean: round(mean(item.post)), change: round(mean(item.post) - mean(item.pre)), preFrequency: frequency(item.pre), postFrequency: frequency(item.post) })),
  };
}

module.exports = {
  isAuthorised,
  generateStudyCode,
  summarizePairedRecords,
  validateConsent,
  summarizeUnderstanding,
};
