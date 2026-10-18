import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api'
import './teacher-assignments.css'

function normalizePayload(payload = {}) {
  return {
    classes: Array.isArray(payload.classes) ? payload.classes : [],
    activities: Array.isArray(payload.activities) ? payload.activities : [],
    assignments: Array.isArray(payload.assignments) ? payload.assignments : [],
  }
}

function formatDate(value) {
  if (!value) return 'No due date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TeacherAssignments() {
  const [data, setData] = useState({ classes: [], activities: [], assignments: [] })
  const [form, setForm] = useState({ classId: '', activityId: '', dueAt: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadAssignments() {
    setError('')
    try {
      setData(normalizePayload(await api.get('/api/management/assignments')))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.get('/api/management/assignments')
      .then((payload) => { if (active) setData(normalizePayload(payload)) })
      .catch((failure) => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const groupedActivities = useMemo(() => {
    const groups = new Map()
    data.activities.forEach((activity) => {
      const label = activity.module_title || activity.module_name || 'Other activities'
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(activity)
    })
    return [...groups.entries()]
  }, [data.activities])

  async function createAssignment(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await api.post(`/api/management/classes/${form.classId}/assignments`, {
        activityId: Number(form.activityId),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      })
      setForm((current) => ({ ...current, activityId: '', dueAt: '' }))
      setMessage('Activity assigned successfully.')
      await loadAssignments()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeAssignment(assignment) {
    const activityName = assignment.activity_title || assignment.activity || 'this activity'
    if (!window.confirm(`Remove ${activityName} from this class?`)) return
    setError('')
    setMessage('')
    setDeletingId(assignment.assignment_id)
    try {
      await api.remove(`/api/management/assignments/${assignment.assignment_id}`)
      setMessage('Assignment removed.')
      await loadAssignments()
    } catch (failure) {
      setError(failure.message)
    } finally {
      setDeletingId(null)
    }
  }

  return <div className="dashboard-content teacher-assignments">
    <div className="section-intro assignment-intro">
      <div><span className="eyebrow">Class planning</span><h2>Activity assignments</h2><p>Choose a practical activity for a class and set an optional due date.</p></div>
      <span className="badge-count">{data.assignments.length} assigned</span>
    </div>

    {error && <p className="error-message" role="alert">{error}</p>}
    {message && <p className="admin-message" role="status">{message}</p>}

    <section className="panel assignment-create-panel" aria-labelledby="new-assignment-heading">
      <div className="assignment-panel-heading"><span aria-hidden="true">01</span><div><h3 id="new-assignment-heading">Assign an activity</h3><p>Students see assignments and due dates in their learning path. Due dates are reminders; the curriculum's required activities control quiz access.</p></div></div>
      <form className="assignment-form" onSubmit={createAssignment}>
        <label htmlFor="assignment-class">Class<select id="assignment-class" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} required disabled={loading || saving}><option value="">Select a class</option>{data.classes.map((item) => <option key={item.class_id} value={item.class_id}>{item.name || item.class_name}</option>)}</select></label>
        <label htmlFor="assignment-activity">Practical activity<select id="assignment-activity" value={form.activityId} onChange={(event) => setForm({ ...form, activityId: event.target.value })} required disabled={loading || saving}><option value="">Select an activity</option>{groupedActivities.map(([moduleName, activities]) => <optgroup label={moduleName} key={moduleName}>{activities.map((activity) => <option key={activity.activity_id} value={activity.activity_id}>{activity.title || activity.activity_title}</option>)}</optgroup>)}</select></label>
        <label htmlFor="assignment-due">Due date <span>(optional)</span><input id="assignment-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} disabled={loading || saving} /></label>
        <button type="submit" className="primary-small" disabled={loading || saving || !form.classId || !form.activityId}>{saving ? 'Assigning…' : 'Assign activity'}</button>
      </form>
    </section>

    <section className="panel assignment-list-panel" aria-labelledby="current-assignments-heading">
      <div className="assignment-list-heading"><div><span aria-hidden="true">02</span><div><h3 id="current-assignments-heading">Current assignments</h3><p>Review activities already shared with your classes.</p></div></div></div>
      {loading ? <p className="empty-state" role="status">Loading assignments…</p> : data.assignments.length ? <div className="assignment-table-wrap"><table className="assignment-table"><thead><tr><th scope="col">Activity</th><th scope="col">Class</th><th scope="col">Module</th><th scope="col">Due date</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.assignments.map((assignment) => <tr key={assignment.assignment_id}><td><strong>{assignment.activity_title || assignment.activity}</strong></td><td>{assignment.class_name || assignment.class}</td><td>{assignment.module_title || assignment.module_name || '—'}</td><td><span className={assignment.due_at ? 'assignment-due' : 'assignment-no-due'}>{formatDate(assignment.due_at)}</span></td><td><button type="button" className="assignment-remove" onClick={() => removeAssignment(assignment)} disabled={deletingId === assignment.assignment_id} aria-label={`Remove ${assignment.activity_title || assignment.activity || 'activity'} from ${assignment.class_name || assignment.class || 'class'}`}>{deletingId === assignment.assignment_id ? 'Removing…' : 'Remove'}</button></td></tr>)}</tbody></table></div> : <div className="assignment-empty"><span aria-hidden="true">✓</span><div><strong>No activities assigned yet</strong><p>Use the form above to add the first activity to a class.</p></div></div>}
    </section>
  </div>
}
