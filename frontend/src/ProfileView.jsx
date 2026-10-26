import { CraftIcon } from './StudentExperience'
import BadgeMedal from './BadgeMedal'
import './profile-page.css'

export default function ProfileView({ user, data, journey, onNavigate }) {
  const xp = Number(data.xpPoints) || 0
  const level = Math.floor(xp / 500) + 1
  const completed = journey?.completedModuleIds?.length || 0
  const total = journey?.moduleIds?.length || 0
  const percent = total ? Math.round(completed / total * 100) : 0
  const classes = data.classes.filter((item) => Number(item.joined) === 1)
  const preDone = Boolean(journey?.preTestDone)
  const postDone = Boolean(journey?.postTestDone)
  const nextView = postDone ? 'surveys' : journey?.allModulesComplete ? 'post-test' : 'modules'
  const nextLabel = postDone ? 'View survey results' : journey?.allModulesComplete ? 'Open post-test survey' : 'Continue learning'
  const steps = [
    { title: 'Join your learning community', description: classes.length ? `${classes.length} ${classes.length === 1 ? 'class joined' : 'classes joined'}` : 'Find the class shared by your teacher.', done: classes.length > 0, view: 'classes', action: 'View classes' },
    { title: 'Record your starting point', description: preDone ? 'Your original pre-test survey is saved.' : 'Complete your pre-test survey before learning.', done: preDone, view: 'surveys', action: 'View results' },
    { title: 'Build your software testing skills', description: `${completed} of ${total} modules complete`, done: total > 0 && completed >= total, view: 'modules', action: 'Open learning path' },
    { title: 'Reflect on your understanding', description: postDone ? 'Your original post-test survey is saved.' : 'Your post-test opens after all modules are complete.', done: postDone, view: 'post-test', action: 'View post-test' },
  ]
  const nextStep = steps.findIndex((step) => !step.done)
  const latestBadge = [...data.badges].sort((a, b) => (Date.parse(b.awarded_at) || 0) - (Date.parse(a.awarded_at) || 0))[0]

  return <div className="dashboard-content profile-page">
    <section className="profile-identity" aria-labelledby="profile-name">
      <div className="profile-cover" aria-hidden="true" />
      <div className="profile-identity-body">
        <div className="profile-person">
          <span className="profile-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          <div className="profile-person-copy"><h2 id="profile-name">{user.name}</h2><p>Student <span aria-hidden="true">·</span> Quality Learner</p></div>
          <button type="button" className="primary-small profile-next-action" onClick={() => onNavigate(nextView)}>{nextLabel}<span aria-hidden="true">→</span></button>
        </div>
        <div className="profile-account-row">
          <dl className="profile-account-facts" aria-label="Account details"><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Workspace</dt><dd>Student</dd></div></dl>
          <section className="profile-level" aria-labelledby="profile-level-title"><div><h3 id="profile-level-title">Level {level}</h3><p>{xp.toLocaleString()} XP earned</p></div><progress max="500" value={xp % 500} aria-label={`${xp % 500} of 500 XP toward level ${level + 1}`} /><p>{500 - xp % 500} XP to Level {level + 1}</p></section>
        </div>
      </div>
      <dl className="profile-summary"><div><dt>Modules complete</dt><dd>{completed}<span> / {total}</span></dd></div><div><dt>Badges earned</dt><dd>{data.badges.length}</dd></div><div><dt>Classes joined</dt><dd>{classes.length}</dd></div></dl>
    </section>
    <div className="profile-content">
      <section className="profile-record" aria-labelledby="profile-record-title"><header className="profile-section-heading"><div><h2 id="profile-record-title">Your learning record</h2><p>One step at a time, from your first class to your final reflection.</p></div><span className="profile-completion">{percent}% complete</span></header><progress max="100" value={percent} aria-label={`${percent}% of learning modules complete`} />
        <ol className="profile-milestones">{steps.map((step, index) => <li key={step.title} data-state={step.done ? 'complete' : index === nextStep ? 'current' : 'ahead'}><span className="profile-step-marker" aria-hidden="true">{step.done ? <CraftIcon name="check.svg" /> : index + 1}</span><div className="profile-step-copy"><h3>{step.title}</h3><p>{step.description}</p><span className="profile-step-state">{step.done ? 'Complete' : index === nextStep ? 'Your next step' : 'Ahead of you'}</span></div><button type="button" className="profile-text-action" onClick={() => onNavigate(step.view)}>{step.action}<span aria-hidden="true">→</span></button></li>)}</ol>
        <p className="profile-record-note">{postDone ? 'Your journey is saved. Take a moment to reflect.' : 'Keep building your skills at your own pace.'}</p>
      </section>
      <aside className="profile-side" aria-label="Achievements and classes">
        <section className="profile-achievement" aria-labelledby="profile-achievement-title"><header className="profile-section-heading"><h2 id="profile-achievement-title">{latestBadge ? 'Latest achievement' : 'Your first achievement'}</h2></header><div className="profile-badge-detail"><div className="profile-badge-art"><BadgeMedal badge={latestBadge} /></div><div><h3>{latestBadge?.name || 'Every skill starts somewhere.'}</h3><p>{latestBadge ? latestBadge.description || latestBadge.criteria || 'A milestone in your learning journey.' : 'Lessons, activities, and quizzes help you earn your first badge.'}</p></div></div><button type="button" className="profile-text-action" onClick={() => onNavigate('badges')}>View your badges<span aria-hidden="true">→</span></button></section>
        <section className="profile-classes" aria-labelledby="profile-classes-title"><header className="profile-section-heading"><div><h2 id="profile-classes-title">Your classes</h2><p>The community learning with you.</p></div></header>{classes.length ? <ul>{classes.map((item) => <li key={item.class_id}><span className="profile-class-icon"><CraftIcon name="classes.svg" /></span><div><h3>{item.name || item.title}</h3><p>{item.teacher ? `Teacher: ${item.teacher}` : 'Teacher details are not available.'}</p><span className="profile-class-state">Joined</span></div></li>)}</ul> : <p className="profile-empty">No classes joined yet. Open Classes to find your teacher’s class.</p>}<button type="button" className="profile-text-action" onClick={() => onNavigate('classes')}>Manage classes<span aria-hidden="true">→</span></button></section>
      </aside>
    </div>
  </div>
}
