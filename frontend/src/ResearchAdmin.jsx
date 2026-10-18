import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, saveResponseAs } from './lib/api'
import './research-admin.css'
import UnderstandingResearchSummary from './UnderstandingResearchSummary'

const blankParticipant = {
  userId: '',
  guardianConsent: false,
  studentAssent: false,
  schoolPermission: false,
}

const blankInstrument = {
  phase: 'pre',
  title: '',
  version: '1.0',
  status: 'draft',
  items: [{ prompt: '', type: 'rating', optionsText: '', answerKey: '', constructKey: '' }],
}

const defaultSettings = {
  researchModeEnabled: false,
  allowPublicRegistration: true,
  requireResearchAuthorisation: false,
}

function rowsFrom(payload, key) {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload?.[key]) ? payload[key] : []
}

function valueFrom(object, ...keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null) return object[key]
  }
  return ''
}

function dateTime(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function normaliseSettings(payload) {
  if (Array.isArray(payload)) {
    return payload.reduce((result, item) => {
      const key = item.setting_key || item.key
      let value = item.setting_value ?? item.value
      if (value === 'true' || value === '1' || value === 1) value = true
      if (value === 'false' || value === '0' || value === 0) value = false
      if (key) result[key] = value
      return result
    }, { ...defaultSettings })
  }
  return { ...defaultSettings, ...(payload?.settings || payload || {}) }
}

export default function ResearchAdmin() {
  const [participants, setParticipants] = useState([])
  const [eligibleUsers, setEligibleUsers] = useState([])
  const [participantForm, setParticipantForm] = useState(blankParticipant)
  const [participantEdits, setParticipantEdits] = useState({})
  const [instruments, setInstruments] = useState([])
  const [instrumentForm, setInstrumentForm] = useState(blankInstrument)
  const [editingInstrumentId, setEditingInstrumentId] = useState('')
  const [summary, setSummary] = useState({})
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      api.get('/api/admin/research-participants'),
      api.get('/api/admin/assessment-instruments'),
      api.get('/api/admin/research-summary'),
      api.get('/api/admin/audit-logs'),
      api.get('/api/admin/settings'),
    ])
    const [participantResult, instrumentResult, summaryResult, logResult, settingResult] = results
    if (participantResult.status === 'fulfilled') {
      setParticipants(rowsFrom(participantResult.value, 'participants'))
      setEligibleUsers(rowsFrom(participantResult.value, 'eligibleUsers'))
      setParticipantEdits({})
    }
    if (instrumentResult.status === 'fulfilled') setInstruments(rowsFrom(instrumentResult.value, 'instruments'))
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value?.summary || summaryResult.value || {})
    if (logResult.status === 'fulfilled') setLogs(rowsFrom(logResult.value, 'logs'))
    if (settingResult.status === 'fulfilled') setSettings(normaliseSettings(settingResult.value))
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) setError(failures[0].reason?.message || 'Some research administration data could not be loaded.')
    setLoading(false)
  }, [])

  useEffect(() => { Promise.resolve().then(loadAll) }, [loadAll])

  const authorisedCount = useMemo(
    () => participants.filter((item) => String(item.status).toLowerCase() === 'authorised').length,
    [participants],
  )

  const understanding = summary.understanding || {}
  const useRatings = instruments.some((item) => item.status === 'published' && item.items?.length && item.items.every((question) => question.type === 'rating')) || understanding.responseCount > 0

  async function run(action, successMessage, refresh = loadAll) {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await action()
      if (refresh) await refresh()
      setMessage(successMessage)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function download(path, filename) {
    await run(async () => {
      const response = await api.download(path)
      await saveResponseAs(response, filename)
    }, `${filename} downloaded.`, null)
  }

  function editInstrument(instrument) {
    const locked = instrument.status !== 'draft'
    setEditingInstrumentId(locked ? '' : String(instrument.instrument_id || instrument.id))
    setInstrumentForm({
      phase: instrument.phase || 'pre',
      title: instrument.title || '',
      version: locked ? '' : instrument.version || '1.0',
      status: 'draft',
      items: (instrument.items || []).map((item) => ({ ...item, optionsText: (item.options || []).join('\n') })),
    })
    setMessage(locked ? 'Questions copied. Enter a new version to save a separate instrument.' : '')
  }

  async function saveInstrument(event) {
    event.preventDefault()
    const body = { ...instrumentForm, items: instrumentForm.items.map(({ optionsText, ...item }) => ({ ...item, options: item.type === 'multiple_choice' ? optionsText.split('\n').map((option) => option.trim()).filter(Boolean) : [] })) }
    const saved = await run(
      () => editingInstrumentId
        ? api.patch(`/api/admin/assessment-instruments/${editingInstrumentId}`, body)
        : api.post('/api/admin/assessment-instruments', body),
      editingInstrumentId ? 'Assessment instrument updated.' : 'Assessment instrument created.',
    )
    if (saved) { setEditingInstrumentId(''); setInstrumentForm(blankInstrument) }
  }

  function updateItem(index, field, value) {
    setInstrumentForm((current) => ({ ...current, items: current.items.map((item, position) => position === index ? { ...item, [field]: value } : item) }))
  }

  return <div className="dashboard-content research-admin">
    <div className="section-intro research-admin-intro">
      <div>
        <span className="eyebrow">Administrator</span>
        <h2>Research and evidence</h2>
        <p>Control participant consent, assessment versions, anonymised results, and system evidence.</p>
      </div>
      <button type="button" className="secondary-small" onClick={loadAll} disabled={loading || busy}>Refresh data</button>
    </div>

    {loading && <p className="panel research-notice" role="status">Loading research records...</p>}
    {message && <p className="panel research-notice success" role="status">{message}</p>}
    {error && <p className="panel research-notice error" role="alert">{error}</p>}

    <div className="research-metrics" aria-label="Research status summary">
      <div><span>Registered</span><strong>{participants.length}</strong><small>Research records</small></div>
      <div><span>Authorised</span><strong>{authorisedCount}</strong><small>All approvals recorded</small></div>
      <div><span>{useRatings ? 'Matched surveys' : 'Valid pairs'}</span><strong>{useRatings ? understanding.validPairs || 0 : valueFrom(summary, 'validPairs', 'valid_pairs', 'pairedCount') || 0}</strong><small>Before and after learning</small></div>
      <div><span>{useRatings ? 'Average rating change' : 'Average gain'}</span><strong>{useRatings ? understanding.averageChange ?? '—' : valueFrom(summary, 'averageGain', 'average_gain', 'meanGain') || 0}</strong><small>{useRatings ? 'Points on the 1–5 scale' : 'Percentage points'}</small></div>
    </div>

    <nav className="research-section-nav" aria-label="Research sections">
      <a href="#research-participants">Participants <span>{participants.length}</span></a>
      <a href="#research-assessments">Assessments <span>{instruments.length}</span></a>
      <a href="#research-results">Results and exports</a>
      <a href="#research-settings">Settings and audit</a>
    </nav>

    <section id="research-participants" tabIndex={-1} className="panel research-section" aria-labelledby="participant-heading">
      <div className="research-section-heading">
        <div><span className="research-kicker">Participant control</span><h3 id="participant-heading">Consent and study codes</h3><p>Only authorise students after every required approval has been recorded.</p></div>
      </div>
      <form className="research-enrol-form" onSubmit={async (event) => {
        event.preventDefault()
        const saved = await run(() => api.post('/api/admin/research-participants', { ...participantForm, userId: Number(participantForm.userId) }), 'Participant record created.')
        if (saved) setParticipantForm(blankParticipant)
      }}>
        <label>Student
          <select required disabled={loading || !eligibleUsers.length} value={participantForm.userId} onChange={(event) => setParticipantForm((value) => ({ ...value, userId: event.target.value }))}><option value="">{eligibleUsers.length ? 'Select a student' : 'No unenrolled students available'}</option>{eligibleUsers.map((user) => <option key={user.user_id || user.id} value={user.user_id || user.id}>{user.name || user.email} ({user.email})</option>)}</select>
        </label>
        <fieldset><legend>Approvals received</legend>
          {[
            ['guardianConsent', 'Guardian consent'],
            ['studentAssent', 'Student assent'],
            ['schoolPermission', 'School permission'],
          ].map(([key, label]) => <label className="research-check" key={key}><input type="checkbox" checked={participantForm[key]} onChange={(event) => setParticipantForm((value) => ({ ...value, [key]: event.target.checked }))} /> {label}</label>)}
        </fieldset>
        <button className="primary-small" disabled={busy || !participantForm.userId}>Create record</button>
      </form>
      <div className="research-table-wrap" role="region" aria-label="Research participants" tabIndex="0">
        <table><thead><tr><th scope="col">Study code</th><th scope="col">Student</th><th scope="col">Approvals</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody>{participants.map((participant) => {
            const id = participant.participant_id || participant.id
            const draft = participantEdits[id] || { guardianConsent: Boolean(participant.guardian_consent), studentAssent: Boolean(participant.student_assent), schoolPermission: Boolean(participant.school_permission), status: participant.status }
            const complete = draft.guardianConsent && draft.studentAssent && draft.schoolPermission
            return <tr key={id}><td><code>{participant.study_code}</code></td><td><strong>{participant.name}</strong><small>{participant.email}</small></td><td>{[['guardianConsent', 'Guardian consent'], ['studentAssent', 'Student assent'], ['schoolPermission', 'School permission']].map(([key, label]) => <label className="research-check" key={key}><input type="checkbox" disabled={busy} checked={draft[key]} aria-label={`${label} for ${participant.name}`} onChange={(event) => setParticipantEdits((current) => ({ ...current, [id]: { ...draft, [key]: event.target.checked, status: !event.target.checked && draft.status === 'authorised' ? 'pending' : draft.status } }))} />{label}</label>)}</td><td><select aria-label={`Change status for ${participant.study_code}`} value={draft.status} disabled={busy} onChange={(event) => setParticipantEdits((current) => ({ ...current, [id]: { ...draft, status: event.target.value } }))}><option value="pending">Pending</option><option value="authorised" disabled={!complete}>Authorised</option><option value="withdrawn">Withdrawn</option></select></td><td><button type="button" className="secondary-small" disabled={busy || !participantEdits[id]} onClick={() => run(() => api.patch(`/api/admin/research-participants/${id}`, draft), 'Participant approvals and status updated.')}>Save approvals</button></td></tr>
          })}{!participants.length && <tr><td colSpan="5" className="research-empty">No research participants have been registered.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <div className="research-workflow">
      <section id="research-assessments" tabIndex={-1} className="panel research-section" aria-labelledby="instrument-heading">
        <div className="research-section-heading"><div><span className="research-kicker">Version control</span><h3 id="instrument-heading">Assessment instruments</h3><p>Keep pre-test and post-test questions tied to a named version.</p></div></div>
        <div className="research-assessment-layout"><div className="research-library"><h4>Saved versions</h4><p>Select a draft to edit, or copy a published assessment.</p><div className="research-instrument-list">{instruments.map((instrument) => <div key={instrument.instrument_id}><button type="button" className={String(instrument.instrument_id) === editingInstrumentId ? 'selected' : ''} onClick={() => editInstrument(instrument)}><span>{String(instrument.phase).toUpperCase()} · v{instrument.version}</span><strong>{instrument.title}</strong><small>{instrument.status} · {instrument.items.length} items · {instrument.status === 'draft' ? 'Edit draft' : 'Copy to a new version'}</small></button>{instrument.status === 'published' && <button type="button" disabled={busy} onClick={() => run(() => api.patch(`/api/admin/assessment-instruments/${instrument.instrument_id}`, { status: 'retired' }), 'Instrument retired.')}>Retire instrument</button>}</div>)}{!instruments.length && <p className="research-empty">No versioned instruments yet.</p>}</div>
        </div><form className="research-instrument-form" onSubmit={saveInstrument}>
          <div className="research-editor-intro"><h4>{editingInstrumentId ? 'Edit assessment draft' : 'Create an assessment'}</h4><p>Set the version details, then add the questions students will answer.</p></div>
          <div className="research-form-grid"><label>Phase<select value={instrumentForm.phase} onChange={(event) => setInstrumentForm((value) => ({ ...value, phase: event.target.value }))}><option value="pre">Pre-test</option><option value="post">Post-test</option></select></label><label>Version<input required value={instrumentForm.version} onChange={(event) => setInstrumentForm((value) => ({ ...value, version: event.target.value }))} /></label></div>
          <label>Instrument title<input required value={instrumentForm.title} onChange={(event) => setInstrumentForm((value) => ({ ...value, title: event.target.value }))} /></label>
          <label>Status<select value={instrumentForm.status} onChange={(event) => setInstrumentForm((value) => ({ ...value, status: event.target.value }))}><option value="draft">Draft</option><option value="published">Published</option><option value="retired">Retired</option></select></label>
          {instrumentForm.items.map((item, index) => <fieldset className="research-question-editor" key={index}><legend>Question {index + 1}</legend><label>Question<textarea required value={item.prompt} onChange={(event) => updateItem(index, 'prompt', event.target.value)} /></label><label>Type<select value={item.type} onChange={(event) => updateItem(index, 'type', event.target.value)}><option value="rating">Survey rating (1–5)</option><option value="multiple_choice">Multiple choice</option><option value="true_false">True / false</option><option value="short_answer">Short answer</option></select></label>{item.type === 'multiple_choice' && <label>Answer choices, one per line<textarea required value={item.optionsText} onChange={(event) => updateItem(index, 'optionsText', event.target.value)} /></label>}{item.type !== 'rating' && <label>Correct answer{item.type === 'true_false' ? <select required value={item.answerKey} onChange={(event) => updateItem(index, 'answerKey', event.target.value)}><option value="">Choose the answer</option><option>True</option><option>False</option></select> : <input required value={item.answerKey} onChange={(event) => updateItem(index, 'answerKey', event.target.value)} />}</label>}{item.type === 'rating' && <p className="understanding-results-note">1 = Strongly disagree · 2 = Disagree · 3 = Neither agree nor disagree · 4 = Agree · 5 = Strongly agree. No answer key or score.</p>}<label>{item.type === 'rating' ? 'Learning concept key (same in pre and post)' : 'Learning concept (optional)'}<input required={item.type === 'rating'} value={item.constructKey || ''} onChange={(event) => updateItem(index, 'constructKey', event.target.value)} /></label><button type="button" className="secondary-small" disabled={instrumentForm.items.length === 1} onClick={() => setInstrumentForm((current) => ({ ...current, items: current.items.filter((_, position) => position !== index) }))}>Remove question</button></fieldset>)}
          <button type="button" className="secondary-small" onClick={() => setInstrumentForm((current) => ({ ...current, items: [...current.items, { ...blankInstrument.items[0] }] }))}>Add question</button>
          <div className="research-actions"><button className="primary-small" disabled={busy}>{editingInstrumentId ? 'Save instrument' : 'Create instrument'}</button>{editingInstrumentId && <button type="button" className="secondary-small" onClick={() => { setEditingInstrumentId(''); setInstrumentForm(blankInstrument) }}>Cancel edit</button>}</div>
        </form></div>
      </section>

      <section id="research-results" tabIndex={-1} className="panel research-section" aria-labelledby="analysis-heading">
        <div className="research-section-heading"><div><span className="research-kicker">Anonymised analysis</span><h3 id="analysis-heading">{useRatings ? 'Understanding survey results' : 'Paired results'}</h3><p>Research exports use study codes and exclude learner names and email addresses.</p></div><button type="button" className="primary-small" disabled={busy} onClick={() => download('/api/admin/research-export.csv', 'qualitycraft-anonymised-research.csv')}>Export CSV</button></div>
        {useRatings && <UnderstandingResearchSummary summary={understanding} />}
        {!useRatings && <><dl className="research-summary-list">
          <div><dt>Eligible participants</dt><dd>{valueFrom(summary, 'eligibleParticipants', 'eligible_participants') || 0}</dd></div>
          <div><dt>Valid pre/post pairs</dt><dd>{valueFrom(summary, 'validPairs', 'valid_pairs', 'pairedCount') || 0}</dd></div>
          <div><dt>Incomplete or excluded</dt><dd>{valueFrom(summary, 'excludedCount', 'excluded_count', 'incompleteCount') || 0}</dd></div>
          <div><dt>Mean gain</dt><dd>{valueFrom(summary, 'averageGain', 'average_gain', 'meanGain') || 0}</dd></div>
          <div><dt>Median gain</dt><dd>{valueFrom(summary, 'medianGain', 'median_gain') || 0}</dd></div>
          <div><dt>Standard deviation</dt><dd>{valueFrom(summary, 'standardDeviation', 'standard_deviation', 'sd') || 0}</dd></div>
          <div><dt>Interquartile range</dt><dd>{valueFrom(summary, 'interquartileRange', 'interquartile_range', 'iqr') || 0}</dd></div>
        </dl>
        {summary.instrumentGroups?.length > 0 && <div className="research-frequency"><h4>Assessment versions in these results</h4>{summary.instrumentGroups.map((group) => <div key={`${group.preVersion}:${group.postVersion}`}><span>Pre: {group.preVersion} · Post: {group.postVersion}</span><strong>{group.pairs} pairs</strong></div>)}{summary.instrumentGroups.length > 1 && <p>These totals combine different assessment versions. Use the version columns in the CSV to analyse comparable groups.</p>}</div>}
        </>}
        {useRatings && summary.validPairs > 0 && <p className="understanding-results-note">{summary.validPairs} earlier scored knowledge-test pairs are retained separately in the research export.</p>}
        {summary.suitability && <div className="research-frequency"><h4>Suitability ratings</h4><p>{summary.suitability.responseCount} item ratings · average {summary.suitability.average ?? '—'} / 5</p>{Object.entries(summary.suitability.frequency || {}).map(([rating, count]) => <div key={rating}><span>Rating {rating}</span><strong>{count}</strong></div>)}{Object.entries(summary.suitability.byItem || {}).map(([item, result]) => <div key={item}><span>{item.replace('_', ' ')} · {result.responseCount} ratings</span><strong>{result.average ?? '—'} / 5</strong></div>)}</div>}
      </section>
    </div>

    <div className="research-two-column">
      <section id="research-settings" tabIndex={-1} className="panel research-section" aria-labelledby="settings-heading">
        <div className="research-section-heading"><div><span className="research-kicker">System controls</span><h3 id="settings-heading">Research settings</h3><p>Apply participant safeguards while keeping demonstration data separate.</p></div></div>
        <form className="research-settings" onSubmit={(event) => { event.preventDefault(); run(() => api.patch('/api/admin/settings', settings), 'System settings updated.') }}>
          {[
            ['researchModeEnabled', 'Enable research mode', 'Marks the installation as an active research environment.'],
            ['requireResearchAuthorisation', 'Require research authorisation', 'Only authorised participants can submit research assessments.'],
            ['allowPublicRegistration', 'Allow public registration', 'Lets new demonstration users create their own accounts.'],
          ].map(([key, label, help]) => <label key={key}><span><strong>{label}</strong><small>{help}</small></span><input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings((value) => ({ ...value, [key]: event.target.checked }))} /></label>)}
          <div className="research-actions"><button className="primary-small" disabled={busy}>Save settings</button><button type="button" className="secondary-small" disabled={busy} onClick={() => download('/api/admin/configuration-export', `qualitycraft-configuration-${new Date().toISOString().slice(0, 10)}.json`)}>Export configuration</button></div><small>This export contains content and settings. Ask your system administrator for a full database backup to recover accounts and study records.</small>
        </form>
      </section>

      <section className="panel research-section" aria-labelledby="audit-heading">
        <div className="research-section-heading"><div><span className="research-kicker">Accountability</span><h3 id="audit-heading">Recent audit activity</h3><p>Review administrative changes and the account responsible for each action.</p></div></div>
        <div className="research-audit-list">{logs.slice(0, 12).map((log) => <article key={log.log_id || log.audit_id || log.id}><div><strong>{log.action || log.event_type || 'System change'}</strong><span>{log.entity_type || log.resource_type || 'system'} {log.entity_id || log.resource_id ? `#${log.entity_id || log.resource_id}` : ''}</span></div><div><span>{log.actor_name || log.admin_name || `User ${log.user_id || log.actor_id || ''}`}</span><time dateTime={log.created_at}>{dateTime(log.created_at)}</time></div></article>)}{!logs.length && <p className="research-empty">No audit events have been recorded.</p>}</div>
      </section>
    </div>
  </div>
}
