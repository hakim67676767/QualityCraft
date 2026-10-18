import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'
import { CraftIcon } from './StudentExperience'
import './classes.css'

export default function ClassesView({ user, onJoined, onNavigate }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [joining, setJoining] = useState(null)
  const [joinError, setJoinError] = useState(null)
  const [className, setClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [message, setMessage] = useState('')
  const canCreate = user.role !== 'student'
  const isAdmin = user.role === 'administrator'

  const loadClasses = useCallback(() => api.get(user.role === 'student' ? '/api/classes' : '/api/management/classes'), [user.role])

  useEffect(() => {
    let active = true
    loadClasses().then((rows) => { if (active) { setClasses(rows); setLoading(false) } })
      .catch((error) => { if (active) { setLoadError(error.message); setLoading(false) } })
    return () => { active = false }
  }, [loadClasses])

  async function refreshClasses() {
    try {
      const rows = await loadClasses()
      setClasses(rows)
      setLoadError('')
    }
    catch (error) { setLoadError(error.message) }
    finally { setLoading(false) }
  }

  async function joinClass(item) {
    setJoining(item.class_id)
    setJoinError(null)
    setMessage('')
    try {
      const result = await api.post(`/api/classes/${item.class_id}/join`)
      await refreshClasses()
      setMessage(`You have joined ${item.name}.`)
      if (onJoined) await onJoined(result)
    } catch (error) { setJoinError({ id: item.class_id, message: error.message }) }
    finally { setJoining(null) }
  }

  async function createClass(event) {
    event.preventDefault()
    setCreateError('')
    if (!className.trim()) { setCreateError('Enter a class name.'); return }
    setCreating(true)
    setMessage('')
    try {
      const result = await api.post('/api/classes', { name: className.trim() })
      setClassName('')
      setQuery('')
      setMessage(`${result.name} is ready for students to join.`)
      await refreshClasses()
    } catch (error) { setCreateError(error.message) }
    finally { setCreating(false) }
  }

  const joined = classes.filter((item) => Number(item.joined) === 1)
  const available = classes.filter((item) => !Number(item.joined))
  const term = query.trim().toLocaleLowerCase()
  const matches = (item) => `${item.name} ${item.teacher}`.toLocaleLowerCase().includes(term)
  const sections = canCreate
    ? [{ id: 'teaching', title: isAdmin ? 'All classes' : 'Your teaching classes', description: isAdmin ? 'Classes across your learning community.' : 'The classrooms you lead.', rows: classes }]
    : [{ id: 'joined', title: 'Your classes', description: 'Your teachers and classmates, all in one place.', rows: joined }, { id: 'available', title: 'Available to join', description: 'Find the class name shared by your teacher.', rows: available }]

  function classCard(item) {
    const enrolled = canCreate || Number(item.joined) === 1
    const members = Number(canCreate ? item.students : item.members) || 0
    return <li key={item.class_id}>
      <article className="class-card" aria-labelledby={`class-title-${item.class_id}`} data-joined={enrolled}>
        <div className="class-card-top"><span className="class-icon"><CraftIcon name="classes.svg" /></span><span className="class-status">{canCreate ? isAdmin ? 'Classroom' : 'Teaching' : enrolled ? 'Joined' : 'Open to join'}</span></div>
        <h4 id={`class-title-${item.class_id}`}>{item.name}</h4>
        <div className="class-teacher"><span className="class-teacher-avatar" aria-hidden="true">{item.teacher?.charAt(0).toUpperCase() || 'T'}</span><div><small>Teacher</small><p>{item.teacher}</p></div></div>
        <div className="class-members"><CraftIcon name="student.svg" /><span><strong>{members}</strong> {members === 1 ? 'student' : 'students'} enrolled</span></div>
        <footer className="class-card-footer">{canCreate ? <p>Students can find this class by its name.</p> : enrolled ? <><span>You're part of this class</span><button type="button" className="class-text-action" onClick={() => onNavigate('modules')}>Go to learning path <span aria-hidden="true">→</span></button></> : <><span>Ready to learn together?</span><button type="button" className="primary-small" aria-describedby={`class-title-${item.class_id}${joinError?.id === item.class_id ? ` class-join-error-${item.class_id}` : ''}`} disabled={joining !== null} onClick={() => joinClass(item)}>{joining === item.class_id ? 'Joining...' : 'Join class'}</button></>}</footer>
        {joinError?.id === item.class_id && <p className="error-message" id={`class-join-error-${item.class_id}`} role="alert">{joinError.message}</p>}
      </article>
    </li>
  }

  return <div className="dashboard-content classes-workspace">
    <header className="classes-intro"><span className="eyebrow">{canCreate ? 'Your classroom workspace' : 'Learn together'}</span><h2>{canCreate ? 'A space for every class.' : 'Your learning community.'}</h2><p>{canCreate ? 'Bring learners together, set practical work, and follow their progress.' : 'Connect with your teacher, join your classmates, and keep learning.'}</p></header>
    <section className="classes-summary" aria-label="Class summary"><div className="classes-summary-copy"><span className="classes-summary-icon"><CraftIcon name="classes.svg" /></span><div><h3>{canCreate ? isAdmin ? 'Your school, connected.' : 'Good learning starts together.' : joined.length ? 'You have a place to learn.' : 'Find your class. Make a start.'}</h3><p>{canCreate ? 'Create a classroom, then share its name with your students.' : 'Choose the class your teacher has asked you to join. Your lessons live in the Learning Path.'}</p></div></div><dl className="classes-counts"><div><dt>{canCreate ? 'Classes' : 'Joined'}</dt><dd>{loading ? '—' : canCreate ? classes.length : joined.length}</dd></div><div><dt>{canCreate ? 'Enrolments' : 'Available'}</dt><dd>{loading ? '—' : canCreate ? classes.reduce((sum, item) => sum + Number(item.students || 0), 0) : available.length}</dd></div></dl></section>
    <p className="classes-message" role="status">{message}</p>
    <div className="classes-layout">
      <div className="classes-directory">
        <div className="classes-toolbar"><label htmlFor="class-search">Find a class</label><div className="classes-search"><input id="class-search" type="search" placeholder="Search class or teacher name" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" className="class-text-action" onClick={() => setQuery('')}>Clear search</button>}</div></div>
        {loadError && <div className="classes-load-error"><p className="error-message" role="alert">{loadError}</p><button type="button" className="secondary-small" disabled={loading} onClick={() => { setLoading(true); refreshClasses() }}>Try again</button></div>}
        <div aria-busy={loading}>{loading ? <p className="classes-empty" role="status">Loading classes…</p> : !loadError && sections.map((section) => {
          const visible = section.rows.filter(matches)
          return <section className="classes-section" key={section.id} aria-labelledby={`classes-${section.id}`}><div className="classes-section-heading"><div><h3 id={`classes-${section.id}`}>{section.title} <span>{section.rows.length}</span></h3><p>{section.description}</p></div></div>{visible.length ? <ul className="class-grid">{visible.map(classCard)}</ul> : <div className="classes-empty"><CraftIcon name="classes.svg" /><h4>{term ? 'No matching classes' : canCreate ? 'Your next class starts here' : section.id === 'joined' ? 'You haven’t joined a class yet' : 'No other classes available'}</h4><p>{term ? 'Try another class or teacher name.' : canCreate ? 'Use the Create a class panel to welcome your first learners.' : section.id === 'joined' ? 'Look below for the class your teacher shared with you.' : 'Ask your teacher if you are expecting another class.'}</p>{term && <button type="button" className="class-text-action" onClick={() => setQuery('')}>Clear search</button>}{!term && canCreate && <a href="#new-class-name">Create your first class →</a>}</div>}</section>
        })}</div>
        <span className="sr-only" role="status">{!loading && term ? `${classes.filter(matches).length} matching classes` : ''}</span>
      </div>
      <aside className="classes-side" aria-label={canCreate ? 'Class tools' : 'Getting started'}>
        {canCreate ? <><section className="classes-side-panel"><span className="eyebrow">Welcome your learners</span><h3>Create a class</h3><p>Give your class a name your students will recognise.</p><form className="create-class-form" onSubmit={createClass}><label htmlFor="new-class-name">Class name</label><input id="new-class-name" placeholder="New class name" value={className} onChange={(event) => { setClassName(event.target.value); setCreateError('') }} required maxLength={150} aria-describedby={`class-name-help${createError ? ' class-create-error' : ''}`} aria-invalid={createError ? true : undefined} disabled={creating} /><small id="class-name-help">For example, Software Testing · Group A</small>{createError && <p className="error-message" id="class-create-error" role="alert">{createError}</p>}<button type="submit" className="primary-small" disabled={creating}>{creating ? 'Creating...' : 'Create class'}</button></form></section><section className="classes-side-panel classes-tools"><h3>Keep your class moving</h3><button type="button" onClick={() => onNavigate('assignments')}><CraftIcon name="quiz.svg" /><span><strong>Set practical work</strong><small>Create and manage assignments</small></span><span aria-hidden="true">→</span></button><button type="button" onClick={() => onNavigate('monitoring')}><CraftIcon name="progress.svg" /><span><strong>Follow student progress</strong><small>Review activities and give feedback</small></span><span aria-hidden="true">→</span></button></section></> : <section className="classes-side-panel"><span className="eyebrow">A simple start</span><h3>From class to confidence</h3><ol className="classes-steps"><li><strong>Find your teacher’s class</strong><p>Check the class and teacher name before joining.</p></li><li><strong>Share your starting point</strong><p>Complete the pre-test survey when prompted.</p></li><li><strong>Learn and practise</strong><p>Follow the Learning Path for lessons, activities, and quizzes.</p></li></ol>{joined.length > 0 && <button type="button" className="secondary-small" onClick={() => onNavigate('modules')}>Open Learning Path <span aria-hidden="true">→</span></button>}</section>}
      </aside>
    </div>
  </div>
}
