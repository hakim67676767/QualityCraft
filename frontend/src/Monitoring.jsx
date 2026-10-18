import { useEffect, useState } from 'react'
import { api, saveResponseAs } from './lib/api'

function readSubmissionContent(content) {
  if (content && typeof content === 'object') return content
  if (typeof content !== 'string') return {}
  try { return JSON.parse(content) } catch { return { response: content } }
}

function formatFieldName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
}

export default function Monitoring() {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [feedback, setFeedback] = useState({})
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [suitability, setSuitability] = useState(null)
  const [offset, setOffset] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const query = classId ? `?classId=${classId}` : ''

  useEffect(() => { api.get('/api/management/classes').then(setClasses).catch((failure) => setError(failure.message)) }, [])
  useEffect(() => {
    let active = true
    Promise.all([
      api.get(`/api/management/reports/students${query}${query ? '&' : '?'}limit=50&offset=${offset}`),
      api.get(`/api/management/analytics${query}`),
      api.get(`/api/management/activity-submissions${query}`),
      api.get(`/api/management/suitability-summary${query}`),
    ]).then(([rows, summary, work, feedbackSummary]) => { if (active) { setStudents(rows); setAnalytics(summary); setSubmissions(work); setSuitability(feedbackSummary); setError(''); setLoading(false) } })
      .catch((failure) => { if (active) { setError(failure.message); setLoading(false) } })
    return () => { active = false }
  }, [query, offset])

  async function download(type) {
    try {
      const path = type === 'csv' ? '/api/management/reports/students.csv' : '/api/management/reports/students.pdf'
      const response = await api.download(`${path}${query}`)
      await saveResponseAs(response, `qualitycraft-student-progress.${type}`)
    } catch (failure) { setError(failure.message) }
  }
  async function review(id) {
    setSaving(true)
    setReviewError('')
    setReviewMessage('')
    try {
      await api.patch(`/api/management/activity-submissions/${id}/review`, { feedback: feedback[id] ?? selectedSubmission.feedback })
      const [work, summary, rows] = await Promise.all([api.get(`/api/management/activity-submissions${query}`), api.get(`/api/management/analytics${query}`), api.get(`/api/management/reports/students${query}${query ? '&' : '?'}limit=50&offset=${offset}`)])
      setSubmissions(work)
      setAnalytics(summary)
      setStudents(rows)
      setReviewMessage('Review saved. The student can now see your feedback.')
    } catch (failure) { setReviewError(failure.message) }
    finally { setSaving(false) }
  }
  const percentage = (value) => value == null ? '—' : `${value}%`

  const submissionStudents = [...new Map(submissions.map((item) => [String(item.user_id), { id: String(item.user_id), name: item.student, className: item.class_name }])).values()]
  const studentSubmissions = submissions.filter((item) => String(item.user_id) === selectedStudentId)
  const selectedSubmission = studentSubmissions.find((item) => String(item.submission_id) === selectedSubmissionId)
  const selectedContent = selectedSubmission ? readSubmissionContent(selectedSubmission.content) : {}
  const fieldOrder = ['title', 'input', 'steps', 'expectedResult', 'actualResult', 'severity', 'improvement', 'measurement']
  const contentFields = Object.entries(selectedContent).sort(([a], [b]) => (fieldOrder.indexOf(a) < 0 ? 99 : fieldOrder.indexOf(a)) - (fieldOrder.indexOf(b) < 0 ? 99 : fieldOrder.indexOf(b)))

  return <div className="dashboard-content monitoring-workspace">
    <div className="section-intro"><div><span className="eyebrow">Teacher reporting</span><h2>Student monitoring</h2><p>See who needs help and export the same class selection.</p></div><div className="report-actions"><select disabled={saving} aria-label="Filter by class" value={classId} onChange={(event) => { setClassId(event.target.value); setOffset(0); setLoading(true); setSelectedStudentId(''); setSelectedSubmissionId(''); setReviewError(''); setReviewMessage('') }}><option value="">All my classes</option>{classes.map((item) => <option key={item.class_id} value={item.class_id}>{item.name}</option>)}</select><button type="button" className="secondary-small" onClick={() => download('csv')}>Export CSV</button><button type="button" className="secondary-small" onClick={() => download('pdf')}>Export PDF</button></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {analytics && <div className="metric-grid monitoring-metrics"><div className="metric-card blue"><span>Students</span><strong>{analytics.studentCount}</strong><small>In this selection</small></div><div className="metric-card green"><span>Average quiz</span><strong>{percentage(analytics.averageQuizScore)}</strong><small>Recorded attempts</small></div><div className="metric-card amber"><span>Post-test complete</span><strong>{percentage(analytics.postTestCompletionRate)}</strong><small>Students with a result</small></div><div className="metric-card rose"><span>Activities to review</span><strong>{analytics.activitiesAwaitingReview}</strong><small>Submitted work</small></div></div>}
    <section className="panel admin-editor practical-review" aria-busy={loading}><div className="practical-review-heading"><div><span className="eyebrow">Submitted work</span><h2>Practical activity review</h2><p>Select a learner and activity to review their work and leave feedback.</p></div>{submissions.length > 0 && <span className="badge-count">{submissions.length} submissions</span>}</div>{loading ? <p className="empty-state" role="status">Loading submitted work…</p> : submissions.length ? <><div className="review-selectors"><label>Student<select disabled={saving} value={selectedStudentId} onChange={(event) => { setSelectedStudentId(event.target.value); setSelectedSubmissionId(''); setReviewError(''); setReviewMessage('') }}><option value="">Select a student</option>{submissionStudents.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.className}</option>)}</select></label><label>Activity<select value={selectedSubmissionId} disabled={!selectedStudentId || saving} onChange={(event) => { setSelectedSubmissionId(event.target.value); setReviewError(''); setReviewMessage('') }}><option value="">{selectedStudentId ? 'Select an activity' : 'Choose a student first'}</option>{studentSubmissions.map((item) => <option key={item.submission_id} value={item.submission_id}>{item.activity} · {item.status}</option>)}</select></label></div>{!selectedStudentId && <div className="review-empty-state"><span aria-hidden="true">01</span><div><strong>Choose a student to begin</strong><p>The activity menu will show only work submitted by that learner.</p></div></div>}{selectedStudentId && !selectedSubmission && <div className="review-empty-state"><span aria-hidden="true">02</span><div><strong>Choose an activity</strong><p>Select one submission to view its details and add feedback.</p></div></div>}{selectedSubmission && <article className="selected-submission"><header><div><span className="review-student-name">{selectedSubmission.student}</span><h3>{selectedSubmission.activity}</h3><p>{selectedSubmission.class_name}{selectedSubmission.submitted_at ? ` · Submitted ${new Date(selectedSubmission.submitted_at).toLocaleDateString()}` : ''}</p></div><span className={`review-status ${selectedSubmission.status === 'reviewed' ? 'is-reviewed' : ''}`}>{selectedSubmission.status}</span></header><div className="submission-fields">{contentFields.map(([field, value]) => <div className="submission-field" key={field}><span>{formatFieldName(field)}</span><p>{String(value ?? '—')}</p></div>)}</div><div className="review-feedback"><label>Teacher feedback<textarea disabled={saving} rows="4" placeholder="Write clear, helpful feedback for this learner…" value={feedback[selectedSubmission.submission_id] ?? selectedSubmission.feedback ?? ''} onChange={(event) => setFeedback((current) => ({ ...current, [selectedSubmission.submission_id]: event.target.value }))} /></label>{reviewError && <p className="error-message" role="alert">{reviewError}</p>}{reviewMessage && <p className="review-confirmation" role="status">{reviewMessage}</p>}<div className="review-save-row"><small>{selectedSubmission.status === 'reviewed' ? 'This activity has been reviewed. You can update the feedback.' : 'Saving feedback marks this activity as reviewed.'}</small><button type="button" className="primary-small" disabled={saving || !(feedback[selectedSubmission.submission_id] ?? selectedSubmission.feedback ?? '').trim()} onClick={() => review(selectedSubmission.submission_id)}>{saving ? 'Saving…' : 'Save review'}</button></div></div></article>}</> : <p className="empty-state">No activities submitted yet.</p>}</section>
    <h2 className="monitoring-progress-heading">Student progress</h2>
    <section className="panel table-panel monitoring-panel"><div className="table-header monitoring-header"><span>Student</span><span>Class</span><span>Modules</span><span>Quiz average</span><span>Pre / Post</span><span>XP</span></div>{loading ? <p className="empty-state">Loading progress…</p> : students.length ? students.map((item) => <div className="table-row monitoring-row" key={item.userId}><div><strong>{item.student}</strong><small>{item.email}</small><small>{item.feedbackStatus}</small></div><span>{item.className || '—'}</span><span>{item.completedModules} / {item.totalModules}</span><span>{percentage(item.quizAverage)}</span><span>{item.preRatingMean == null ? percentage(item.preScore) : `${item.preRatingMean} / 5`} · {item.postRatingMean == null ? percentage(item.postScore) : `${item.postRatingMean} / 5`}</span><span className="table-highlight">{item.xpPoints} XP</span></div>) : <p className="empty-state">No students in this selection yet.</p>}</section>
    <div className="report-actions"><button type="button" className="secondary-small" disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - 50)); setLoading(true) }}>Previous</button><span>Page {Math.floor(offset / 50) + 1}</span><button type="button" className="secondary-small" disabled={students.length < 50} onClick={() => { setOffset(offset + 50); setLoading(true) }}>Next</button></div>
    {suitability && <details className="panel admin-editor monitoring-suitability"><summary>Suitability feedback</summary><p>{suitability.responses} student responses · average ratings out of 5</p><div className="suitability-summary">{['Understanding', 'Lesson fit', 'Self-paced learning', 'Navigation', 'Motivation', 'Interest'].map((label, index) => <div key={label}><span>{label}</span><strong>{suitability.averages[index] ?? '—'}</strong></div>)}</div></details>}
  </div>
}
