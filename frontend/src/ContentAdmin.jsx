import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api'
import { CraftIcon } from './StudentExperience'
import './content-workspace.css'

const emptyModule = { title: '', description: '', sequenceNo: 0 }
const emptyLesson = { title: '', content: '', sequenceNo: 1 }
const emptyQuestion = { type: 'multiple_choice', questionText: '', options: '', answerKey: '', explanation: '' }
const emptyActivity = { title: '', activityType: 'test_case', instructions: '', isRequired: false }
const moduleFields = (row) => row ? { title: row.title, description: row.description || '', sequenceNo: row.sequence_no } : emptyModule
const lessonFields = (row) => row ? { title: row.title, content: row.content, sequenceNo: row.sequence_no } : emptyLesson
const typeName = (value) => ({ multiple_choice: 'Multiple choice', true_false: 'True / false', short_answer: 'Short answer', test_case: 'Test case', bug_report: 'Bug report', reflection: 'Reflection' }[value] || value)

export default function ContentAdmin() {
  const [modules, setModules] = useState([])
  const [moduleId, setModuleId] = useState('')
  const [lessons, setLessons] = useState([])
  const [lessonId, setLessonId] = useState('')
  const [questions, setQuestions] = useState([])
  const [activities, setActivities] = useState([])
  const [moduleForm, setModuleForm] = useState(emptyModule)
  const [lessonForm, setLessonForm] = useState(emptyLesson)
  const [questionForm, setQuestionForm] = useState(emptyQuestion)
  const [activityForm, setActivityForm] = useState(emptyActivity)
  const [questionId, setQuestionId] = useState(null)
  const [activityId, setActivityId] = useState(null)
  const [stage, setStage] = useState('module')
  const [preview, setPreview] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadingModules, setLoadingModules] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const deleteDialog = useRef(null)
  const selectedModule = modules.find((item) => String(item.module_id) === moduleId)
  const selectedLesson = lessons.find((item) => String(item.lesson_id) === lessonId)
  const blocked = busy || loadingModules

  const chooseLesson = useCallback((row, resetMessages = true) => {
    setLessonId(row ? String(row.lesson_id) : '')
    setLessonForm(lessonFields(row))
    setQuestions([]); setActivities([])
    setQuestionId(null); setActivityId(null)
    setQuestionForm(emptyQuestion); setActivityForm(emptyActivity)
    setLoadingItems(Boolean(row))
    if (resetMessages) { setNotice(null); setPreview(null) }
    setLoadError(null)
  }, [])

  const chooseModule = useCallback((row) => {
    setModuleId(row ? String(row.module_id) : '')
    setModuleForm(moduleFields(row))
    setLessons([]); setLessonId(''); setLessonForm(emptyLesson)
    setQuestions([]); setActivities([])
    setQuestionId(null); setActivityId(null)
    setQuestionForm(emptyQuestion); setActivityForm(emptyActivity)
    setLoadingLessons(Boolean(row)); setLoadingItems(false)
    setNotice(null); setLoadError(null); setPreview(null)
  }, [])

  useEffect(() => {
    let active = true
    api.get('/api/admin/modules').then((rows) => {
      if (active) { setModules(rows); chooseModule(rows[0] || null); setLoadingModules(false) }
    }).catch((error) => { if (active) { setLoadError({ scope: 'modules', message: error.message }); setLoadingModules(false) } })
    return () => { active = false }
  }, [chooseModule])

  useEffect(() => {
    if (!moduleId) return
    let active = true
    api.get('/api/admin/lessons?moduleId=' + moduleId).then((rows) => {
      if (active) { setLessons(rows); chooseLesson(rows[0] || null, false); setLoadingLessons(false) }
    }).catch((error) => { if (active) { setLoadError({ scope: 'lessons', message: error.message }); setLoadingLessons(false) } })
    return () => { active = false }
  }, [moduleId, chooseLesson])

  useEffect(() => {
    if (!lessonId) return
    let active = true
    Promise.all([api.get('/api/admin/questions?lessonId=' + lessonId), api.get('/api/admin/activities?lessonId=' + lessonId)]).then(([questionRows, activityRows]) => {
      if (active) { setQuestions(questionRows); setActivities(activityRows); setLoadingItems(false) }
    }).catch((error) => { if (active) { setLoadError({ scope: 'items', message: error.message }); setLoadingItems(false) } })
    return () => { active = false }
  }, [lessonId])

  useEffect(() => {
    if (pendingDelete && !deleteDialog.current.open) deleteDialog.current.showModal()
    if (!pendingDelete && deleteDialog.current.open) deleteDialog.current.close()
  }, [pendingDelete])

  function update(setter, field, value) { setter((current) => ({ ...current, [field]: value })) }
  async function refreshModules() {
    const rows = await api.get('/api/admin/modules')
    setModules(rows)
    return rows
  }
  async function refreshLessons() {
    const rows = await api.get('/api/admin/lessons?moduleId=' + moduleId)
    setLessons(rows)
    return rows
  }
  async function refreshItems() {
    const [questionRows, activityRows] = await Promise.all([api.get('/api/admin/questions?lessonId=' + lessonId), api.get('/api/admin/activities?lessonId=' + lessonId)])
    setQuestions(questionRows); setActivities(activityRows)
  }
  async function run(scope, action, success, invalidate = true) {
    setBusy(true); setNotice(null)
    try { await action(); if (invalidate) setPreview(null); if (success) setNotice({ scope, text: success, error: false }) }
    catch (error) { setNotice({ scope, text: error.message, error: true }) }
    finally { setBusy(false) }
  }
  async function retryLoad() {
    setBusy(true)
    try {
      if (loadError.scope === 'modules') { const rows = await refreshModules(); chooseModule(rows[0] || null) }
      else if (loadError.scope === 'lessons') { const rows = await refreshLessons(); chooseLesson(rows[0] || null) }
      else await refreshItems()
      setLoadError(null)
    } catch (error) { setLoadError((current) => ({ ...current, message: error.message })) }
    finally { setBusy(false) }
  }
  function saveModule(event) {
    event.preventDefault()
    run('module', async () => {
      const saved = moduleId ? await api.patch('/api/admin/modules/' + moduleId, moduleForm) : await api.post('/api/admin/modules', moduleForm)
      await refreshModules()
      if (!moduleId) chooseModule(saved)
      else setModuleForm(moduleFields(saved))
    }, moduleId ? 'Module changes saved.' : 'Draft module created. Next, add a lesson.')
  }
  function saveLesson(event) {
    event.preventDefault()
    run('lesson', async () => {
      const body = { ...lessonForm, moduleId: Number(moduleId) }
      const saved = lessonId ? await api.patch('/api/admin/lessons/' + lessonId, body) : await api.post('/api/admin/lessons', body)
      await refreshLessons(); await refreshModules()
      if (!lessonId) chooseLesson(saved)
      else setLessonForm(lessonFields(saved))
    }, lessonId ? 'Lesson changes saved.' : 'Lesson created. Next, add quiz questions and practical activities.')
  }
  function saveQuestion(event) {
    event.preventDefault()
    run('questions', async () => {
      const options = questionForm.options.split('\n').map((line) => line.trim()).filter(Boolean)
      const body = { ...questionForm, lessonId: Number(lessonId), options }
      if (questionId) await api.patch('/api/admin/questions/' + questionId, body)
      else await api.post('/api/admin/questions', body)
      await refreshItems(); setQuestionId(null); setQuestionForm(emptyQuestion)
    }, questionId ? 'Question changes saved.' : 'Question added to this lesson.')
  }
  function saveActivity(event) {
    event.preventDefault()
    run('activities', async () => {
      const body = { ...activityForm, lessonId: Number(lessonId) }
      if (activityId) await api.patch('/api/admin/activities/' + activityId, body)
      else await api.post('/api/admin/activities', body)
      await refreshItems(); setActivityId(null); setActivityForm(emptyActivity)
    }, activityId ? 'Activity changes saved.' : 'Practical activity added to this lesson.')
  }
  function checkPreview() {
    setStage('publish')
    run('publish', async () => { setPreview(await api.get('/api/admin/modules/' + moduleId + '/preview')) }, null, false)
  }
  function changeStatus(status) {
    run('publish', async () => { await api.patch('/api/admin/modules/' + moduleId, { status }); await refreshModules() }, status === 'published' ? 'Module published. Students can find it in their Learning Path.' : 'Module hidden from the student Learning Path.')
  }
  function confirmDelete() {
    const item = pendingDelete
    setPendingDelete(null)
    const scope = { module: 'module', lesson: 'lesson', question: 'questions', activity: 'activities' }[item.kind]
    run(scope, async () => {
      const resource = { module: 'modules', lesson: 'lessons', question: 'questions', activity: 'activities' }[item.kind]
      await api.remove('/api/admin/' + resource + '/' + item.id)
      if (item.kind === 'module') { const rows = await refreshModules(); chooseModule(rows[0] || null); setStage('module') }
      else if (item.kind === 'lesson') { const rows = await refreshLessons(); chooseLesson(rows[0] || null); await refreshModules(); setStage('lesson') }
      else {
        await refreshItems()
        if (item.kind === 'question' && item.id === questionId) { setQuestionId(null); setQuestionForm(emptyQuestion) }
        if (item.kind === 'activity' && item.id === activityId) { setActivityId(null); setActivityForm(emptyActivity) }
      }
    }, 'The ' + item.kind + ' was deleted.')
  }
  function editQuestion(item) {
    setQuestionId(item.question_id)
    setQuestionForm({ type: item.type, questionText: item.question_text, options: (Array.isArray(item.options) ? item.options : []).join('\n'), answerKey: item.answer_key, explanation: item.explanation || '' })
    setNotice(null)
  }
  function editActivity(item) {
    setActivityId(item.activity_id)
    setActivityForm({ title: item.title, activityType: item.activity_type, instructions: item.instructions, isRequired: false })
    setNotice(null)
  }
  function notification(scope) {
    return notice?.scope === scope ? <p className={notice.error ? 'content-notice content-error' : 'content-notice'} role={notice.error ? 'alert' : 'status'}>{notice.text}</p> : null
  }

  const steps = [
    { id: 'module', label: 'Module details', enabled: true },
    { id: 'lesson', label: 'Lessons', enabled: Boolean(moduleId) },
    { id: 'questions', label: 'Quiz questions', enabled: Boolean(lessonId) && !loadingItems },
    { id: 'activities', label: 'Practical activities', enabled: Boolean(lessonId) && !loadingItems },
    { id: 'publish', label: 'Preview & publish', enabled: Boolean(moduleId) },
  ]

  return <div className="dashboard-content content-admin content-workspace">
    <header className="content-intro"><div><span className="eyebrow">Administrator · Course builder</span><h2>Learning content</h2><p>Choose a module, build its lessons, then check and publish your work.</p></div><button type="button" className="primary-small" disabled={blocked} onClick={() => { chooseModule(null); setStage('module') }}>New module <span aria-hidden="true">＋</span></button></header>
    <details className="content-guide" open><summary>How to use this page</summary><ol><li><span aria-hidden="true">01</span><div><strong>Choose or create a module</strong><p>Select an existing topic, or choose New module to start a draft.</p></div></li><li><span aria-hidden="true">02</span><div><strong>Add a lesson</strong><p>Choose New lesson, write the learning material, then save it.</p></div></li><li><span aria-hidden="true">03</span><div><strong>Add questions and activities</strong><p>Select a saved lesson, then build its quiz and practical work.</p></div></li><li><span aria-hidden="true">04</span><div><strong>Preview, then publish</strong><p>Save your edits, check the preview, and resolve any warnings.</p></div></li></ol></details>
    {loadError && <div className="content-load-error"><p role="alert">{loadError.message}</p><button type="button" className="secondary-small" disabled={busy} onClick={retryLoad}>Try again</button></div>}
    <section className="content-context" aria-label="Selected learning content" aria-busy={loadingModules || loadingLessons || loadingItems}><div className="content-context-fields"><label>Choose module<select value={moduleId} disabled={blocked} onChange={(event) => { chooseModule(modules.find((row) => String(row.module_id) === event.target.value) || null); setStage('module') }}><option value="">{loadingModules ? 'Loading modules…' : 'New draft module'}</option>{modules.map((item) => <option key={item.module_id} value={item.module_id}>{item.title} ({item.status})</option>)}</select></label><label>Choose lesson<select value={lessonId} disabled={blocked || !moduleId || loadingLessons} onChange={(event) => { chooseLesson(lessons.find((row) => String(row.lesson_id) === event.target.value) || null); setStage('lesson') }}><option value="">{loadingLessons ? 'Loading lessons…' : !moduleId ? 'Save a module first' : 'New lesson'}</option>{lessons.map((item) => <option key={item.lesson_id} value={item.lesson_id}>{item.title}</option>)}</select></label><button type="button" className="secondary-small" disabled={blocked || !moduleId || loadingLessons} onClick={() => { chooseLesson(null); setStage('lesson') }}>New lesson</button></div><div className="content-context-summary"><span className="content-status" data-status={selectedModule?.status || 'new'}>{selectedModule?.status || 'New draft'}</span><p>{selectedModule ? selectedModule.title + (selectedLesson ? ' / ' + selectedLesson.title : ' / No lesson selected') : 'Create a module to begin. Students see published modules only.'}</p><button type="button" className="content-text-action" disabled={blocked || !moduleId} onClick={checkPreview}>Preview <span aria-hidden="true">→</span></button></div></section>
    <nav className="content-steps" aria-label="Content sections">{steps.map((step, index) => <button type="button" key={step.id} aria-label={step.label} aria-pressed={stage === step.id} disabled={blocked || !step.enabled} title={!step.enabled ? step.id === 'lesson' || step.id === 'publish' ? 'Save or select a module first' : 'Save or select a lesson first' : undefined} onClick={() => { setStage(step.id); setNotice(null) }}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{step.label}</button>)}</nav>
    <section className="content-editor-panel" aria-busy={busy} aria-label="Content editor">
      {stage === 'module' && <><div className="content-editor-heading"><div><span className="eyebrow">Main learning topic</span><h3>{moduleId ? 'Edit module' : 'Create a module'}</h3><p>{moduleId ? 'The fields below update the selected module. Choose New module to create a separate topic.' : 'New modules start as drafts. Add lessons before publishing.'}</p></div><span className="content-mode">{moduleId ? 'Editing existing' : 'Creating new'}</span></div><div className="content-editor-body"><form className="content-form" onSubmit={saveModule}><fieldset disabled={blocked}><label>Module title<input required maxLength={160} value={moduleForm.title} onChange={(event) => update(setModuleForm, 'title', event.target.value)} placeholder="For example, Test Case Design" /></label><label>Description <span className="content-optional">(optional)</span><textarea rows={3} maxLength={1000} value={moduleForm.description} onChange={(event) => update(setModuleForm, 'description', event.target.value)} placeholder="What will students learn in this module?" /></label><label className="content-order">Module order<input type="number" min="0" step="1" value={moduleForm.sequenceNo} onChange={(event) => update(setModuleForm, 'sequenceNo', Number(event.target.value))} aria-describedby="module-order-help" /></label><small id="module-order-help">Lower numbers appear first in the Learning Path. For example: 1, 2, 3.</small>{notification('module')}<div className="content-form-actions"><button className="primary-small" type="submit">{busy ? 'Saving…' : moduleId ? 'Save module' : 'Create draft module'}</button>{moduleId && <button type="button" className="secondary-small" onClick={() => setModuleForm(moduleFields(selectedModule))}>Reset changes</button>}{moduleId && <button type="button" className="content-text-action" onClick={() => setStage('lesson')}>Next: lessons →</button>}</div></fieldset></form><aside className="content-editor-help"><CraftIcon name="learning.svg" /><h4>A module brings a topic together.</h4><p>Lessons, quiz questions, and activities belong inside it.</p><p><strong>Draft:</strong> saved for editing.<br /><strong>Published:</strong> available in the Learning Path.<br /><strong>Hidden:</strong> saved but unavailable to students.</p>{moduleId && <div className="content-delete-area"><p>Remove unused lessons before deleting a module. If students have progress, hide the module instead.</p><button type="button" className="content-delete-button" disabled={blocked} onClick={() => setPendingDelete({ kind: 'module', id: moduleId, title: selectedModule.title })}>Delete module</button></div>}</aside></div></>}
      {stage === 'lesson' && <><div className="content-editor-heading"><div><span className="eyebrow">Learning material</span><h3>{lessonId ? 'Edit lesson' : 'Create a lesson'}</h3><p>{lessonId ? 'Update this lesson, or choose New lesson to add another.' : 'This lesson will be added to ' + (selectedModule?.title || 'your module') + '.'}</p></div><span className="content-mode">{lessonId ? 'Editing existing' : 'Creating new'}</span></div>{loadingLessons ? <p className="content-loading" role="status">Loading lessons…</p> : <div className="content-editor-body"><form className="content-form" onSubmit={saveLesson}><fieldset disabled={blocked || !moduleId}><label>Lesson title<input required maxLength={160} value={lessonForm.title} onChange={(event) => update(setLessonForm, 'title', event.target.value)} /></label><label>Lesson content<textarea required rows={9} maxLength={20000} value={lessonForm.content} onChange={(event) => update(setLessonForm, 'content', event.target.value)} placeholder="Explain the topic, add examples, and describe what students should understand." /></label><label className="content-order">Lesson order<input type="number" min="0" step="1" value={lessonForm.sequenceNo} onChange={(event) => update(setLessonForm, 'sequenceNo', Number(event.target.value))} aria-describedby="lesson-order-help" /></label><small id="lesson-order-help">Lower numbers appear first within this module.</small>{notification('lesson')}<div className="content-form-actions"><button type="submit" className="primary-small">{busy ? 'Saving…' : lessonId ? 'Save lesson' : 'Add lesson'}</button>{lessonId && <button type="button" className="secondary-small" onClick={() => setLessonForm(lessonFields(selectedLesson))}>Reset changes</button>}{lessonId && <button type="button" className="content-text-action" disabled={loadingItems} onClick={() => setStage('questions')}>Next: quiz questions →</button>}</div></fieldset></form><aside className="content-editor-help"><CraftIcon name="learning.svg" /><h4>Keep each lesson focused.</h4><p>Introduce one idea, explain it with an example, and give students something to practise.</p><p>Save the lesson before adding its quiz questions and activities.</p>{lessonId && <div className="content-delete-area"><p>Remove unused quiz questions and activities first. Lessons with student work may not be deleted.</p><button type="button" className="content-delete-button" disabled={blocked} onClick={() => setPendingDelete({ kind: 'lesson', id: lessonId, title: selectedLesson.title })}>Delete lesson</button></div>}</aside></div>}</>}
      {stage === 'questions' && <><div className="content-editor-heading"><div><span className="eyebrow">Check understanding</span><h3>Quiz questions</h3><p>Add or edit questions for {selectedLesson?.title}. These are multiple-choice lesson quizzes. Students pass at 50%; pre-test and post-test surveys are separate.</p></div><span className="content-mode">{questions.length} questions</span></div><div className="content-items-layout"><div className="content-item-list"><h4>Saved questions</h4>{questions.length ? <ul>{questions.map((item, index) => <li key={item.question_id} data-editing={questionId === item.question_id}><small>{String(index + 1).padStart(2, '0')} · {typeName(item.type)}</small><h5>{item.question_text}</h5><div className="content-item-actions"><button type="button" className="content-text-action" disabled={blocked} aria-label={'Edit question ' + (index + 1)} onClick={() => editQuestion(item)}>Edit</button><button type="button" className="content-delete-button" disabled={blocked} aria-label={'Delete question ' + (index + 1)} onClick={() => setPendingDelete({ kind: 'question', id: item.question_id, title: item.question_text })}>Delete</button></div></li>)}</ul> : <p className="content-empty">No questions yet. Use the form to add the first question.</p>}</div><form className="content-form content-item-form" onSubmit={saveQuestion}><div className="content-form-heading"><h4>{questionId ? 'Edit question' : 'Add a question'}</h4>{questionId && <button type="button" className="content-text-action" disabled={blocked} onClick={() => { setQuestionId(null); setQuestionForm(emptyQuestion); setNotice(null) }}>Cancel edit</button>}</div><fieldset disabled={blocked || !lessonId || loadingItems}><label>Question<textarea required rows={2} maxLength={2000} value={questionForm.questionText} onChange={(event) => update(setQuestionForm, 'questionText', event.target.value)} /></label><label>Question type<select value={questionForm.type} onChange={(event) => { update(setQuestionForm, 'type', event.target.value); update(setQuestionForm, 'answerKey', '') }}><option value="multiple_choice">Multiple choice</option></select></label>{questionForm.type === 'multiple_choice' && <><label>Answer choices<textarea required rows={4} value={questionForm.options} onChange={(event) => update(setQuestionForm, 'options', event.target.value)} aria-describedby="content-options-help" /></label><small id="content-options-help">Write one choice per line. The correct answer must match one of these choices.</small></>}<label>Correct answer{questionForm.type === 'true_false' ? <select required value={questionForm.answerKey.toLowerCase()} onChange={(event) => update(setQuestionForm, 'answerKey', event.target.value)}><option value="">Choose the correct answer</option><option value="true">True</option><option value="false">False</option></select> : <input required maxLength={500} value={questionForm.answerKey} onChange={(event) => update(setQuestionForm, 'answerKey', event.target.value)} />}</label><label>Answer explanation <span className="content-optional">(optional)</span><textarea rows={3} value={questionForm.explanation} onChange={(event) => update(setQuestionForm, 'explanation', event.target.value)} /></label>{notification('questions')}<div className="content-form-actions"><button type="submit" className="primary-small">{busy ? 'Saving…' : questionId ? 'Save question' : 'Add question'}</button></div></fieldset></form></div></>}
      {stage === 'activities' && <><div className="content-editor-heading"><div><span className="eyebrow">Put learning into practice</span><h3>Practical activities</h3><p>Build practical work for {selectedLesson?.title}. Teachers can assign activities from published modules to their classes.</p></div><span className="content-mode">{activities.length} activities</span></div><div className="content-items-layout"><div className="content-item-list"><h4>Saved activities</h4>{activities.length ? <ul>{activities.map((item, index) => <li key={item.activity_id} data-editing={activityId === item.activity_id}><small>{typeName(item.activity_type)} · {Number(item.is_required) ? 'Required' : 'Optional'}</small><h5>{item.title}</h5><div className="content-item-actions"><button type="button" className="content-text-action" disabled={blocked} aria-label={'Edit activity ' + (index + 1)} onClick={() => editActivity(item)}>Edit</button><button type="button" className="content-delete-button" disabled={blocked} aria-label={'Delete activity ' + (index + 1)} onClick={() => setPendingDelete({ kind: 'activity', id: item.activity_id, title: item.title })}>Delete</button></div></li>)}</ul> : <p className="content-empty">No activities yet. Use the form to add practical work for this lesson.</p>}</div><form className="content-form content-item-form" onSubmit={saveActivity}><div className="content-form-heading"><h4>{activityId ? 'Edit activity' : 'Add an activity'}</h4>{activityId && <button type="button" className="content-text-action" disabled={blocked} onClick={() => { setActivityId(null); setActivityForm(emptyActivity); setNotice(null) }}>Cancel edit</button>}</div><fieldset disabled={blocked || !lessonId || loadingItems}><label>Activity title<input required maxLength={160} value={activityForm.title} onChange={(event) => update(setActivityForm, 'title', event.target.value)} /></label><label>Activity type<select value={activityForm.activityType} onChange={(event) => update(setActivityForm, 'activityType', event.target.value)}><option value="test_case">Test case</option><option value="bug_report">Bug report</option><option value="reflection">Reflection</option></select></label><label>Instructions<textarea required rows={6} value={activityForm.instructions} onChange={(event) => update(setActivityForm, 'instructions', event.target.value)} placeholder="Explain what students should do and what they should submit." /></label><p id="content-required-help">Practical activities are optional. They never block quizzes or module completion.</p>{notification('activities')}<div className="content-form-actions"><button type="submit" className="primary-small">{busy ? 'Saving…' : activityId ? 'Save activity' : 'Add activity'}</button></div></fieldset></form></div></>}
      {stage === 'publish' && <><div className="content-editor-heading"><div><span className="eyebrow">Check, then share</span><h3>Preview &amp; publish</h3><p>Preview checks your saved content. Save any edits before refreshing this preview.</p></div><span className="content-mode">{selectedModule?.title}</span></div><div className="content-publish-body"><div className="content-readiness"><span className="content-readiness-icon"><CraftIcon name="learning.svg" /></span><div><h4>{preview ? preview.publishable ? 'Ready to publish' : 'Needs attention' : 'Check your module before publishing.'}</h4><p>{preview ? preview.lessons.length + ' lessons · ' + preview.questions.length + ' quiz questions' : 'The check looks for missing lessons and quiz questions.'}</p></div><button type="button" className="secondary-small" disabled={blocked} onClick={checkPreview}>{busy ? 'Checking…' : preview ? 'Refresh preview' : 'Check readiness'}</button></div>{preview?.warnings.length > 0 && <ul className="content-preview-warnings">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}{preview && <div className="content-preview-lessons">{preview.lessons.map((lesson) => <details key={lesson.lesson_id}><summary>{lesson.title}<span>{preview.questions.filter((question) => question.lesson_id === lesson.lesson_id).length} questions · {lesson.activities.length} activities</span></summary><div className="content-preview-reading">{lesson.content}</div><h5>Quiz questions</h5><ol>{preview.questions.filter((question) => question.lesson_id === lesson.lesson_id).map((question) => <li key={question.question_id}>{question.question_text}</li>)}</ol>{lesson.activities.length > 0 && <><h5>Practical activities</h5><ul>{lesson.activities.map((activity) => <li key={activity.activity_id}>{activity.title} · {Number(activity.is_required) ? 'Required' : 'Optional'}</li>)}</ul></>}</details>)}</div>}{notification('publish')}<div className="content-publish-footer"><div><strong>{selectedModule?.status === 'published' ? 'This module is published.' : selectedModule?.status === 'hidden' ? 'This module is hidden.' : 'This module is a draft.'}</strong><p>{selectedModule?.status === 'published' ? 'Saved changes to this published module are already available to students.' : preview?.publishable ? 'Publish makes this module available in the student Learning Path.' : 'Run the preview and resolve its warnings to enable publishing.'}</p></div><div className="content-publish-actions"><button type="button" className="primary-small" disabled={blocked || !preview?.publishable || selectedModule?.status === 'published'} onClick={() => changeStatus('published')}>Publish</button><button type="button" className="secondary-small" disabled={blocked || selectedModule?.status === 'hidden'} onClick={() => changeStatus('hidden')}>Hide</button></div></div></div></>}
    </section>
    <dialog ref={deleteDialog} role="alertdialog" aria-labelledby="content-delete-title" aria-describedby="content-delete-description" className="content-delete-dialog" onCancel={() => setPendingDelete(null)} onClose={() => setPendingDelete(null)}><h2 id="content-delete-title">Delete this {pendingDelete?.kind}?</h2><p id="content-delete-description">“{pendingDelete?.title}” will be permanently removed. The system checks whether other content or student records depend on it. This cannot be undone.</p><div><button type="button" className="secondary-small" autoFocus onClick={() => setPendingDelete(null)}>Cancel</button><button type="button" className="content-confirm-delete" onClick={confirmDelete}>Delete {pendingDelete?.kind}</button></div></dialog>
  </div>
}
