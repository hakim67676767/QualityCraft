import { useEffect, useRef, useState } from 'react'
import './App.css'
import './reference-theme.css'
import './student-experience.css'
import './interface-polish.css'
import './staff-workspace.css'
import './understanding-survey.css'
import ContentAdmin from './ContentAdmin'
import GamificationAdmin from './GamificationAdmin'
import Monitoring from './Monitoring'
import ResearchAdmin from './ResearchAdmin'
import TeacherAssignments from './TeacherAssignments'
import BadgesView from './BadgesView'
import SurveyResults from './SurveyResults'
import PostTestView from './PostTestView'
import ProfileView from './ProfileView'
import ProgressView from './ProgressView'
import LearningPath from './LearningPath'
import ClassesView from './ClassesView'
import { api } from './lib/api'
import { readQuestionOptions } from './lib/questions'
import { CraftIcon as StreamlineIcon, StudentOverview, TesterMascot } from './StudentExperience'

const navigation = [
  { id: 'overview', label: 'Dashboard', icon: 'dashboard.svg' },
  { id: 'modules', label: 'Learning Path', icon: 'learning.svg' },
  { id: 'progress', label: 'Progress', icon: 'progress.svg' },
  { id: 'badges', label: 'Badges', icon: 'badges.svg' },
  { id: 'classes', label: 'Classes', icon: 'classes.svg' },
  { id: 'surveys', label: 'Survey Results', icon: 'quiz.svg' },
]

const roleChoices = [
  { id: 'student', title: 'Student', subtitle: 'Access your lessons, quizzes, and progress', icon: 'student.svg' },
  { id: 'teacher', title: 'Teacher', subtitle: 'Monitor classes and guide learners', icon: 'teacher.svg' },
  { id: 'administrator', title: 'Administrator', subtitle: 'Manage users, content, and platform settings', icon: 'admin.svg' },
]

function Dashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview')
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [journeyLoaded, setJourneyLoaded] = useState(user.role !== 'student')
  const [questions, setQuestions] = useState([])
  const [activities, setActivities] = useState([])
  const [questionsError, setQuestionsError] = useState('')
  const [dashboardData, setDashboardData] = useState({ classes: [], progress: [], surveys: [], badges: [], attempts: [], xpPoints: 0 })
  const [preTestQuestions, setPreTestQuestions] = useState([])
  const [postTestQuestions, setPostTestQuestions] = useState([])
  const [preTestComplete, setPreTestComplete] = useState(false)
  const [needsClass, setNeedsClass] = useState(false)
  const [journey, setJourney] = useState(null)
  const [rewardNotice, setRewardNotice] = useState(null)
  const [surveyRetake, setSurveyRetake] = useState(null)
  const [retakeLoading, setRetakeLoading] = useState('')
  const [retakeError, setRetakeError] = useState('')
  const [retakeMessage, setRetakeMessage] = useState('')
  const rewardAudioContext = useRef(null)
  const staffNavigation = navigation.filter((item) => ['overview', 'classes'].includes(item.id))
  const roleNavigation = user.role === 'student' ? [...navigation, { id: 'post-test', label: 'Post-test', icon: 'quiz.svg' }, { id: 'profile', label: 'Profile', icon: 'profile.svg' }] : user.role === 'administrator' ? [...staffNavigation, { id: 'assignments', label: 'Assignments', icon: 'quiz.svg' }, { id: 'management', label: 'Manage Content', icon: 'learning.svg' }, { id: 'gamification', label: 'XP & Badges', icon: 'badges.svg' }, { id: 'monitoring', label: 'Monitoring', icon: 'progress.svg' }] : [...staffNavigation, { id: 'assignments', label: 'Assignments', icon: 'quiz.svg' }, { id: 'monitoring', label: 'Monitoring', icon: 'progress.svg' }]
  const adminNavigation = user.role === 'administrator' ? [...roleNavigation, { id: 'users', label: 'Manage Users', icon: 'profile.svg' }, { id: 'research', label: 'Research & Evidence', icon: 'progress.svg' }] : roleNavigation
  const activeLabel = activeView === 'survey-retake' ? `Retake ${surveyRetake?.phase === 'pre' ? 'pre-test' : 'post-test'} survey` : needsClass && user.role === 'student' && activeView !== 'overview' ? 'Classes' : adminNavigation.find((item) => item.id === activeView)?.label

  async function startSurveyRetake(phase) {
    setRetakeLoading(phase)
    setRetakeError('')
    setRetakeMessage('')
    try {
      const rows = await api.get(`/api/${phase}-test?retake=1`)
      setSurveyRetake({ phase, questions: rows })
      setActiveView('survey-retake')
    } catch (error) { setRetakeError(error.message) }
    finally { setRetakeLoading('') }
  }

  async function finishSurveyRetake(result) {
    await handleReward(result)
    setSurveyRetake(null)
    setRetakeMessage('Your survey retake has been saved separately. Your original responses are unchanged.')
    setActiveView('surveys')
  }

  useEffect(() => {
    if (!rewardNotice) return undefined
    const timeout = window.setTimeout(() => setRewardNotice(null), 7000)
    return () => window.clearTimeout(timeout)
  }, [rewardNotice])

  function unlockRewardSound() {
    if (!window.AudioContext) return
    const context = rewardAudioContext.current || new window.AudioContext()
    rewardAudioContext.current = context
    if (context.state === 'suspended') {
      context.resume().catch((audioError) => console.warn('Unable to enable reward sound:', audioError))
    }
  }

  function playRewardSound() {
    const context = rewardAudioContext.current
    if (!context || context.state !== 'running') return

    const now = context.currentTime
    ;[880, 1174].forEach((frequency, index) => {
      const start = now + index * 0.14
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      volume.gain.setValueAtTime(0.0001, start)
      volume.gain.exponentialRampToValueAtTime(0.16, start + 0.025)
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.24)
      oscillator.connect(volume)
      volume.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.25)
    })
  }

  async function handleReward(reward) {
    const badges = reward?.newBadges || []
    const earnedXp = Number(reward?.earnedXp || 0)
    if (earnedXp > 0 || badges.length) {
      setRewardNotice({ earnedXp, badges })
      playRewardSound()
    }

    try {
      setDashboardData(await api.get('/api/dashboard'))
      if (user.role === 'student') {
        const state = await api.get('/api/me/journey')
        setJourney(state)
        if (state.preTestDone) {
          const [moduleRows, activityRows] = await Promise.all([api.get('/api/modules'), api.get('/api/activities')])
          setQuestions(moduleRows)
          setActivities(activityRows)
        }
        if (state.allModulesComplete && !state.postTestDone) setPostTestQuestions(await api.get('/api/post-test'))
      }
    } catch (refreshError) {
      setQuestionsError(`Reward received, but dashboard refresh failed: ${refreshError.message}`)
    }
  }

  async function handlePreTestComplete(result) {
    setPreTestComplete(true)
    setDashboardData((current) => ({
      ...current,
      surveys: [...current.surveys.filter((survey) => survey.phase !== 'pre'), { phase: 'pre', score: result.score ?? null, rating_mean: result.ratingMean ?? null }],
    }))
    await handleReward(result)
    try {
      const [moduleRows, activityRows] = await Promise.all([
        api.get('/api/modules'),
        api.get('/api/activities'),
      ])
      setQuestions(moduleRows)
      setActivities(activityRows)
    } catch (loadError) {
      setQuestionsError(loadError.message)
    }
  }

  useEffect(() => {
    fetch('/api/dashboard', {
      headers: {  },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load dashboard data')
        return response.json()
      })
      .then((data) => {
        setDashboardData(data)
        if (user.role === 'student') api.get('/api/me/journey').then(setJourney).catch((error) => setQuestionsError(error.message)).finally(() => setJourneyLoaded(true))
        const joinedClass = user.role !== 'student' || data.classes.some((item) => Number(item.joined) === 1 || item.joined === true)
        setNeedsClass(!joinedClass)
        if (!joinedClass) return null
        const completed = user.role !== 'student' || data.surveys.some((survey) => survey.phase === 'pre')
        setPreTestComplete(completed)
        if (completed && user.role === 'student') {
          const headers = {  }
          return Promise.all([
            fetch('/api/modules', { headers }).then((response) => { if (!response.ok) throw new Error('Unable to load questions'); return response.json() }),
            fetch('/api/activities', { headers }).then((response) => { if (!response.ok) throw new Error('Unable to load activities'); return response.json() }),
          ]).then(([moduleRows, activityRows]) => {
            setQuestions(moduleRows)
            setActivities(activityRows)
            const totalModules = new Set(moduleRows.map((question) => question.module_id)).size
            const completedModules = data.progress.filter((item) => item.status === 'complete').length
            if (user.role === 'student' && totalModules > 0 && completedModules >= totalModules) {
              return fetch('/api/post-test', { headers }).then((postResponse) => { if (!postResponse.ok) throw new Error('Unable to load post-test'); return postResponse.json() }).then(setPostTestQuestions)
            }
            return null
          })
        }
        if (user.role !== 'student') return null
        return fetch('/api/pre-test', { headers: {  } })
          .then((response) => { if (!response.ok) throw new Error('Unable to load pre-test'); return response.json() })
          .then(setPreTestQuestions)
      })
      .catch((error) => { setQuestionsError(error.message); setJourneyLoaded(true) })
      .finally(() => setDashboardLoading(false))
  }, [user.role])

  async function handleClassJoined(reward) {
    await handleReward(reward)
    const headers = {  }
    try {
      const [dashboardResponse, preTestResponse] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/pre-test', { headers }),
      ])
      if (!dashboardResponse.ok || !preTestResponse.ok) throw new Error('Unable to load the pre-test')
      const dashboard = await dashboardResponse.json()
      const preTest = await preTestResponse.json()
      setDashboardData(dashboard)
      setJourney(await api.get('/api/me/journey'))
      setPreTestQuestions(preTest)
      setNeedsClass(false)
      setPreTestComplete(false)
      setActiveView('overview')
    } catch (joinError) {
      setQuestionsError(joinError.message)
    }
  }

  if (dashboardLoading || !journeyLoaded) return <main className="auth-shell"><section className="auth-card"><div className="brand-mark"><StreamlineIcon name="shield.svg" /></div><h1>Loading QualityCraft…</h1><p className="intro">Getting your workspace ready.</p></section></main>

  return (
    <main className={user.role === 'student' ? 'app-shell' : 'app-shell staff-workspace'} onPointerDownCapture={unlockRewardSound} onKeyDownCapture={unlockRewardSound}>
      <a className="skip-link" href="#workspace-content">Skip to workspace</a>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><StreamlineIcon name="shield.svg" /></div>
          <div>
            <strong>QualityCraft</strong>
            <span>Learn Software Testing</span>
          </div>
        </div>
        {user.role === 'student' && <div className="sidebar-xp"><div><strong>Level {Math.floor(Number(dashboardData.xpPoints || 0) / 500) + 1} · Quality Learner</strong><span>⚡ {dashboardData.xpPoints || 0} XP</span></div><progress max="500" value={Number(dashboardData.xpPoints || 0) % 500} /><small>{journey?.completedModuleIds?.length || 0} of {journey?.moduleIds?.length || 0} modules complete</small></div>}
        <span className="workspace-menu-label">YOUR WORKSPACE</span>
        <nav className="app-nav" aria-label="Workspace navigation">
          {adminNavigation.map((item) => (
            <button
              type="button"
              className={needsClass && user.role === 'student' && item.id !== 'classes' && item.id !== 'overview' ? 'nav-item locked' : activeView === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => { if (!needsClass || item.id === 'classes' || item.id === 'overview') setActiveView(item.id) }}
              aria-disabled={needsClass && user.role === 'student' && item.id !== 'classes' && item.id !== 'overview'}
              aria-current={activeView === item.id ? 'page' : undefined}
              title={needsClass && user.role === 'student' && item.id !== 'classes' && item.id !== 'overview' ? 'Join a class to unlock' : undefined}
              key={item.id}
            >
              <span className="nav-icon"><StreamlineIcon name={item.icon.endsWith('.svg') ? item.icon : 'dashboard.svg'} /></span>
              <span>{item.label}</span>
              {needsClass && user.role === 'student' && item.id !== 'classes' && item.id !== 'overview' && <span className="nav-lock" aria-hidden="true">&#128274;</span>}
            </button>
          ))}
        </nav>
        {user.role === 'student' && <div className="sidebar-tip"><span aria-hidden="true">✦</span><strong>A little better, every day.</strong><p>Your next great skill starts with one small step.</p><button type="button" onClick={() => setActiveView(needsClass ? 'classes' : 'modules')}>Let’s learn <span aria-hidden="true">↗</span></button></div>}
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
          </div>
          <button type="button" className="logout-button" onClick={onLogout}>↪ <span>Sign Out</span></button>
        </div>
      </aside>

      <section className="workspace" id="workspace-content" tabIndex={-1}>
        <header className="workspace-header">
          <div>
            <span className="eyebrow">{user.role === 'administrator' ? 'Admin workspace' : `${user.role} workspace`}</span>
            <h1>{activeLabel}</h1>
            {activeView === 'overview' && user.role === 'student' && <p className="workspace-subtitle">A fresh chance to learn something great.</p>}
          </div>
          <div className="header-status">{user.role === 'student' && <span className="header-level">✦ Level {Math.floor(Number(dashboardData.xpPoints || 0) / 500) + 1}</span>}<span className="header-avatar">{user.name.charAt(0).toUpperCase()}</span><span className="header-user-name">{user.name}</span><button type="button" className="mobile-signout" onClick={onLogout}>Sign out</button></div>
        </header>

        {needsClass && activeView === 'overview' && <Overview data={dashboardData} questions={questions} journey={journey} onNavigate={setActiveView} user={user} />}
        {needsClass && activeView === 'classes' && <ClassesView user={user} onJoined={handleClassJoined} onNavigate={setActiveView} />}
        {!needsClass && !preTestComplete && <PreTestView questions={preTestQuestions} onComplete={handlePreTestComplete} />}
        {!needsClass && preTestComplete && activeView === 'overview' && (user.role === 'student' ? <Overview data={dashboardData} questions={questions} journey={journey} onNavigate={setActiveView} user={user} /> : <StaffOverview role={user.role} onNavigate={setActiveView} />)}
        {!needsClass && preTestComplete && activeView === 'classes' && <ClassesView user={user} onJoined={handleReward} onNavigate={setActiveView} />}
        {preTestComplete && activeView === 'modules' && <ModuleQuestions onNavigate={setActiveView} questions={questions} activities={activities} attempts={dashboardData?.attempts || []} journey={journey} error={questionsError} onXpEarned={handleReward} />}
        {preTestComplete && activeView === 'post-test' && <PostTestView questions={postTestQuestions} progress={dashboardData.progress} moduleCount={new Set(questions.map((question) => question.module_id)).size} completedResponse={journey?.postTestDone ? dashboardData.surveys.find((item) => item.phase === 'post') : null} onReward={handleReward} onNavigate={setActiveView} QuestionControl={QuestionControl} SuitabilityForm={SuitabilityForm} />}
        {preTestComplete && activeView === 'progress' && <ProgressView progress={dashboardData.progress} questions={questions} attempts={dashboardData.attempts || []} journey={journey} error={questionsError} onNavigate={setActiveView} />}
        {preTestComplete && activeView === 'surveys' && <SurveyResults surveys={dashboardData.surveys} retakes={dashboardData.surveyRetakes || []} onRetake={startSurveyRetake} loading={retakeLoading} error={retakeError} message={retakeMessage} onNavigate={setActiveView} />}
        {preTestComplete && activeView === 'survey-retake' && surveyRetake && <><div className="dashboard-content survey-retake-controls"><button type="button" className="secondary-small" onClick={() => { setSurveyRetake(null); setActiveView('surveys') }}>Cancel retake</button></div>{surveyRetake.phase === 'pre' ? <PreTestView key={surveyRetake.questions[0]?.assessmentToken} questions={surveyRetake.questions} onComplete={finishSurveyRetake} isRetake /> : <PostTestView key={surveyRetake.questions[0]?.assessmentToken} questions={surveyRetake.questions} progress={dashboardData.progress} moduleCount={new Set(questions.map((question) => question.module_id)).size} completedResponse={null} onReward={finishSurveyRetake} onNavigate={setActiveView} QuestionControl={QuestionControl} SuitabilityForm={SuitabilityForm} isRetake />}</>}
        {preTestComplete && activeView === 'badges' && <BadgesView badges={dashboardData.badges} onContinue={() => setActiveView('modules')} />}
        {preTestComplete && activeView === 'profile' && user.role === 'student' && <ProfileView user={user} data={dashboardData} journey={journey} onNavigate={setActiveView} />}
        {activeView === 'management' && user.role === 'administrator' && <ContentAdmin />}
        {activeView === 'gamification' && user.role === 'administrator' && <GamificationAdmin />}
        {activeView === 'monitoring' && <Monitoring />}
        {activeView === 'assignments' && user.role !== 'student' && <TeacherAssignments />}
        {activeView === 'users' && <UsersView />}
        {activeView === 'research' && user.role === 'administrator' && <ResearchAdmin />}
      </section>
      {rewardNotice && <div className="reward-notification" role="status" aria-live="polite">
        <span className="reward-notification-icon" aria-hidden="true">🎉</span>
        <div className="reward-notification-content">
          <strong>Reward received!</strong>
          {rewardNotice.earnedXp > 0 && <span>+{rewardNotice.earnedXp} XP earned</span>}
          {rewardNotice.badges.map((badge) => <span key={badge.badgeId}>🏅 New badge: {badge.name}</span>)}
        </div>
        <button type="button" aria-label="Dismiss reward notification" onClick={() => setRewardNotice(null)}>×</button>
      </div>}
    </main>
  )
}

