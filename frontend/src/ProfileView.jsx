import { CraftIcon } from './StudentExperience'
import BadgeMedal from './BadgeMedal'
import './reflection-workspace.css'

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
  const latestBadge = data.badges[0]

  return <div className="dashboard-content reflection-workspace learner-profile-workspace">
    <header className="reflection-intro"><span className="eyebrow">Your learning identity</span><h2>A little progress, all yours.</h2><p>Your account, your learning milestones, and the community learning with you.</p></header>
    <section className="learner-identity" aria-labelledby="learner-profile-name"><div className="learner-profile-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div><div className="learner-identity-copy"><span className="reflection-tag">Student</span><h3 id="learner-profile-name">{user.name}</h3><p>{user.email}</p></div><div className="learner-level"><span>Quality Learner · Level {level}</span><strong>{xp.toLocaleString()} <small>XP</small></strong><progress max="500" value={xp % 500} aria-label={`${xp % 500} of 500 XP toward level ${level + 1}`} /><p>{500 - xp % 500} XP to Level {level + 1}</p></div></section>
    <dl className="learner-profile-stats"><div><dt>Modules complete</dt><dd>{completed}<small> / {total}</small></dd></div><div><dt>Badges earned</dt><dd>{data.badges.length}</dd></div><div><dt>Classes joined</dt><dd>{classes.length}</dd></div></dl>
    <div className="learner-profile-layout"><section className="reflection-card learner-record"><div className="reflection-section-heading"><div><span className="eyebrow">One step at a time</span><h3>Your learning record</h3><p>Your milestones across QualityCraft.</p></div><span className="reflection-tag">{percent}% complete</span></div><progress max="100" value={percent} aria-label={`${percent}% of learning modules complete`} /><ol className="learner-milestones">{steps.map((step, index) => <li key={step.title} data-complete={step.done}><span className="learner-milestone-marker" aria-hidden="true">{step.done ? '✓' : String(index + 1).padStart(2, '0')}</span><div><h4>{step.title}</h4><p>{step.description}</p><span className="learner-milestone-state">{step.done ? 'Complete' : 'Ahead of you'}</span></div><button type="button" className="reflection-text-action" onClick={() => onNavigate(step.view)}>{step.action} <span aria-hidden="true">→</span></button></li>)}</ol><div className="learner-record-action"><p>{postDone ? 'Your journey is saved. Take a moment to reflect.' : 'Keep building your skills at your own pace.'}</p><button type="button" className="primary-small" onClick={() => onNavigate(nextView)}>{nextLabel} <span aria-hidden="true">→</span></button></div></section>
      <aside className="learner-profile-side" aria-label="Account and achievements"><section className="reflection-card learner-account"><h3>Account details</h3><dl><div><dt>Full name</dt><dd>{user.name}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Workspace</dt><dd>Student</dd></div></dl></section><section className="reflection-card learner-achievement"><div className="learner-achievement-art"><BadgeMedal badge={latestBadge} /></div><span className="eyebrow">{latestBadge ? 'Latest achievement' : 'Your collection awaits'}</span><h3>{latestBadge?.name || 'Every skill starts somewhere.'}</h3><p>{latestBadge ? latestBadge.description || latestBadge.criteria || 'A milestone in your learning journey.' : 'Lessons, activities, and quizzes help you earn your first badge.'}</p><button type="button" className="reflection-text-action" onClick={() => onNavigate('badges')}>View your badges <span aria-hidden="true">→</span></button></section></aside>
    </div>
    <section className="reflection-card learner-class-memberships"><div className="reflection-section-heading"><div><span className="eyebrow">Learning together</span><h3>Your classes</h3><p>The teachers guiding your learning journey.</p></div><button type="button" className="reflection-text-action" onClick={() => onNavigate('classes')}>Manage classes <span aria-hidden="true">→</span></button></div>{classes.length ? <ul>{classes.map((item) => <li key={item.class_id}><span className="reflection-banner-icon"><CraftIcon name="classes.svg" /></span><div><h4>{item.name}</h4><p>Teacher: {item.teacher}</p></div><span className="reflection-tag">Joined</span></li>)}</ul> : <p>No classes joined yet. Open Classes to find your teacher’s class.</p>}</section>
  </div>
}
