import { useState } from 'react'
import { CraftIcon } from './StudentExperience'
import './progress-workspace.css'

function attemptDate(value) {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ProgressView({ progress, questions, attempts, journey, error, onNavigate }) {
  const [filter, setFilter] = useState('all')
  const [showAllAttempts, setShowAllAttempts] = useState(false)
  const catalogue = new Map()
  for (const question of questions) {
    const id = Number(question.module_id)
    if (!catalogue.has(id)) catalogue.set(id, { title: question.module_title, lessonIds: new Set() })
    catalogue.get(id).lessonIds.add(Number(question.lesson_id))
  }
  const records = new Map(progress.map((item) => [Number(item.module_id), item]))
  const ids = Array.isArray(journey?.moduleIds) ? [...new Set(journey.moduleIds.map(Number))] : [...new Set([...catalogue.keys(), ...records.keys()])]
  const completedIds = new Set((journey?.completedModuleIds || []).map(Number))
  const unlockedIds = new Set((journey?.unlockedModuleIds || []).map(Number))
  const orderedAttempts = [...attempts].sort((a, b) => (Date.parse(b.completed_at) || 0) - (Date.parse(a.completed_at) || 0) || Number(b.attempt_id) - Number(a.attempt_id))
  const modules = ids.map((id, index) => {
    const record = records.get(id)
    const detail = catalogue.get(id)
    const complete = completedIds.has(id) || record?.status === 'complete'
    const percent = complete ? 100 : Math.min(100, Math.max(0, Number(record?.percent_complete) || 0))
    const state = complete ? 'complete' : percent > 0 ? 'in_progress' : 'not_started'
    const quizScores = attempts.filter((attempt) => detail?.lessonIds.has(Number(attempt.lesson_id))).map((attempt) => Number(attempt.score)).filter(Number.isFinite)
    return { id, index, title: detail?.title || record?.title || `Module ${index + 1}`, lessonCount: detail?.lessonIds.size || 0, percent, state, unlocked: unlockedIds.has(id), bestQuiz: quizScores.length ? Math.max(...quizScores) : null }
  })
  const complete = modules.filter((item) => item.state === 'complete').length
  const started = modules.filter((item) => item.state === 'in_progress').length
  const untouched = modules.length - complete - started
  const coursePercent = modules.length ? Math.round(complete / modules.length * 100) : 0
  const allComplete = modules.length > 0 && complete === modules.length
  const nextModule = modules.find((item) => item.unlocked && item.state !== 'complete')
  const nextView = allComplete ? journey?.postTestDone ? 'surveys' : 'post-test' : 'modules'
  const actionLabel = allComplete ? journey?.postTestDone ? 'View survey results' : 'Open post-test survey' : 'Open Learning Path'
  const visible = modules.filter((item) => filter === 'all' || item.state === filter)
  const visibleAttempts = showAllAttempts ? orderedAttempts : orderedAttempts.slice(0, 5)
  const icons = ['shield.svg', 'progress.svg', 'learning.svg', 'quiz.svg', 'badges.svg']

  return <div className="dashboard-content progress-workspace">
    <header className="progress-intro"><span className="eyebrow">Every step counts</span><h2>See how far you’ve come.</h2><p>Your module progress and quiz attempts, brought together in one clear view.</p></header>
    {error && <p className="error-message" role="alert">{error}</p>}
    <section className="progress-course-summary" aria-labelledby="progress-course-title"><div className="progress-summary-copy"><span className="progress-overline">YOUR LEARNING PROGRESS</span><h3 id="progress-course-title">{allComplete ? 'Every module. A milestone earned.' : complete || started ? 'Your effort is adding up.' : 'A fresh start, full of possibility.'}</h3><p>{allComplete ? 'Your learning modules are complete. Take the next step in your learning journey.' : 'Read, practise, and check your understanding. Each completed module opens the next.'}</p><div className="progress-next-action"><div><small>{allComplete ? 'Your next step' : nextModule ? 'Up next' : 'Start here'}</small><strong>{allComplete ? journey?.postTestDone ? 'Reflect on your results' : 'Your post-test survey' : nextModule?.title || 'Explore your learning path'}</strong></div><button type="button" className="primary-small" onClick={() => onNavigate(nextView)}>{actionLabel} <span aria-hidden="true">→</span></button></div></div><div className="progress-course-total"><span>Course completion</span><strong>{coursePercent}<small>%</small></strong><progress max={modules.length || 1} value={complete} aria-label={`${complete} of ${modules.length} modules complete`} /><p>{complete} of {modules.length} modules complete</p><small>Based on fully completed modules.</small></div></section>
    <dl className="progress-status-counts"><div><span className="progress-stat-icon"><CraftIcon name="badges.svg" /></span><div><dt>Completed</dt><dd>{complete}</dd></div></div><div><span className="progress-stat-icon"><CraftIcon name="learning.svg" /></span><div><dt>In progress</dt><dd>{started}</dd></div></div><div><span className="progress-stat-icon"><CraftIcon name="quiz.svg" /></span><div><dt>Not started</dt><dd>{untouched}</dd></div></div></dl>
    <div className="progress-content-layout"><section className="progress-module-panel" aria-labelledby="progress-modules-heading"><div className="progress-panel-heading"><div><span className="eyebrow">Your course, module by module</span><h3 id="progress-modules-heading">Module progress</h3><p>Module progress is based only on your best quiz scores.</p></div>{modules.length > 0 && <label className="progress-filter">Show modules<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All modules</option><option value="in_progress">In progress</option><option value="complete">Completed</option><option value="not_started">Not started</option></select></label>}</div>
      {visible.length ? <><p className="progress-visible-count" role="status">Showing {visible.length} of {modules.length} modules</p><ol className="progress-module-list">{visible.map((item) => <li key={item.id} data-state={item.state}><span className="progress-module-icon"><CraftIcon name={icons[item.index % icons.length]} /></span><div className="progress-module-copy"><div className="progress-module-title"><div><small>MODULE {String(item.index + 1).padStart(2, '0')}</small><h4>{item.title}</h4></div><span className="progress-state">{item.state === 'complete' ? 'Completed' : item.state === 'in_progress' ? 'In progress' : item.unlocked ? 'Ready to start' : 'Locked'}</span></div><p>{item.lessonCount ? `${item.lessonCount} ${item.lessonCount === 1 ? 'lesson' : 'lessons'} · ` : ''}{item.bestQuiz == null ? 'No quiz attempts yet' : `Best quiz score: ${item.bestQuiz}%`}</p><div className="progress-module-bar"><progress max="100" value={item.percent} aria-label={`${item.title}: ${item.percent}% module progress`} /><span>{item.percent}%</span></div>{!item.unlocked && item.state !== 'complete' && <small className="progress-locked-note">Complete the previous modules to unlock.</small>}</div></li>)}</ol></> : <div className="progress-empty"><span className="progress-empty-icon"><CraftIcon name="progress.svg" /></span><h4>{modules.length ? 'No modules in this view yet.' : 'Your next chapter is on its way.'}</h4><p>{modules.length ? filter === 'complete' ? 'Score at least 50% on each MCQ quiz to finish a module.' : filter === 'in_progress' ? 'Your active modules will appear here when you begin learning.' : 'You’ve started every module in this course.' : 'There are no published learning modules to show right now. Check the Learning Path or ask your teacher.'}</p>{modules.length ? <button type="button" className="progress-text-action" onClick={() => setFilter('all')}>Show all modules</button> : <button type="button" className="primary-small" onClick={() => onNavigate('modules')}>Open Learning Path <span aria-hidden="true">→</span></button>}</div>}
    </section>
    <aside className="progress-side" aria-label="About progress"><section className="progress-help-panel"><span className="eyebrow">How progress adds up</span><h3>Small steps. Real progress.</h3><p>Your best quiz score is the only requirement:</p><dl className="progress-weights"><div><dt>MCQ quiz pass score</dt><dd>50%</dd></div></dl><p>Score at least 50% on each quiz to complete its module and unlock the next one.</p><small>Reading and practical activities are optional. They do not affect completion. Progress reaches 100% when the quiz is passed.</small></section><section className="progress-help-panel progress-reflection-link"><span className="progress-stat-icon"><CraftIcon name="quiz.svg" /></span><h3>Understanding is a journey.</h3><p>Your pre-test and post-test survey ratings are saved separately from quiz scores.</p><button type="button" className="progress-text-action" onClick={() => onNavigate('surveys')}>View survey results <span aria-hidden="true">→</span></button></section></aside></div>
    <section className="progress-quiz-panel" aria-labelledby="progress-quizzes-heading"><div className="progress-panel-heading"><div><span className="eyebrow">Practice makes progress</span><h3 id="progress-quizzes-heading">Your quiz attempts</h3><p>{attempts.length ? `Showing ${visibleAttempts.length} of ${attempts.length} attempts, newest first. Retakes are included.` : 'Your recorded quiz attempts will appear here.'}</p></div>{orderedAttempts.length > 5 && <button type="button" className="progress-text-action" onClick={() => setShowAllAttempts(!showAllAttempts)}>{showAllAttempts ? 'Show latest five' : 'Show all attempts'}</button>}</div>{visibleAttempts.length ? <div className="progress-quiz-table" role="region" aria-label="Quiz attempt history" tabIndex={0}><table><thead><tr><th scope="col">Lesson</th><th scope="col">Score</th><th scope="col">Submitted</th></tr></thead><tbody>{visibleAttempts.map((attempt) => <tr key={attempt.attempt_id}><th scope="row">{attempt.lesson_title}</th><td><span className="progress-quiz-score" data-perfect={Number(attempt.score) === 100}>{Number(attempt.score)}%</span></td><td><time dateTime={attempt.completed_at}>{attemptDate(attempt.completed_at)}</time></td></tr>)}</tbody></table></div> : <div className="progress-quiz-empty"><CraftIcon name="quiz.svg" /><div><h4>Your first quiz is ahead of you.</h4><p>Read a lesson, then try its MCQ quiz in the Learning Path. Practical work is optional.</p></div><button type="button" className="secondary-small" onClick={() => onNavigate('modules')}>Explore lessons <span aria-hidden="true">→</span></button></div>}</section>
  </div>
}
