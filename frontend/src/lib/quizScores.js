// Keep the highest grade separate from the latest attempt used to start a retake.
export function summarizeQuizAttempts(attempts, results = {}) {
  const summaries = new Map()
  const pending = Object.entries(results).map(([lessonId, result]) => ({
    lesson_id: lessonId, attempt_id: result.attemptId, score: result.score, bestScore: result.bestScore,
  }))
  for (const attempt of [...attempts, ...pending]) {
    const lessonId = Number(attempt.lesson_id)
    const score = Number(attempt.score)
    if (!Number.isFinite(score)) continue
    const current = summaries.get(lessonId)
    const latest = !current || Number(attempt.attempt_id) > current.latestAttemptId
    summaries.set(lessonId, {
      bestScore: Math.max(current?.bestScore ?? score, score, Number(attempt.bestScore) || 0),
      latestScore: latest ? score : current.latestScore,
      latestAttemptId: latest ? Number(attempt.attempt_id) : current.latestAttemptId,
    })
  }
  return summaries
}

export function averageBestQuizScore(attempts) {
  const scores = [...summarizeQuizAttempts(attempts).values()]
  return scores.length ? Math.round(scores.reduce((sum, quiz) => sum + quiz.bestScore, 0) / scores.length) : null
}
