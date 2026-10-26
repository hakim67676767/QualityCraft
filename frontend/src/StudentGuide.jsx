import { TrailIcon } from './StudentVisuals'
import './student-guide.css'

export default function StudentGuide({ user, needsClass, preTestComplete, hasLearningProgress, expanded, onToggle, onContinue, error, visible = true }) {
  if (error) return <div className="dashboard-content student-guide-wrap" hidden={!visible}><section className="student-guide"><h2>Let’s load your next step.</h2><p role="alert">{error}</p><button type="button" className="secondary-small" onClick={() => window.location.reload()}>Try again</button></section></div>

  const steps = [
    { title: 'Join your class', description: 'Find the class name your teacher shared, check the teacher’s name, and choose Join class.', done: !needsClass },
    { title: 'Complete your pre-test', description: 'Share your starting point before the lessons unlock. Answer every item, then choose Submit pre-test.', done: preTestComplete },
    { title: 'Start learning', description: 'Open Learning Path, choose the first available module, and open a lesson.', done: hasLearningProgress },
  ]
  const current = needsClass ? 0 : !preTestComplete ? 1 : 2
  const titles = ['Welcome, ' + user.name.split(' ')[0] + '. Let’s get you started.', 'Your class is joined. Complete your pre-test next.', 'You’re ready for your first lesson.']
  const descriptions = [
    'Start by joining your teacher’s class. This connects your learning and lets your teacher support you.',
    'The pre-test records your starting point. Submit it to unlock your learning modules.',
    'Follow the Learning Path in order. Each module brings together lessons, practical activities, and quizzes.',
  ]
  const actions = ['Find my class', 'Go to pre-test', 'Open Learning Path']

  return <div className="dashboard-content student-guide-wrap" hidden={!visible}><section className="student-guide" aria-labelledby="student-guide-title">
    <div className="student-guide-heading"><div><h2 id="student-guide-title" tabIndex={-1}>{hasLearningProgress ? 'Need a hand finding your way?' : titles[current]}</h2><p>{hasLearningProgress ? 'Revisit the steps or find the page you need.' : descriptions[current]}</p></div><button type="button" className="student-guide-toggle" aria-expanded={expanded} aria-controls="student-guide-details" onClick={onToggle}>{expanded ? 'Hide guide' : 'Show guide'}<TrailIcon name="learning.svg" /></button></div>
    <div className="student-guide-action"><button type="button" className="primary-small" onClick={() => onContinue(needsClass ? 'classes' : !preTestComplete ? 'pre-test' : 'modules')}>{actions[current]}<span aria-hidden="true">→</span></button><p>You can reopen this guide anytime using <strong>Getting started</strong> in the header.</p></div>
    <div id="student-guide-details" hidden={!expanded}>
      <ol className="student-guide-steps" aria-label="Getting started steps">{steps.map((step, index) => <li key={step.title} data-state={step.done ? 'complete' : index === current ? 'current' : 'ahead'} aria-current={!step.done && index === current ? 'step' : undefined}><span className="student-guide-marker" aria-hidden="true">{step.done ? <TrailIcon name="check.svg" /> : index + 1}</span><div><h3>{step.title}<span>{step.done ? 'Done' : index === current ? 'Your next step' : 'Up next'}</span></h3><p>{step.description}</p></div></li>)}</ol>
      <details className="student-guide-help"><summary>How do lessons work, and where can I find things?</summary><div><p><strong>Learning Path:</strong> score at least 50% on each MCQ quiz to unlock the next module. Reading and practical activities are optional and do not block progress. You can retake quizzes.</p><p><strong>Progress:</strong> see completed modules and your best quiz scores. <strong>Badges:</strong> see the milestones you’ve earned. <strong>Profile:</strong> view your account and learning record.</p><p><strong>Post-test:</strong> finish all modules to unlock it. <strong>Survey Results:</strong> revisit your submitted pre-test and post-test responses.</p><p><strong>Can’t find your class?</strong> Ask your teacher for the exact class name. Use Classes to search for it.</p></div></details>
    </div>

  </section></div>
}
