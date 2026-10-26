import { useState } from 'react'
import curriculumPolicy from '../../curriculum-policy.json'
import './learning-path.css'
import LessonStudyGuide from './LessonStudyGuide'
import QuizFeedback from './QuizFeedback'
import { summarizeQuizAttempts } from './lib/quizScores'
import { getLessonGuide, getGuideReadingMinutes, getLessonQuestionText } from './content/lessonGuides'

export default function LearningPath({ questions, activities, attempts, journey, error, onXpEarned, ActivityForm, QuestionControl, onNavigate }) {
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  const [selectedLessonId, setSelectedLessonId] = useState(null)
  const [completedLessons, setCompletedLessons] = useState([])
  const [markingLesson, setMarkingLesson] = useState(null)
  const [lessonError, setLessonError] = useState('')
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [submitting, setSubmitting] = useState(null)
  const [retakeLessonId, setRetakeLessonId] = useState(null)
  const [quizError, setQuizError] = useState('')

  const lessonMap = new Map()
  for (const question of questions) {
    const lessonId = Number(question.lesson_id)
    if (!lessonMap.has(lessonId)) {
      lessonMap.set(lessonId, {
        lessonId,
        moduleId: Number(question.module_id),
        moduleTitle: question.module_title,
        title: question.lesson_title,
        content: question.lesson_content,
        completed: Boolean(Number(question.lesson_completed)),
        questions: [],
      })
    }
    lessonMap.get(lessonId).questions.push(question)
  }
  const lessons = [...lessonMap.values()]
  const moduleMap = new Map()
  for (const lesson of lessons) {
    if (!moduleMap.has(lesson.moduleId)) moduleMap.set(lesson.moduleId, { id: lesson.moduleId, title: lesson.moduleTitle, difficulty: curriculumPolicy.modules.find((item) => item.title === lesson.moduleTitle)?.difficulty || '', lessons: [] })
    moduleMap.get(lesson.moduleId).lessons.push(lesson)
  }
  const modules = [...moduleMap.values()]
  const quizSummaries = summarizeQuizAttempts(attempts, results)
  const selectedModule = modules.find((module) => module.id === selectedModuleId)
  const selectedLesson = selectedModule?.lessons.find((lesson) => lesson.lessonId === selectedLessonId)
  const lessonIsComplete = (lesson) => lesson.completed || completedLessons.includes(lesson.lessonId)

  function startRetake(moduleId, lessonId) {
    openModule(moduleId, lessonId)
    setRetakeLessonId(lessonId)
    setLessonError('')
    setQuizError('')
    const lesson = lessons.find((item) => item.lessonId === lessonId)
    setAnswers((current) => {
      const next = { ...current }
      for (const question of lesson?.questions || []) delete next[question.question_id]
      return next
    })
  }

  async function completeLesson(lesson) {
    setMarkingLesson(lesson.lessonId)
    setLessonError('')
    try {
      const response = await fetch(`/api/lessons/${lesson.lessonId}/complete`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to complete lesson')
      setCompletedLessons((current) => current.includes(lesson.lessonId) ? current : [...current, lesson.lessonId])
      await onXpEarned()
    } catch (failure) {
      setLessonError(failure.message)
    } finally {
      setMarkingLesson(null)
    }
  }

  async function submitQuiz(lesson) {
    if (submitting || (quizSummaries.has(lesson.lessonId) && retakeLessonId !== lesson.lessonId)) return
    setSubmitting(lesson.lessonId)
    setQuizError('')
    try {
      const response = await fetch(retakeLessonId === lesson.lessonId ? '/api/quiz-attempts/retake' : '/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.lessonId, previousAttemptId: retakeLessonId === lesson.lessonId ? quizSummaries.get(lesson.lessonId)?.latestAttemptId : undefined, answers: lesson.questions.map((question) => answers[question.question_id] || '') }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to submit quiz')
      setResults((current) => ({ ...current, [lesson.lessonId]: data }))
      setRetakeLessonId(null)
      await onXpEarned(data)
    } catch (failure) {
      setQuizError(failure.message)
    } finally {
      setSubmitting(null)
    }
  }

  const isUnlocked = (id) => journey?.unlockedModuleIds?.some((value) => Number(value) === id)
  const isModuleComplete = (id) => journey?.completedModuleIds?.some((value) => Number(value) === id)
  function moduleDetails(module) {
    const ids = new Set(module.lessons.map((lesson) => lesson.lessonId))
    const practicals = activities.filter((activity) => ids.has(Number(activity.lesson_id)))
    const passed = module.lessons.filter((lesson) => (quizSummaries.get(lesson.lessonId)?.bestScore ?? 0) >= curriculumPolicy.quizPassScore).length
    const totalSteps = module.lessons.length
    const finishedSteps = passed
    const progressPoints = module.lessons.reduce((sum, lesson) => sum + curriculumPolicy.quizWeight * Math.min(1, (quizSummaries.get(lesson.lessonId)?.bestScore || 0) / curriculumPolicy.quizPassScore), 0)
    const minutes = module.lessons.reduce((sum, lesson) => {
      const lessonGuide = getLessonGuide(lesson.moduleTitle, lesson.title)
      return sum + (lessonGuide ? getGuideReadingMinutes(lessonGuide, lesson.content) : Math.max(1, Math.ceil((lesson.content || '').split(/\s+/).length / 200)))
    }, 0)
    const firstGuide = getLessonGuide(module.title, module.lessons[0]?.title)
    return { practicals, passed, totalSteps, finishedSteps, minutes, objective: firstGuide?.objectives[0], percent: isModuleComplete(module.id) ? 100 : module.lessons.length ? Math.min(99.99, Math.round(progressPoints / module.lessons.length * 100) / 100) : 0 }
  }
  function openModule(moduleId, lessonId = null) {
    window.scrollTo(0, 0)
    setSelectedModuleId(moduleId)
    setSelectedLessonId(lessonId)
    setRetakeLessonId(null)
    setLessonError('')
    setQuizError('')
  }
  const completedCount = modules.filter((module) => isModuleComplete(module.id)).length
  const coursePercent = modules.length ? Math.round(completedCount / modules.length * 100) : 0
  const nextModule = modules.find((module) => isUnlocked(module.id) && !isModuleComplete(module.id))
  const assignedActivities = activities.filter((activity) => activity.assignments?.length)
  const iconNames = ['shield.svg', 'progress.svg', 'learning.svg', 'quiz.svg', 'badges.svg']

  if (!selectedModule) return <div className="dashboard-content learning-page learning-studio">
    <header className="course-intro"><div><span className="eyebrow">Your software-testing journey</span><h2>Build skills. Put them to the test.</h2><p>Follow the modules, try the practical activities, and turn each new idea into a skill.</p></div><span className="course-level">Beginner friendly</span></header>
    {error && <p className="error-message" role="alert">{error}</p>}
    <section className="course-overview" aria-label="Your course progress"><div className="course-overview-main"><span className="course-overline">YOUR LEARNING PATH</span><h3>{completedCount === modules.length && modules.length ? 'Look how far you’ve come.' : completedCount ? 'Keep your momentum going.' : 'A good place to begin.'}</h3><p>{completedCount === modules.length && modules.length ? 'Every module is complete. Your testing skills are ready to put into practice.' : 'Learn at your own pace. Each completed module opens the next step in your journey.'}</p><div className="course-overview-counts"><span><strong>{modules.length}</strong> modules</span><span><strong>{lessons.length}</strong> lessons</span><span><strong>{activities.length}</strong> practical activities</span></div>{nextModule && <div className="course-overview-action"><div><small>Up next</small><strong>{nextModule.title}</strong></div><button type="button" className="primary-small" onClick={() => openModule(nextModule.id)}>{moduleDetails(nextModule).finishedSteps ? 'Continue learning' : 'Start learning'} <span aria-hidden="true">→</span></button></div>}{!nextModule && modules.length > 0 && onNavigate && <div className="course-overview-action"><button type="button" className="primary-small" onClick={() => onNavigate(journey?.postTestDone ? 'surveys' : 'post-test')}>{journey?.postTestDone ? 'View survey results' : 'Open post-test survey'} <span aria-hidden="true">→</span></button></div>}</div><div className="course-overview-progress"><span>Overall completion</span><strong>{coursePercent}<small>%</small></strong><progress value={completedCount} max={Math.max(1, modules.length)} aria-label="Modules completed" /><p>{completedCount} of {modules.length} modules completed</p></div></section>
    <div className="course-layout"><section className="course-roadmap" aria-labelledby="course-modules-heading" id="course-modules"><div className="course-section-heading"><div><h3 id="course-modules-heading">Your module roadmap</h3><p>One focused step at a time.</p></div><span>{completedCount}/{modules.length} complete</span></div>
      <ol className="learning-path">{modules.map((module, index) => {
        const unlocked = isUnlocked(module.id)
        const completed = isModuleComplete(module.id)
        const detail = moduleDetails(module)
        const state = completed ? 'complete' : nextModule?.id === module.id ? 'current' : unlocked ? 'available' : 'locked'
        const previous = modules[index - 1]
        return <li className="path-step" data-state={state} key={module.id}>
          <span className="path-number" aria-hidden="true">{completed ? '✓' : String(index + 1).padStart(2, '0')}</span>
          <div className="path-card-wrap"><button type="button" className="path-card" data-state={state} disabled={!unlocked} onClick={() => openModule(module.id)} aria-describedby={!unlocked ? `module-lock-${module.id}` : undefined}>
            <span className="path-card-top"><span className="course-module-icon"><img src={`/streamline/${iconNames[index % iconNames.length]}`} alt="" /></span><span className="course-module-copy"><small>MODULE {String(index + 1).padStart(2, '0')}{module.difficulty ? ` - ${module.difficulty}` : ''}</small><strong>{module.title}</strong></span><span className="course-state">{completed ? 'Completed' : state === 'current' ? 'Up next' : unlocked ? 'Available' : 'Locked'}</span></span>
            <span className="course-module-description">{detail.objective || 'Study the lesson, apply the ideas, and check your understanding.'}</span>
            <span className="course-module-meta"><span>{module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}</span><span>{detail.practicals.length} {detail.practicals.length === 1 ? 'activity' : 'activities'}</span><span>~{detail.minutes} min reading</span></span>
            <span className="course-module-progress"><progress value={detail.percent} max="100" aria-label={`${module.title} progress`} /><span>{detail.percent}%</span></span>
            <span className="path-card-bottom">{completed ? 'Review module' : unlocked ? detail.finishedSteps ? 'Continue module' : 'Start module' : 'Complete the previous module'}{unlocked && <span aria-hidden="true">↗</span>}</span>
          </button>
          {!unlocked && <p className="course-lock-reason" id={`module-lock-${module.id}`}>Finish {previous?.title || 'the previous module'}: score at least {curriculumPolicy.quizPassScore}% on each MCQ quiz. Practical activities are optional.</p>}
          {unlocked && module.lessons.some((lesson) => quizSummaries.has(lesson.lessonId)) && <div className="path-retakes">{module.lessons.filter((lesson) => quizSummaries.has(lesson.lessonId)).map((lesson) => <div className="path-retake" key={lesson.lessonId}><span>{lesson.title} <strong>Best quiz: {quizSummaries.get(lesson.lessonId).bestScore}%</strong></span><button type="button" onClick={() => startRetake(module.id, lesson.lessonId)}>Retake Quiz</button></div>)}</div>}
          </div>
        </li>
      })}</ol>
      {!modules.length && <div className="course-empty"><h3>Your learning path is getting ready.</h3><p>Modules appear after you join a class and complete the pre-test survey.</p>{onNavigate && <button type="button" className="secondary-small" onClick={() => onNavigate('classes')}>Open your classes</button>}</div>}
    </section>
    <aside className="course-side"><section className="course-next-card" aria-labelledby="course-next-heading"><span className="course-overline">{nextModule ? 'YOUR NEXT STEP' : 'THE NEXT CHAPTER'}</span><span className="course-next-icon" aria-hidden="true"><img src="/streamline/learning.svg" alt="" /></span><h3 id="course-next-heading">{nextModule?.title || (modules.length ? 'Your path is complete.' : 'Your first module is on its way.')}</h3><p>{nextModule ? moduleDetails(nextModule).objective || 'Pick up where you left off and build your testing skills.' : modules.length ? journey?.postTestDone ? 'Review what you have learned, or look back at your survey responses.' : 'You have finished the modules. Reflect on your understanding in the post-test survey.' : 'Your teacher will help you get started.'}</p>{nextModule ? <button type="button" className="primary-small" onClick={() => openModule(nextModule.id)}>{moduleDetails(nextModule).finishedSteps ? 'Continue learning' : 'Start learning'} <span aria-hidden="true">→</span></button> : modules.length > 0 && onNavigate && <button type="button" className="primary-small" onClick={() => onNavigate(journey?.postTestDone ? 'surveys' : 'post-test')}>{journey?.postTestDone ? 'View survey results' : 'Open post-test survey'} <span aria-hidden="true">→</span></button>}</section>
    <section className="course-method"><h3>How each module works</h3><ol><li><span aria-hidden="true">1</span><div><strong>Learn the concept</strong><p>Read the lesson and explore the examples.</p></div></li><li><span aria-hidden="true">2</span><div><strong>Put it into practice</strong><p>Try the optional practical activities. You can skip them.</p></div></li><li><span aria-hidden="true">3</span><div><strong>Check your understanding</strong><p>Score at least {curriculumPolicy.quizPassScore}% on each MCQ quiz to move forward. You can retake quizzes.</p></div></li></ol></section>
    </aside></div>
    {assignedActivities.length > 0 && <section className="panel assigned-activities course-assignments" aria-label="Class assignments"><div className="course-section-heading"><div><span className="course-overline">FROM YOUR TEACHER</span><h3>Your class assignments</h3><p>Due dates are reminders. Follow the roadmap to unlock each activity.</p></div><span>{assignedActivities.length} {assignedActivities.length === 1 ? 'activity' : 'activities'}</span></div>{assignedActivities.map((activity) => {
      const lesson = lessons.find((item) => item.lessonId === Number(activity.lesson_id))
      const unlocked = isUnlocked(lesson?.moduleId)
      return <article key={activity.activity_id}><span className="course-assignment-icon" aria-hidden="true"><img src="/streamline/quiz.svg" alt="" /></span><div><strong>{activity.title}</strong>{activity.assignments.map((assignment) => <small key={assignment.assignment_id}>{assignment.class_name} · {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleString()}` : 'No due date'}</small>)}</div><span className="course-assignment-status">{activity.submission_id ? 'Submitted' : unlocked ? 'Ready to start' : 'Module locked'}</span><button type="button" className="secondary-small" disabled={!unlocked} onClick={() => openModule(lesson.moduleId, lesson.lessonId)}>{!unlocked ? 'Complete earlier modules' : activity.submission_id ? 'View submission' : 'Open activity'}</button></article>
    })}</section>}
  </div>

  if (!selectedLesson) {
    const detail = moduleDetails(selectedModule)
    return <div className="dashboard-content learning-page learning-studio module-studio">
      <button type="button" className="back-link" onClick={() => openModule(null)}>← Back to Learning Path</button>
      <header className="course-intro"><div><span className="eyebrow">Module {modules.findIndex((module) => module.id === selectedModule.id) + 1} of {modules.length}</span><h2>{selectedModule.title}</h2><p>{detail.objective || 'Read the lessons, apply the concepts, and check your understanding.'}</p></div><span className="course-state" data-complete={isModuleComplete(selectedModule.id)}>{isModuleComplete(selectedModule.id) ? 'Completed' : 'In progress'}</span></header>
      <div className="module-studio-layout"><section aria-labelledby="module-lessons-heading"><div className="course-section-heading"><div><h3 id="module-lessons-heading">Inside this module</h3><p>{selectedModule.lessons.length} {selectedModule.lessons.length === 1 ? 'lesson' : 'lessons'} · {detail.practicals.length} practical {detail.practicals.length === 1 ? 'activity' : 'activities'} · ~{detail.minutes} min reading</p></div></div>
        <div className="lesson-list">{selectedModule.lessons.map((lesson, index) => {
          const attempt = quizSummaries.get(lesson.lessonId)
          const practicals = activities.filter((activity) => Number(activity.lesson_id) === lesson.lessonId)
          return <button type="button" className="lesson-choice panel" key={lesson.lessonId} onClick={() => openModule(selectedModule.id, lesson.lessonId)}><span className="lesson-choice-icon" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span><small>LESSON {String(index + 1).padStart(2, '0')}</small><strong>{lesson.title}</strong><em>{attempt ? `Best quiz score: ${attempt.bestScore}%` : 'Take the quiz when ready. Reading and practice are optional.'}</em><span className="lesson-choice-meta">{practicals.length} {practicals.length === 1 ? 'activity' : 'activities'} · {lesson.questions.length} quiz questions</span></span><span className="course-state">{attempt ? `Best ${attempt.bestScore}%` : lessonIsComplete(lesson) ? 'Read' : 'To do'}</span><span className="lesson-choice-arrow" aria-hidden="true">↗</span></button>
        })}</div>
      </section><aside className="module-checklist"><h3>Your module checklist</h3><progress value={detail.percent} max="100" aria-label="Module progress" /><strong>{detail.percent}% complete</strong><dl><div><dt>Quizzes passed ({curriculumPolicy.quizPassScore}%+)</dt><dd>{detail.passed}/{selectedModule.lessons.length}</dd></div></dl><p>Score at least 50% on each quiz to open the next module. Reading and practical activities are optional.</p></aside></div>
    </div>
  }

  const result = results[selectedLesson.lessonId]
  const complete = lessonIsComplete(selectedLesson)
  const lessonActivities = activities.filter((activity) => Number(activity.lesson_id) === selectedLesson.lessonId)
  const isRetaking = retakeLessonId === selectedLesson.lessonId
  const quizSummary = quizSummaries.get(selectedLesson.lessonId)
  const quizSubmitted = Boolean(quizSummary) && !isRetaking
  const guide = getLessonGuide(selectedLesson.moduleTitle, selectedLesson.title)

  return <div className="dashboard-content lesson-page lesson-studio">
    <button type="button" className="back-link" onClick={() => openModule(selectedModule.id)}>← Back to {selectedModule.title}</button>
    <div className="section-intro"><div><span className="eyebrow">{selectedModule.title}</span><h2>{selectedLesson.title}</h2><p>{guide ? 'About ' + getGuideReadingMinutes(guide, selectedLesson.content) + ' minutes to read · Examples, self-checks & an optional video' : 'Score at least 50% on the MCQ quiz to move forward. Reading and practical work are optional.'}</p></div><span className={complete ? 'pill complete' : 'pill'}>{complete ? 'Lesson read' : 'Optional reading'}</span></div>
    <nav className="lesson-stage-nav" aria-label="Lesson stages"><a href="#lesson-reading"><span aria-hidden="true">1</span>Study the lesson (optional)</a>{lessonActivities.length > 0 && <a href="#lesson-practice"><span aria-hidden="true">2</span>Optional practice</a>}<a href="#lesson-quiz"><span aria-hidden="true">{lessonActivities.length ? '3' : '2'}</span>Take the quiz</a></nav>
    <article className="panel lesson-reader" id="lesson-reading" tabIndex={-1}><div className="lesson-step"><span>1</span><div><strong>Read, explore, and understand</strong><small>Optional study material. You can take the quiz whenever you are ready.</small></div></div><LessonStudyGuide key={selectedLesson.lessonId} guide={guide} originalContent={selectedLesson.content} lessonTitle={selectedLesson.title} />{lessonError && <p className="error-message">{lessonError}</p>}{complete ? <p className="lesson-done">✓ Reading saved. Your quiz is available anytime.</p> : <button type="button" className="primary-small" disabled={markingLesson === selectedLesson.lessonId} onClick={() => completeLesson(selectedLesson)}>{markingLesson === selectedLesson.lessonId ? 'Saving…' : 'I have finished this lesson'}</button>}</article>
    <>
      {lessonActivities.length > 0 && <details className="panel lesson-work" id="lesson-practice"><summary><div className="lesson-step"><span>2</span><div><strong>Optional practical activities</strong><small>Extra practice. You can take and pass the quiz without submitting these activities.</small></div></div></summary>{lessonActivities.map((activity) => <ActivityForm activity={{ ...activity, is_required: false }} key={activity.activity_id} onXpEarned={onXpEarned} />)}</details>}
      <section className="panel lesson-quiz" id="lesson-quiz" tabIndex={-1}><div className="lesson-step"><span>{lessonActivities.length ? '3' : '2'}</span><div><strong>Quiz: {selectedLesson.title}</strong><small>{selectedLesson.questions.length} MCQ questions - Pass at {curriculumPolicy.quizPassScore}%</small></div></div>{quizSubmitted ? <div className="quiz-submitted" role="status"><strong>{quizSummary.bestScore >= curriculumPolicy.quizPassScore ? 'Quiz passed' : 'Quiz submitted - try again to pass'}</strong><p>Best score: {quizSummary.bestScore}%. Your highest score is kept for this quiz.</p><p>Latest attempt: {quizSummary.latestScore}%{result ? ` (${result.correctAnswers}/${result.totalQuestions} correct)` : ''}. {result ? 'The feedback below is for this attempt.' : 'You can retake this quiz to practise.'}</p><button type="button" className="back-link" onClick={() => openModule(null)}>← Return to Learning Path for Retake Quiz</button></div> : <><ol>{selectedLesson.questions.map((question) => <li key={question.question_id}><span className="question-type">{question.type.replace('_', ' ')}</span><fieldset><legend>{getLessonQuestionText(question, guide)}</legend><QuestionControl question={question} value={answers[question.question_id] || ''} onChange={(value) => setAnswers((current) => ({ ...current, [question.question_id]: value }))} /></fieldset></li>)}</ol><div className="quiz-actions"><button type="button" className="primary-small" onClick={() => submitQuiz(selectedLesson)} disabled={Boolean(submitting) || selectedLesson.questions.some((question) => !answers[question.question_id])}>{submitting === selectedLesson.lessonId ? 'Submitting…' : isRetaking ? 'Submit retake' : 'Submit lesson quiz'}</button>{isRetaking && <button type="button" className="back-link" onClick={() => { setRetakeLessonId(null); setQuizError('') }}>Cancel retake</button>}{quizError && <span className="quiz-error">{quizError}</span>}</div></>}{quizSubmitted && result && Array.isArray(result.feedback) && <QuizFeedback feedback={result.feedback} guide={guide} />}</section>
    </>
  </div>
}
