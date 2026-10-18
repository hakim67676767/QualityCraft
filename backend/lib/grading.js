// Pure grading logic shared by the pre-test, lesson quizzes and the post-test.
//
// Keeping this free of database access makes the feedback rules easy to reason
// about and reuse: callers pass in the question rows and the submitted answers.

const { answersMatch, readOptions } = require("./validation")

function gradeAnswers(questions, answers) {
    // A missing answers array must not crash the caller: an unanswered submission
    // should be graded as all-wrong, not throw a TypeError.
    const submitted = Array.isArray(answers) ? answers : []

    return questions.map((question, index) => {
        const submittedAnswer = String(submitted[index] ?? "").trim()
        const isCorrect = answersMatch(submittedAnswer, question.answer_key)

        return {
            questionId: question.question_id,
            question: question.question_text,
            type: question.type,
            options: readOptions(question.options),
            submittedAnswer,
            correctAnswer: question.answer_key,
            isCorrect,
            explanation: question.explanation || null,
            message: buildMessage(question, isCorrect),
        }
    })
}

// Grades a submission and computes the score in one call, which is what every
// route needs. Keeping this here means the pre-test, the lesson quizzes and the
// post-test cannot drift apart in how they score or word feedback.
function gradeSubmission(questions, answers) {
    const feedback = gradeAnswers(questions, answers)
    return { feedback, ...summarise(feedback) }
}

// Feedback wording is tailored to the question type so a short-answer prompt does
// not read as if the student failed to pick a radio button.
function buildMessage(question, isCorrect) {
    if (isCorrect) {
        return question.type === "short_answer"
            ? "Correct. Your wording matched the expected answer."
            : "Correct. You selected the right option."
    }

    if (question.type === "short_answer") {
        return `Not quite. The expected answer was "${question.answer_key}".`
    }
    return `Not quite. The correct option was "${question.answer_key}".`
}

function summarise(feedback) {
    if (!Array.isArray(feedback)) throw new TypeError("summarise() expects the feedback array from gradeAnswers()")

    const correctAnswers = feedback.filter((item) => item.isCorrect).length
    const totalQuestions = feedback.length
    const score = totalQuestions ? Math.round((correctAnswers / totalQuestions) * 100 * 100) / 100 : 0
    return { correctAnswers, totalQuestions, score }
}

module.exports = { gradeAnswers, gradeSubmission, summarise, buildMessage }
