import { useContext, useId } from 'react'
import { TestingPreview, TrailIcon } from './StudentVisuals'
import { StudentVisualContext } from './studentVisualContext'
import BadgeMedal from './BadgeMedal'
import { averageBestQuizScore } from './lib/quizScores'

export function CraftIcon({ name, alt = '' }) {
  const studentVisuals = useContext(StudentVisualContext)
  if (studentVisuals) return <TrailIcon name={name} alt={alt} />
  return <img src={`/streamline/${name}`} alt={alt} />
}

// A small, original vector character: sharp at every screen size, with no remote assets.
export function TesterMascot({ className = '' }) {
  const id = useId().replaceAll(':', '')
  return (
    <svg className={`tester-mascot ${className}`} viewBox="0 0 400 360" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-shell`} x1="130" y1="93" x2="281" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset="1" stopColor="#cec7fa" /></linearGradient>
        <linearGradient id={`${id}-body`} x1="170" y1="210" x2="235" y2="310" gradientUnits="userSpaceOnUse"><stop stopColor="#a38af9" /><stop offset="1" stopColor="#6d4ed8" /></linearGradient>
        <linearGradient id={`${id}-visor`} x1="149" y1="135" x2="264" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#35314e" /><stop offset="1" stopColor="#19182b" /></linearGradient>
        <linearGradient id={`${id}-badge`} x1="267" y1="228" x2="319" y2="301" gradientUnits="userSpaceOnUse"><stop stopColor="#eafaab" /><stop offset="1" stopColor="#bbdf61" /></linearGradient>
      </defs>
      <ellipse cx="204" cy="323" rx="105" ry="13" fill="#5f49a0" opacity=".12" />
      <circle cx="201" cy="181" r="137" stroke="#fff" strokeWidth="1.5" opacity=".5" />
      <circle cx="201" cy="181" r="110" stroke="#b1a0ec" strokeDasharray="3 10" opacity=".5" />
      <g transform="rotate(-12 82 128)"><rect x="38" y="77" width="79" height="87" rx="17" fill="#fff" /><rect x="52" y="91" width="29" height="7" rx="3.5" fill="#b4a7ec" /><path d="m54 113 5 5 9-11m-14 31 5 5 9-11" stroke="#7656d9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M77 114h23m-23 25h17" stroke="#d6d0eb" strokeWidth="4" strokeLinecap="round" /></g>
      <g transform="rotate(12 326 88)"><rect x="289" y="55" width="76" height="56" rx="15" fill="#38304f" /><path d="m312 73-9 10 9 10m29-20 9 10-9 10m-9-24-9 28" stroke="#d7f59a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>
      <path d="m318 175 4-10 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#b7d56b" />
      <path d="m102 246 3-8 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#f4a578" />
      <circle cx="279" cy="41" r="5" fill="#f2a779" /><circle cx="58" cy="205" r="4" fill="#a991e9" />
      <g className="mascot-character">
        <path d="M176 278v26c0 12-35 16-38 3-2-11 8-28 14-36m69 7v26c0 12 35 16 38 3 2-11-8-28-14-36" fill="#f2eeff" />
        <path d="M148 225c-13 2-27 11-31 25-3 9 7 19 15 15l28-25" fill="#cfc4f3" />
        <path d="m246 226 31-26c12-10 22 7 13 17l-25 30" fill="#e3dcfb" />
        <path d="M153 227c1-23 86-23 87 0l11 45c4 21-104 24-105 3l7-48Z" fill={`url(#${id}-body)`} />
        <rect x="174" y="239" width="47" height="33" rx="11" fill="#563dab" />
        <path d="m190 254 6 6 12-14" stroke="#d7f59a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M195 111V87" stroke="#c2b3f0" strokeWidth="8" strokeLinecap="round" />
        <circle cx="195" cy="78" r="12" fill="#bfe372" /><circle cx="192" cy="74" r="4" fill="#edffc4" />
        <rect x="118" y="151" width="17" height="38" rx="8.5" fill="#a795df" /><rect x="269" y="151" width="17" height="38" rx="8.5" fill="#a795df" />
        <rect x="128" y="106" width="149" height="122" rx="43" fill={`url(#${id}-shell)`} />
        <path d="M154 120c12-6 56-8 79-3" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".85" />
        <rect x="143" y="136" width="119" height="71" rx="29" fill={`url(#${id}-visor)`} />
        <path d="M165 165c4-9 13-9 17 0m42 0c4-9 13-9 17 0" stroke="#d7f59a" strokeWidth="6" strokeLinecap="round" />
        <path d="M189 184c7 8 18 8 26 0" stroke="#d7f59a" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="163" cy="183" rx="7" ry="3" fill="#bfa9f0" opacity=".5" /><ellipse cx="242" cy="183" rx="7" ry="3" fill="#bfa9f0" opacity=".5" />
      </g>
      <g transform="rotate(11 294 269)"><path d="m295 228 32 13v25c0 21-32 39-32 39s-32-18-32-39v-25l32-13Z" fill={`url(#${id}-badge)`} /><path d="m280 263 11 11 19-24" stroke="#4b6831" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  )
}

function StatCard({ icon, label, value, detail, tone }) {
  return <div className={`student-stat stat-${tone}`}><span className="stat-icon"><CraftIcon name={icon} /></span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}

export function StudentOverview({ data, questions, journey, onNavigate, user }) {
  const completedIds = new Set((journey?.completedModuleIds || data.progress.filter(item => item.status === 'complete').map(item => item.module_id)).map(Number))
  const modules = [...new Map(questions.map(item => [Number(item.module_id), { id: Number(item.module_id), title: item.module_title }])).values()]
  const totalModules = journey?.moduleIds?.length || modules.length
  const completedCount = completedIds.size
  const completion = totalModules ? Math.round(completedCount / totalModules * 100) : 0
  const averageQuiz = averageBestQuizScore(data.attempts)
  const xp = Number(data.xpPoints || 0)
  const level = Math.floor(xp / 500) + 1
  const remainingXp = 500 - xp % 500
  const joinedClass = journey?.joinedClass ?? data.classes.some(item => Number(item.joined) === 1)
  const preTestDone = journey?.preTestDone ?? data.surveys.some(item => item.phase === 'pre')
  const nextModule = modules.find(item => !completedIds.has(item.id) && journey?.unlockedModuleIds?.map(Number).includes(item.id))
  const actionView = !joinedClass ? 'classes' : journey?.allModulesComplete && !journey?.postTestDone ? 'post-test' : 'modules'
  const actionLabel = !joinedClass ? 'Find your class' : !preTestDone ? 'Take the pre-test' : journey?.allModulesComplete ? journey?.postTestDone ? 'Revisit your lessons' : 'Take the post-test' : 'Continue learning'
  const nextTitle = !joinedClass ? 'Your adventure starts with a class' : nextModule?.title || journey?.nextAction || 'Explore your learning path'
  const nextLessons = new Set(questions.filter(item => Number(item.module_id) === nextModule?.id).map(item => item.lesson_id)).size
  const recentActivity = [
    ...data.attempts.map(item => ({ id: `quiz-${item.attempt_id}`, icon: 'quiz.svg', title: 'Quiz completed', detail: item.lesson_title, score: `${item.score}%`, date: item.completed_at })),
    ...data.surveys.map((item, index) => ({ id: `assessment-${index}`, icon: 'quiz.svg', title: `${item.phase === 'pre' ? 'Pre-test' : 'Post-test'} completed`, detail: item.rating_mean != null ? 'Understanding survey' : 'Knowledge check', score: item.rating_mean != null ? `${item.rating_mean} / 5` : `${item.score}%`, date: item.submitted_at })),
    ...data.badges.map(item => ({ id: `badge-${item.badge_id}`, icon: 'celebrate.svg', title: 'New badge earned', detail: item.name, score: 'Earned', date: item.awarded_at })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3)

  return <div className="dashboard-content student-dashboard">
    <section className="student-hero" aria-labelledby="student-welcome">
      <div className="student-hero-copy"><span className="hero-chip"><span /> YOUR NEXT CHAPTER</span><h2 id="student-welcome">Hey {user.name.split(' ')[0]},<br />let’s build your <em>testing skills.</em></h2><p>One lesson. One challenge. One step closer to<br className="desktop-break" /> creating software that makes a difference.</p><button type="button" className="student-primary" onClick={() => onNavigate(actionView)}>{actionLabel}<span aria-hidden="true">↗</span></button><div className="hero-learning-progress"><progress value={completedCount} max={totalModules || 1} aria-label="Modules completed" /><span><strong>{completedCount}/{totalModules}</strong> modules complete</span></div></div>
      <TestingPreview />
    </section>

    <div className="student-stat-grid">
      <StatCard icon="learning.svg" label="Modules complete" value={`${completedCount}/${totalModules}`} detail={totalModules ? `${completion}% of your learning path` : 'Your journey is just beginning'} tone="purple" />
      <StatCard icon="quiz.svg" label="Quiz average" value={averageQuiz === null ? '—' : `${averageQuiz}%`} detail={data.attempts.length ? 'Highest score per quiz' : 'Take a quiz to get started'} tone="mint" />
      <StatCard icon="celebrate.svg" label="Total XP" value={xp} detail={`${remainingXp} XP to Level ${level + 1}`} tone="peach" />
      <StatCard icon="badges.svg" label="Badges collected" value={data.badges.length} detail={data.badges.length ? 'Every one tells a story' : 'Your first badge is waiting'} tone="yellow" />
    </div>

    <div className="student-content-grid">
      <div className="student-main-column">
        <section className="student-next-card"><div className="next-card-icon"><CraftIcon name="learning.svg" /></div><div className="next-card-copy"><span className="student-overline">PICK UP WHERE YOU LEFT OFF</span><h3>{nextTitle}</h3><p>{nextLessons ? `${nextLessons} ${nextLessons === 1 ? 'lesson' : 'lessons'} · Quizzes & hands-on activities` : !joinedClass ? 'Join your classmates and unlock your first lesson.' : 'Keep exploring, practising, and building confidence.'}</p></div><button type="button" className="round-action" aria-label={actionLabel} onClick={() => onNavigate(actionView)}>→</button></section>
        <section className="student-panel learning-trail"><div className="student-panel-heading"><div><h3>Your learning adventure</h3><p>Small wins lead to big things.</p></div><button className="student-text-button" type="button" onClick={() => onNavigate(joinedClass ? 'modules' : 'classes')}>Explore path <span aria-hidden="true">↗</span></button></div>
          {modules.length ? <div className="adventure-list">{modules.map((module, index) => {
            const complete = completedIds.has(module.id)
            const unlocked = journey?.unlockedModuleIds?.map(Number).includes(module.id)
            return <button className={`adventure-step${complete ? ' is-complete' : ''}${unlocked && !complete ? ' is-current' : ''}${!unlocked ? ' is-locked' : ''}`} type="button" key={module.id} disabled={!unlocked} onClick={() => onNavigate('modules')}><span className="adventure-number">{complete ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="adventure-copy"><strong>{module.title}</strong><small>{complete ? 'Nicely done! You’ve completed this module.' : unlocked ? 'Ready for your next challenge?' : 'Complete the previous module to unlock.'}</small></span><span className="adventure-status">{complete ? 'Completed' : unlocked ? 'Let’s go →' : 'Locked'}</span></button>
          })}</div> : <div className="student-empty"><CraftIcon name="student.svg" /><strong>Your learning path is ready to begin.</strong><p>Join a class and complete your pre-test to unlock your lessons.</p><button className="student-text-button" type="button" onClick={() => onNavigate(actionView)}>{actionLabel} →</button></div>}
        </section>
      </div>
      <div className="student-side-column">
        <section className="student-panel reward-shelf"><div className="student-panel-heading"><div><h3>A little hard-earned glory</h3><p>Your badge collection</p></div><span className="reward-count">{data.badges.length}</span></div><div className="reward-emblems">{data.badges.length ? data.badges.slice(0, 3).map((badge) => <div className="reward-item" key={badge.badge_id}><BadgeMedal badge={badge} /><strong title={badge.name}>{badge.name}</strong></div>) : <div className="first-badge"><BadgeMedal /><strong>Your first win goes here.</strong><p>Complete lessons and challenges to earn your badges.</p></div>}</div><button className="student-text-button" type="button" onClick={() => onNavigate(joinedClass ? 'badges' : 'classes')}>View all badges <span aria-hidden="true">↗</span></button></section>
        <section className="student-level-card"><span className="level-star" aria-hidden="true">✦</span><div><span className="student-overline">KEEP THE MOMENTUM</span><h3>Level {level} · Quality Learner</h3><p><strong>{remainingXp} XP</strong> until your next level</p><progress max="500" value={xp % 500} aria-label={`Progress towards level ${level + 1}`} /><small>Every lesson is a step forward.</small></div></section>
        <section className="student-panel student-recent"><div className="student-panel-heading"><h3>Your latest wins</h3><CraftIcon name="celebrate.svg" /></div>{recentActivity.length ? <div className="student-activity-list">{recentActivity.map(item => <div className="student-activity" key={item.id}><span className="student-activity-icon"><CraftIcon name={item.icon} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><span className="activity-result">{item.score}</span></div>)}</div> : <p className="student-activity-empty">Your next lesson could be your first win. Let’s get started!</p>}</section>
      </div>
    </div>
    <p className="student-footer"><span aria-hidden="true">✦</span> Progress over perfection. Keep learning, keep testing.<span>{data.classes.filter(item => Number(item.joined) === 1).length} joined {data.classes.filter(item => Number(item.joined) === 1).length === 1 ? 'class' : 'classes'}</span></p>
  </div>
}
