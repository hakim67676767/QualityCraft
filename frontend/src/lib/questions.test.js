import test from 'node:test'
import assert from 'node:assert/strict'
import { readQuestionOptions } from './questions.js'

test('assessment arrays and legacy quiz JSON produce the same choices', () => {
  assert.deepEqual(readQuestionOptions(['A', 'B']), ['A', 'B'])
  assert.deepEqual(readQuestionOptions('["A","B"]'), ['A', 'B'])
  for (const value of [null, undefined, '', '{broken', '{"value":1}', 1]) assert.deepEqual(readQuestionOptions(value), [])
})
