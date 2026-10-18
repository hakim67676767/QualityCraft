import { useId } from 'react'
import { getLessonQuestionText } from './content/lessonGuides'
import { feedbackExplanation, formatFeedbackAnswer } from './lib/feedback'
import './quiz-feedback.css'

export default function QuizFeedback({ feedback, guide }) {
  const headingId = useId()
  if (!feedback.length) return null
  const correctCount = feedback.filter(item => item.isCorrect).length
  const reviewCount = feedback.length - correctCount

  return <section className="feedback-list quiz-feedback" aria-labelledby={headingId}>
    <header className="quiz-feedback-heading">
      <div><h3 id={headingId}>Answer feedback</h3><p>See what you understood and what to revisit.</p></div>
      <div className="quiz-feedback-counts">
        <span data-state="correct"><span aria-hidden="true">✓</span> {correctCount} correct</span>
        <span data-state="review"><span aria-hidden="true">↺</span> {reviewCount} to review</span>
      </div>
    </header>
    <ol className="quiz-feedback-items">
      {feedback.map((item, index) => {
        const explanation = feedbackExplanation(item)
        return <li className="feedback-item quiz-feedback-card" data-correct={item.isCorrect} key={item.questionId}>
          <div className="quiz-feedback-card-heading">
            <span className="quiz-feedback-number">Question {index + 1}</span>
            <span className="quiz-feedback-status"><span aria-hidden="true">{item.isCorrect ? '✓' : '↺'}</span>{item.isCorrect ? 'Correct' : 'Needs review'}</span>
          </div>
          <h4>{getLessonQuestionText({ question_text: item.question }, guide)}</h4>
          <dl className="quiz-feedback-answers" data-comparison={!item.isCorrect}>
            <div className="quiz-feedback-answer" data-state={item.isCorrect ? 'correct' : 'review'}>
              <dt>Your answer</dt><dd>{formatFeedbackAnswer(item.submittedAnswer, item.type)}</dd>
            </div>
            {!item.isCorrect && <div className="quiz-feedback-answer" data-state="correct">
              <dt>Correct answer</dt><dd>{formatFeedbackAnswer(item.correctAnswer, item.type)}</dd>
            </div>}
          </dl>
          {explanation ? <div className="quiz-feedback-explanation"><p className="quiz-feedback-note-label">Explanation</p><p>{explanation}</p></div>
            : !item.isCorrect && <p className="quiz-feedback-review-note">Review this concept in the lesson before your next attempt.</p>}
        </li>
      })}
    </ol>
    {reviewCount > 0 && <footer className="quiz-feedback-next"><p>Ready to try again? Revisit the lesson, then choose Retake Quiz from your Learning Path.</p><a href="#lesson-reading">Review the lesson <span aria-hidden="true">↑</span></a></footer>}
  </section>
}
