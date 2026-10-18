export function formatFeedbackAnswer(value, type) {
  const answer = String(value ?? '').trim()
  if (!answer) return 'No answer'
  if (type === 'true_false' && /^(true|false)$/i.test(answer)) {
    return answer.toLowerCase() === 'true' ? 'True' : 'False'
  }
  return answer
}

export function feedbackExplanation(item) {
  const explanation = String(item.explanation ?? '').trim()
  const legacyDefault = `The correct answer is "${item.correctAnswer}". Re-read this concept in the lesson before retrying the quiz.`
  // Older installations seeded the same retry instruction for every answer.
  // Keep authored explanations, but don't treat that placeholder as teaching content.
  return explanation && explanation !== legacyDefault ? explanation : ''
}
