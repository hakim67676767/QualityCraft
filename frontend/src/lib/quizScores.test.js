import test from 'node:test'
import assert from 'node:assert/strict'
import { averageBestQuizScore, summarizeQuizAttempts } from './quizScores.js'

test('a lower retake preserves each quiz best score and advances its retake id', () => {
  const attempts = [
    { lesson_id: 1, attempt_id: 10, score: '100.00' },
    { lesson_id: 2, attempt_id: 12, score: 40 },
    { lesson_id: 1, attempt_id: 13, score: 60 },
    { lesson_id: 2, attempt_id: 11, score: 20 },
  ]
  assert.deepEqual(summarizeQuizAttempts(attempts).get(1), { bestScore: 100, latestScore: 60, latestAttemptId: 13 })
  assert.deepEqual(summarizeQuizAttempts(attempts.toReversed()).get(2), { bestScore: 40, latestScore: 40, latestAttemptId: 12 })
  assert.equal(averageBestQuizScore(attempts), 70)
  assert.equal(averageBestQuizScore([]), null)
  assert.equal(averageBestQuizScore([{ lesson_id: 3, attempt_id: 1, score: 0 }]), 0)
})

test('new results update immediately and stale local feedback cannot replace a newer attempt', () => {
  const attempts = [{ lesson_id: 1, attempt_id: 5, score: 100 }]
  const lower = { 1: { attemptId: 6, score: 60, bestScore: 100 } }
  assert.deepEqual(summarizeQuizAttempts(attempts, lower).get(1), { bestScore: 100, latestScore: 60, latestAttemptId: 6 })
  const improved = summarizeQuizAttempts([{ lesson_id: 2, attempt_id: 8, score: 40 }], { 2: { attemptId: 9, score: 80 } })
  assert.equal(improved.get(2).bestScore, 80)
  assert.equal(summarizeQuizAttempts([{ lesson_id: 1, attempt_id: 7, score: 80 }], lower).get(1).latestAttemptId, 7)
  assert.equal(summarizeQuizAttempts([], lower).get(1).bestScore, 100)
})
