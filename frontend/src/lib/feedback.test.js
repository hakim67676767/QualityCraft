import test from 'node:test'
import assert from 'node:assert/strict'
import { feedbackExplanation, formatFeedbackAnswer } from './feedback.js'

test('feedback presents equivalent boolean answers consistently without changing other responses', () => {
  assert.equal(formatFeedbackAnswer('true', 'true_false'), 'True')
  assert.equal(formatFeedbackAnswer(' FALSE ', 'true_false'), 'False')
  assert.equal(formatFeedbackAnswer(false, 'true_false'), 'False')
  assert.equal(formatFeedbackAnswer(0, 'short_answer'), '0')
  assert.equal(formatFeedbackAnswer('  Test plan  ', 'short_answer'), 'Test plan')
  assert.equal(formatFeedbackAnswer('', 'short_answer'), 'No answer')
})

test('legacy retry placeholder is omitted for either outcome while authored explanations are preserved', () => {
  const placeholder = 'The correct answer is "Unit test". Re-read this concept in the lesson before retrying the quiz.'
  for (const isCorrect of [true, false]) {
    assert.equal(feedbackExplanation({ explanation: placeholder, correctAnswer: 'Unit test', isCorrect }), '')
    assert.equal(feedbackExplanation({ explanation: 'Unit testing checks one component in isolation.', correctAnswer: 'Unit test', isCorrect }), 'Unit testing checks one component in isolation.')
  }
  assert.equal(feedbackExplanation({ correctAnswer: 'Unit test' }), '')
  const similarAuthoredNote = 'The correct answer is "Unit test". Re-read the example about component isolation.'
  assert.equal(feedbackExplanation({ explanation: similarAuthoredNote, correctAnswer: 'Unit test' }), similarAuthoredNote)
})
