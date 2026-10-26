const policy = require('../../curriculum-policy.json')

function scoreLesson(lessonCompleted, activityRows, bestQuizScore) {
    const score = Number.isFinite(Number(bestQuizScore)) ? Math.max(0, Math.min(100, Number(bestQuizScore))) : 0
    const quizPassed = score >= policy.quizPassScore
    const points = policy.quizWeight * Math.min(1, score / policy.quizPassScore)
    return {
        lessonCompleted,
        activitySubmitted: activityRows.some((row) => row.submission_id != null),
        bestQuizScore: score,
        quizPassed,
        percent: quizPassed ? 100 : Math.min(99.99, Math.round(points * 100) / 100),
    }
}

module.exports = { policy, scoreLesson }