function UsersView() {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [account, setAccount] = useState({ name: '', email: '', password: '', role: 'student' })
  const [message, setMessage] = useState('')
  function loadUsers() { fetch('/api/management/users', { headers: {  } }).then((response) => { if (!response.ok) throw new Error('Unable to load users'); return response.json() }).then(setUsers).catch((loadError) => setError(loadError.message)) }
  useEffect(() => { loadUsers() }, [])
  function updateAccount(event) { setAccount({ ...account, [event.target.name]: event.target.value }) }
  async function createAccount(event) { event.preventDefault(); setError(''); setMessage(''); const response = await fetch('/api/management/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account) }); const data = await response.json(); if (!response.ok) { setError(data.message); return } setMessage(`Created ${data.role} account for ${data.email}`); setAccount({ name: '', email: '', password: '', role: 'student' }); loadUsers() }
  async function updateRole(userId, role) { const response = await fetch(`/api/management/users/${userId}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }); if (!response.ok) { const data = await response.json(); setError(data.message); return } loadUsers() }
  return <div className="dashboard-content"><div className="section-intro"><div><h2>Manage users</h2><p>Create accounts and assign the role that controls each workspace.</p></div><span className="badge-count">{users.length} users</span></div><section className="panel account-create-panel"><h2>Create account</h2><form onSubmit={createAccount}><div className="account-fields"><label>Name<input name="name" value={account.name} onChange={updateAccount} required /></label><label>Email<input name="email" type="email" value={account.email} onChange={updateAccount} required /></label><label>Password<input name="password" type="password" minLength="8" value={account.password} onChange={updateAccount} required /></label><label>Role<select name="role" value={account.role} onChange={updateAccount}><option value="student">Student</option><option value="teacher">Teacher</option><option value="administrator">Administrator</option></select></label></div><button type="submit" className="primary-small">Create account</button>{message && <p className="success-message">{message}</p>}</form></section>{error && <p className="error-message">{error}</p>}<section className="panel table-panel"><div className="table-header"><span>Name</span><span>Email</span><span>Role</span><span>Action</span></div>{users.map((item) => <div className="table-row" key={item.user_id}><strong>{item.name}</strong><span>{item.email}</span><span className="table-highlight">{item.role}</span><select value={item.role} onChange={(event) => updateRole(item.user_id, event.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="administrator">Admin</option></select></div>)}</section></div>
}

function PreTestView({ questions, onComplete, isRetake = false }) {
  const isRating = questions.length > 0 && questions.every((question) => question.type === 'rating')
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitPreTest(event) {
    event.preventDefault()
    setError('')
    if (questions.some((question) => !answers[question.question_id])) {
      setError('Answer every question before submitting')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/pre-test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assessmentToken: questions[0]?.assessmentToken, answers: questions.map((question) => answers[question.question_id]) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to submit pre-test')
      setResult(data)
      setTimeout(() => onComplete(data), 900)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="dashboard-content pre-test-page"><div className="section-intro"><div><span className="eyebrow">Required first step</span><h2>{isRetake ? 'Retake pre-test survey' : isRating ? 'Pre-test survey' : 'Pre-test'}</h2><p>{isRetake ? 'Rate your understanding now. This response is saved separately from your original survey.' : isRating ? 'Before learning, tell us how much you agree with each statement about your understanding of software testing.' : 'Answer these questions before starting the learning modules.'}</p></div><span className="badge-count">{questions.length} {isRating ? 'statements' : 'questions'}</span></div><section className="panel pre-test-panel">{isRating && <p className="understanding-survey-intro">There are no right or wrong answers. Choose one rating for each statement: 1 = Strongly disagree, 2 = Disagree, 3 = Neither agree nor disagree, 4 = Agree, 5 = Strongly agree.</p>}<form onSubmit={submitPreTest}><ol>{questions.map((question) => <li key={question.question_id}><fieldset className="assessment-question"><legend>{question.question_text}</legend><QuestionControl question={question} value={answers[question.question_id] || ''} onChange={(value) => setAnswers({ ...answers, [question.question_id]: value })} /></fieldset></li>)}</ol>{error && <p className="error-message" role="alert">{error}</p>}{result && <p className="quiz-result" role="status">{result.responseType === 'rating' ? 'Pre-test survey complete. Your responses have been saved.' : `Pre-test complete: ${result.score}%`}</p>}<button type="submit" className="primary-small" disabled={submitting || !questions.length || Boolean(result)}>{submitting ? 'Submitting...' : 'Submit pre-test'}</button></form></section></div>
}


const suitabilityItems = [
  'The software testing topics were understandable.',
  'The lesson length and difficulty were appropriate.',
  'I could learn at my own pace.',
  'The navigation and feedback were clear.',
  'The points and badges helped me stay motivated.',
  'I would like to learn more about software testing.',
]

function SuitabilityForm() {
  const [answers, setAnswers] = useState(Array(6).fill(0))
  const [comment, setComment] = useState('')
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/api/suitability').then((row) => setComplete(Boolean(row))).catch((failure) => setError(failure.message)) }, [])
  async function submit(event) {
    event.preventDefault()
    try { await api.post('/api/suitability', { answers, comment }); setComplete(true); setError('') }
    catch (failure) { setError(failure.message) }
  }
  if (complete) return <section className="panel pre-test-panel"><h2>Suitability feedback received</h2><p>Thank you for sharing your experience.</p></section>
  return <section className="panel pre-test-panel"><h2>Tell us about your experience</h2><p>Rate each statement from 1 (strongly disagree) to 5 (strongly agree).</p><form onSubmit={submit}>{suitabilityItems.map((item, index) => <label key={item}>{item}<select required value={answers[index] || ''} onChange={(event) => setAnswers((current) => current.map((value, position) => position === index ? Number(event.target.value) : value))}><option value="">Choose a rating</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}<label>Optional suggestion<textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength="1000" /></label>{error && <p className="error-message">{error}</p>}<button className="primary-small">Submit feedback</button></form></section>
}

function ModuleQuestions(props) {
  return <LearningPath {...props} ActivityForm={ActivityForm} QuestionControl={QuestionControl} />
}

const activityFields = {
  test_case: [['title', 'Test case title'], ['input', 'Input or test data'], ['steps', 'Steps to perform'], ['expectedResult', 'Expected result'], ['actualResult', 'Actual result']],
  bug_report: [['title', 'Bug title'], ['steps', 'Steps to reproduce'], ['expectedResult', 'Expected result'], ['actualResult', 'Actual result'], ['severity', 'Severity']],
  reflection: [['improvement', 'Quality improvement'], ['measurement', 'How will you measure it?']],
}

function ActivityForm({ activity, onXpEarned }) {
  const fields = activityFields[activity.activity_type] || activityFields.reflection
  const savedContent = typeof activity.content === 'string' ? JSON.parse(activity.content) : (activity.content || {})
  const [content, setContent] = useState(savedContent)
  const [state, setState] = useState(activity.submission_id ? 'Saved' : '')

  async function submitActivity(event) {
    event.preventDefault()
    setState('Saving...')
    try {
      const response = await fetch(`/api/activities/${activity.activity_id}/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to save activity')
      await onXpEarned(data)
      setState(data.earnedXp ? `Submitted +${data.earnedXp} XP` : 'Saved')
    } catch (submitError) {
      setState(submitError.message)
    }
  }

  return <form className="activity-form" onSubmit={submitActivity}>
    <div className="activity-heading"><div><span className="question-type">Practical activity</span><h3>{activity.title}</h3></div><span className={activity.status === 'reviewed' || state.includes('Submitted') || state === 'Saved' ? 'pill complete' : 'pill'}>{activity.status === 'reviewed' ? 'Reviewed' : state || (activity.is_required ? 'Required' : 'Optional')}</span></div>
    <p>{activity.instructions}</p>
    {(activity.assignments || []).map((assignment) => <p className="assignment-notice" key={assignment.assignment_id}><strong>Assigned by {assignment.class_name}</strong><span>{assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleString()}` : 'No due date'}</span></p>)}
    {activity.feedback && <aside className="activity-review-feedback" aria-label="Teacher feedback"><strong>Teacher feedback</strong><p>{activity.feedback}</p>{activity.reviewed_at && <small>Reviewed {new Date(activity.reviewed_at).toLocaleDateString()}</small>}<small>Saving changed work sends it for a new review.</small></aside>}
    {fields.map(([name, label]) => <label key={name}>{label}{name === 'severity' ? <select value={content[name] || ''} onChange={(event) => setContent({ ...content, [name]: event.target.value })} required><option value="">Select severity</option><option>Low</option><option>Medium</option><option>High</option></select> : <textarea value={content[name] || ''} onChange={(event) => setContent({ ...content, [name]: event.target.value })} rows={name === 'title' ? 2 : 3} required />}</label>)}
    <button type="submit" className="secondary-small" disabled={state === 'Saving...'}>Save activity</button>
  </form>
}

function Overview({ data, questions, journey, onNavigate, user }) {
  return <StudentOverview data={data} questions={questions} journey={journey} onNavigate={onNavigate} user={user} />
}

function StaffOverview({ role, onNavigate }) {
  const [summary, setSummary] = useState(null)
  const [classes, setClasses] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([api.get('/api/management/analytics'), api.get('/api/management/classes')])
      .then(([analytics, classRows]) => { setSummary(analytics); setClasses(classRows) })
      .catch((failure) => setError(failure.message))
  }, [])
  if (onNavigate) {
    const isAdmin = role === 'administrator'
    return <div className={`dashboard-content staff-dashboard ${isAdmin ? 'admin-dashboard' : 'teacher-dashboard'}`}>
      <section className="staff-hero"><div className="staff-hero-copy"><span className="staff-hero-kicker">{isAdmin ? 'Platform control centre' : 'Teaching overview'}</span><h2>{isAdmin ? 'Keep learning organised and moving.' : 'Guide every learner forward.'}</h2><p>{isAdmin ? 'Manage content, people, rewards, and learning outcomes from one clear workspace.' : 'Spot progress, support learners, and review practical work from one place.'}</p><div className="staff-hero-actions"><button type="button" className="staff-primary-action" onClick={() => onNavigate('monitoring')}>Open monitoring <span aria-hidden="true">→</span></button><button type="button" className="staff-secondary-action" onClick={() => onNavigate('classes')}>View classes</button></div></div><div className="staff-hero-visual" aria-hidden="true"><span className="staff-orbit orbit-one" /><span className="staff-orbit orbit-two" /><span className="staff-hero-icon"><StreamlineIcon name={isAdmin ? 'progress.svg' : 'classes.svg'} /></span><span className="staff-mini-card card-one"><strong>{summary?.studentCount ?? '—'}</strong> learners</span><span className="staff-mini-card card-two"><strong>{summary?.activitiesAwaitingReview ?? '—'}</strong> to review</span></div></section>
      {error && <p className="error-message">{error}</p>}
      {summary ? <div className="metric-grid staff-metrics"><Metric label="Students" value={summary.studentCount} detail="Enrolled learners" tone="blue" /><Metric label="Classes" value={classes.length} detail="Available to you" tone="green" /><Metric label="Average quiz" value={summary.averageQuizScore == null ? '—' : `${summary.averageQuizScore}%`} detail="Highest score per quiz" tone="amber" /><Metric label="Activities to review" value={summary.activitiesAwaitingReview} detail="Student submissions" tone="rose" /></div> : <p className="empty-state">Loading classroom summary…</p>}
      <section className="staff-quick-grid"><button type="button" onClick={() => onNavigate('monitoring')}><span className="staff-quick-icon"><StreamlineIcon name="progress.svg" /></span><span><strong>Review learner progress</strong><small>Scores, completion, feedback, and exports</small></span><span aria-hidden="true">→</span></button><button type="button" onClick={() => onNavigate('classes')}><span className="staff-quick-icon"><StreamlineIcon name="classes.svg" /></span><span><strong>Manage your classes</strong><small>Create classes and see enrolment</small></span><span aria-hidden="true">→</span></button>{isAdmin && <button type="button" onClick={() => onNavigate('management')}><span className="staff-quick-icon"><StreamlineIcon name="learning.svg" /></span><span><strong>Shape the curriculum</strong><small>Edit modules, lessons, quizzes, and activities</small></span><span aria-hidden="true">→</span></button>}{isAdmin && <button type="button" onClick={() => onNavigate('users')}><span className="staff-quick-icon"><StreamlineIcon name="profile.svg" /></span><span><strong>Manage access</strong><small>Create accounts and assign roles</small></span><span aria-hidden="true">→</span></button>}</section>
    </div>
  }
  return <div className="dashboard-content"><div className="welcome-banner"><div><span className="eyebrow">{role === 'administrator' ? 'Administrator workspace' : 'Teacher workspace'}</span><h2>Guide every learner forward.</h2><p>Use class monitoring to see progress and review practical work.</p></div></div>{error && <p className="error-message">{error}</p>}{summary ? <div className="metric-grid"><Metric label="Students" value={summary.studentCount} detail="Enrolled learners" tone="blue" /><Metric label="Classes" value={classes.length} detail="Available to you" tone="green" /><Metric label="Average quiz" value={summary.averageQuizScore == null ? '—' : `${summary.averageQuizScore}%`} detail="Highest score per quiz" tone="amber" /><Metric label="Activities to review" value={summary.activitiesAwaitingReview} detail="Student submissions" tone="rose" /></div> : <p className="empty-state">Loading classroom summary…</p>}</div>
}

function Metric({ label, value, detail, tone }) {
  return <div className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}


function QuestionControl({ question, value, onChange }) {
  if (question.type === 'rating') {
    return <div className="understanding-rating-options">{['Strongly disagree', 'Disagree', 'Neither agree nor disagree', 'Agree', 'Strongly agree'].map((label, index) => <label key={label}><input type="radio" name={`question-${question.question_id}`} value={String(index + 1)} checked={value === String(index + 1)} onChange={(event) => onChange(event.target.value)} required /><span><strong>{index + 1}</strong>{label}</span></label>)}</div>
  }
  const options = readQuestionOptions(question.options)

  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    return <div className="answer-options">{options.map((option) => <label className="answer-option" key={option}><input type="radio" name={`question-${question.question_id}`} value={option} checked={value === option} onChange={(event) => onChange(event.target.value)} /><span>{option}</span></label>)}</div>
  }

  return <input className="answer-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Type your answer" />
}


function App() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    localStorage.removeItem('qualitycraft_token')
    api.get('/api/me').then(setUser).catch(() => {}).finally(() => setRestoring(false))
  }, [])

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function submitForm(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const endpoint = isRegistering ? 'register' : 'login'
      const requestBody = isRegistering ? form : { email: form.email, password: form.password }
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed')
      }

      setUser(data.user)
      setForm({ name: '', email: '', password: '' })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    api.post('/api/auth/logout').finally(() => { setUser(null); setSelectedRole(null); setIsRegistering(false) })
  }

  if (restoring) return <main className="auth-shell"><section className="auth-card"><h1>Loading QualityCraft…</h1></section></main>

  if (user) {
    return <Dashboard user={user} onLogout={logout} />
  }

  if (!selectedRole) return <main className="role-page"><section className="role-hero"><div className="hero-doodle hero-doodle-one" aria-hidden="true">TEST</div><div className="hero-doodle hero-doodle-two" aria-hidden="true">PASS!</div><div className="role-logo"><StreamlineIcon name="shield.svg" /></div><span className="hero-kicker">The software testing learning studio</span><h1>Build with curiosity.<br />Test with confidence.</h1><p>Hands-on lessons that turn quality thinking into a real-world craft.</p><div className="role-tags"><span>Self-paced lessons</span><span>Practical challenges</span><span>Badges & XP</span></div></section><section className="role-list"><div className="role-list-heading"><span>01</span><p className="role-prompt">Choose your workspace</p></div>{roleChoices.map((role) => <button type="button" className={`role-choice role-${role.id}`} key={role.id} onClick={() => { setSelectedRole(role); setIsRegistering(false); setError('') }}><span className="role-icon"><StreamlineIcon name={role.icon} /></span><span className="role-copy"><strong>{role.title}</strong><small>{role.subtitle}</small></span><span className="role-arrow">↗</span></button>)}<p className="role-note">Made for curious Malaysian secondary school students · Form 4 & 5</p></section></main>

  return (
    <main className="auth-shell student-auth">
      <header className="auth-topbar"><button type="button" onClick={() => { setSelectedRole(null); setIsRegistering(false); setError(''); setShowPassword(false) }}><span aria-hidden="true">←</span> Back to roles</button><span className="auth-topbar-note">A little curiosity. A lot of possibility.</span></header>
      <div className="auth-layout">
      <section className="auth-story" aria-label="Welcome to QualityCraft">
        <div className="auth-wordmark"><span className="brand-mark"><StreamlineIcon name="shield.svg" /></span><span>QualityCraft<small>Learn. Test. Level up.</small></span></div>
        <div className="auth-story-copy"><span className="auth-story-kicker"><span aria-hidden="true">✦</span> BIG SKILLS START SMALL</span><h2>Get curious.<br />Build confidence.<br /><em>Make your mark.</em></h2><p>Discover software testing through real challenges,<br className="desktop-break" /> small wins, and a little adventure.</p></div>
        <div className="auth-mascot-scene"><span className="auth-floating-chip chip-code">&lt;/&gt; Think like a tester</span><TesterMascot /><span className="auth-floating-chip chip-win"><span aria-hidden="true">✓</span> Great things ahead</span></div>
        <div className="auth-feature-strip"><div><StreamlineIcon name="learning.svg" /><span>Bite-sized<br /><strong>lessons</strong></span></div><div><StreamlineIcon name="quiz.svg" /><span>Hands-on<br /><strong>challenges</strong></span></div><div><StreamlineIcon name="celebrate.svg" /><span>Well-earned<br /><strong>rewards</strong></span></div></div>
      </section>
      <section className="auth-card student-signin-card">
        <span className="auth-role-pill"><StreamlineIcon name={selectedRole.icon} />{isRegistering ? 'New student' : `${selectedRole.title} workspace`}</span>
        <h1>{isRegistering ? 'Start something great.' : 'Welcome back.'}<span aria-hidden="true">✦</span></h1>
        <p className="intro">
          {isRegistering ? 'Your testing adventure starts right here. Let’s make it yours.' : 'Your next chapter is waiting. Sign in and pick up where you left off.'}
        </p>

        <form onSubmit={submitForm}>
          {isRegistering && (
            <label>
              Your name
              <input name="name" value={form.name} onChange={updateField} autoComplete="name" placeholder="What should we call you?" required />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" placeholder="you@example.com" required />
          </label>
          <div className="auth-password-group">
            <label htmlFor="account-password">Password</label>
            <div className="password-field"><input id="account-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder={isRegistering ? 'Create a password (8+ characters)' : 'Enter your password'} minLength="8" required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button></div>
          </div>
          {isRegistering && <p className="intro">Student accounts are created here. Ask an administrator for teacher access.</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? 'Getting things ready…' : isRegistering ? 'Create my account' : 'Sign in & keep learning'}<span aria-hidden="true">→</span>
          </button>
        </form>

        {(selectedRole.id === 'student' || isRegistering) && <div className="auth-switch"><p>{isRegistering ? 'Already part of the adventure?' : 'First time here?'}</p><button type="button" className="switch-button" onClick={() => { setIsRegistering(!isRegistering); setError(''); setShowPassword(false) }}>{isRegistering ? 'Sign in to your account' : 'Create a free student account'} <span aria-hidden="true">↗</span></button></div>}
        <p className="auth-progress-note"><StreamlineIcon name="shield.svg" />Your progress, saved for next time.</p>
      </section>
      </div>
      <p className="auth-bottom-note">Made for curious minds · Malaysian secondary school students · Form 4 & 5</p>
    </main>
  )
}

export default App
