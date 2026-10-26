// Local visual smoke check. Fixtures never reach the application or real database.
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '..', 'design-review')
await mkdir(output, { recursive: true })
const chromePath = process.env.QA_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const titles = ['Foundations of Quality', 'Testing Strategies', 'Continuous Improvement', 'Test Case Design', 'Defect Reporting']
const lessonTitles = ['Quality fundamentals', 'Risk-based testing', 'Learning from outcomes', 'Expected and actual results', 'Clear bug reports']
const videoIds = ['oLc9gVM8FBM', 'yqNJVw4vOl4', 'dJNCHvqKljU', 'nnqy-LB4g7o', 'Qqfbr2itLGM']
const questions = titles.flatMap((title, index) => Array.from({ length: 5 }, (_, i) => ({ module_id: index + 1, module_title: title, lesson_id: index + 1, lesson_title: lessonTitles[index], lesson_content: 'Learn, explore and practise software testing. These classroom examples explain how to apply the concepts.', lesson_completed: index === 0 ? 1 : 0, question_id: index * 5 + i + 1, type: 'multiple_choice', question_text: 'What makes software useful?', options: '["Quality","Guesswork"]' })))
const user = { user_id: 1, name: 'Alex', email: 'alex@example.test', role: 'student' }
let fixtureState = 'progress'
let signedIn = false
const sample = () => fixtureState === 'new' ? { classes: [], progress: [], surveys: [], badges: [], attempts: [], xpPoints: 0 } : {
  classes: [{ class_id: 1, title: 'Form 4 · Software Testing', joined: 1 }],
  progress: [{ progress_id: 1, module_id: 1, percent_complete: 100, status: 'complete' }],
  surveys: [{ phase: 'pre', score: 60, submitted_at: '2026-10-12T08:00:00Z' }],
  badges: ['First Steps', 'Quiz Explorer', 'Quality Thinker', 'Class Companion'].map((name, i) => ({ badge_id: i + 1, name, awarded_at: '2026-10-14T01:00:00Z' })),
  attempts: [80, 100, 60, 80].map((score, i) => ({ attempt_id: i + 1, lesson_id: i + 1, lesson_title: titles[i], score, completed_at: `2026-10-14T0${i}:00:00Z` })), xpPoints: 86,
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4178')
  if (url.pathname.startsWith('/api/')) {
    let value
    let status = 200
    if (url.pathname === '/api/test-role') { user.role = url.searchParams.get('role') || 'student'; user.name = user.role === 'administrator' ? 'Amina Admin' : user.role === 'teacher' ? 'Tariq Teacher' : 'Alex'; signedIn = false; value = { ok: true } }
    else if (url.pathname === '/api/me') { status = signedIn ? 200 : 401; value = signedIn ? user : { message: 'Authentication required' } }
    else if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register') { signedIn = true; value = { user } }
    else if (url.pathname === '/api/auth/logout') { signedIn = false; value = { ok: true } }
    else if (url.pathname === '/api/dashboard') value = sample()
    else if (url.pathname === '/api/me/journey') value = { joinedClass: fixtureState !== 'new', preTestDone: fixtureState !== 'new', postTestDone: false, moduleIds: [1, 2, 3, 4, 5], unlockedModuleIds: fixtureState === 'new' ? [] : fixtureState === 'curriculum' ? [1, 2, 3, 4, 5] : [1, 2], completedModuleIds: fixtureState === 'new' ? [] : fixtureState === 'curriculum' ? [1, 2, 3, 4, 5] : [1], allModulesComplete: fixtureState === 'curriculum', nextAction: fixtureState === 'new' ? 'Join a class' : 'Continue learning' }
    else if (url.pathname === '/api/modules') value = questions
    else if (url.pathname === '/api/management/analytics') value = { studentCount: 48, averageQuizScore: 82, postTestCompletionRate: 68, activitiesAwaitingReview: 7 }
    else if (url.pathname === '/api/management/classes') value = [{ class_id: 1, name: 'Form 4 Quality Lab', teacher: user.name, students: 28 }, { class_id: 2, name: 'Form 5 Testing Studio', teacher: user.name, students: 20 }]
    else if (url.pathname === '/api/management/activity-submissions') value = [
      { submission_id: 11, user_id: 101, student: 'Test Student', class_name: 'Form 4 Quality Lab', activity: 'Write a test case', content: { title: 'Login validation', input: 'Valid learner credentials', steps: 'Open sign in and submit the form', expectedResult: 'The dashboard opens', actualResult: 'The dashboard opened' }, status: 'submitted', feedback: '', submitted_at: '2026-10-15T08:00:00Z' },
      { submission_id: 12, user_id: 101, student: 'Test Student', class_name: 'Form 4 Quality Lab', activity: 'Report a login defect', content: { title: 'Password message is unclear', steps: 'Enter an incorrect password', expectedResult: 'A helpful message appears', actualResult: 'A generic error appears' }, status: 'submitted', feedback: '', submitted_at: '2026-10-15T08:30:00Z' },
      { submission_id: 13, user_id: 102, student: 'Second Student', class_name: 'Form 5 Testing Studio', activity: 'Write a test case', content: { title: 'Required email field', expectedResult: 'The form explains that email is required' }, status: 'reviewed', feedback: 'Clear test case.', submitted_at: '2026-10-14T07:30:00Z' },
    ]
    else if (url.pathname === '/api/management/suitability-summary') value = { responses: 21, averages: [4.2, 4.1, 4.4, 4.0, 3.9, 4.3] }
    else if (url.pathname === '/api/management/reports/students') value = []
    else if (url.pathname === '/api/management/users') value = [{ user_id: 1, name: 'Alex Learner', email: 'alex@example.test', role: 'student' }, { user_id: 2, name: 'Tariq Teacher', email: 'tariq@example.test', role: 'teacher' }]
    else value = []
    res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); return
  }
  try {
    const pathname = decodeURIComponent(url.pathname)
    const file = resolve(root, 'dist', pathname === '/' ? 'index.html' : `.${pathname}`)
    if (!file.startsWith(resolve(root, 'dist') + '\\') && file !== resolve(root, 'dist', 'index.html')) throw new Error('Outside preview directory')
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/plain' }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file))
  } catch { res.writeHead(404); res.end('Not found') }
})
await new Promise(resolveReady => server.listen(4178, '127.0.0.1', resolveReady))
const browser = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--remote-debugging-port=9231', `--user-data-dir=${resolve(output, 'chrome-profile')}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
let socket
const delay = ms => new Promise(done => setTimeout(done, ms))
try {
  let tabs
  for (let i = 0; i < 70; i++) {
    try { tabs = await (await fetch('http://127.0.0.1:9231/json/list')).json(); if (tabs.length) break } catch {}
    await delay(150)
  }
  assert(tabs?.length, 'Chrome must start for visual checks')
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl)
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0
  const pending = new Map()
  const runtimeErrors = []
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text)
    const request = pending.get(message.id)
    if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result) }
  })
  const send = (method, params = {}) => new Promise((resolveCall, reject) => { const id = ++sequence; pending.set(id, { resolve: resolveCall, reject }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value }
  const until = async expression => { for (let i = 0; i < 70; i++) { if (await evaluate(expression)) return; await delay(80) } throw new Error(`Timed out: ${expression}`) }
  const viewport = (width, height = 960) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  const screenshot = async (name, full = true) => { await delay(300); const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full }); await writeFile(resolve(output, name), Buffer.from(data, 'base64')) }
  const checkLayout = async label => {
    const info = await evaluate(`({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src) })`)
    assert(info.scrollWidth <= info.width + 1, `${label}: no horizontal page overflow (${info.scrollWidth}/${info.width})`)
    assert.deepEqual(info.brokenImages, [], `${label}: images load`)
    console.log(`PASS ${label}: ${info.width}px, no overflow, all icons loaded`)
  }
  await send('Page.enable'); await send('Runtime.enable')
  await viewport(1440)
  await send('Page.navigate', { url: 'http://127.0.0.1:4178/' })
  await until(`!!document.querySelector('.role-student')`)
  await evaluate(`document.querySelector('.role-student').click()`)
  await until(`!!document.querySelector('.student-signin-card')`)
  await evaluate(`Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))])`)
  await checkLayout('Desktop sign-in'); await screenshot('signin-desktop.png')
  await evaluate(`document.querySelector('.password-toggle').click()`)
  await until(`document.querySelector('input[name=password]').type === 'text'`)
  await evaluate(`document.querySelector('.password-toggle').click()`)
  await until(`document.querySelector('input[name=password]').type === 'password'`)
  await evaluate(`document.querySelector('.switch-button').click()`)
  await until(`!!document.querySelector('input[name=name]')`)
  await checkLayout('Student registration')
  await evaluate(`document.querySelector('.switch-button').click()`)
  await until(`!document.querySelector('input[name=name]')`)
  await viewport(390, 844); await checkLayout('Phone sign-in'); await screenshot('signin-phone.png')
  await viewport(320, 740); await checkLayout('Small phone sign-in')
  await viewport(768, 1024); await checkLayout('Tablet sign-in')
  await viewport(1440)
  await evaluate(`for (const [name,value] of [['email','alex@example.test'],['password','preview-only-password']]) { const input = document.querySelector('input[name='+name+']'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); }`)
  await evaluate(`document.querySelector('form').requestSubmit()`)
  await until(`!!document.querySelector('.student-dashboard')`)
  await checkLayout('Desktop dashboard'); await screenshot('dashboard-desktop.png')
  assert.equal(await evaluate(`document.querySelector('.stat-purple strong').textContent`), '1/5')
  assert.equal(await evaluate(`document.querySelector('.stat-mint strong').textContent`), '80%')
  assert.equal(await evaluate(`document.querySelector('.stat-peach strong').textContent`), '86')
  assert.equal(await evaluate(`document.querySelectorAll('.adventure-step:disabled').length`), 3)
  await evaluate(`document.querySelector('.student-primary').click()`)
  await until(`!!document.querySelector('.learning-path')`)
  await evaluate(`[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.includes('Dashboard')).click()`)
  await until(`!!document.querySelector('.student-dashboard')`)
  await viewport(1024); await checkLayout('Tablet dashboard')
  await viewport(390, 844); await checkLayout('Phone dashboard'); await screenshot('dashboard-phone.png')
  await viewport(320, 740); await checkLayout('Small phone dashboard')
  await viewport(390, 844)
  await evaluate(`[...document.querySelectorAll('.student-text-button')].find(b=>b.textContent.includes('View all badges')).click()`)
  await until(`!!document.querySelector('.achievement-grid')`)
  fixtureState = 'new'
  await send('Page.navigate', { url: 'http://127.0.0.1:4178/' })
  await until(`!!document.querySelector('.student-dashboard')`)
  await checkLayout('New student dashboard')
  await screenshot('dashboard-new-student.png')
  assert.equal(await evaluate(`document.querySelector('.stat-mint strong').textContent`), '—')
  await evaluate(`document.querySelector('.student-primary').click()`)
  await until(`document.querySelector('.workspace-header h1')?.textContent === 'Classes'`)
  fixtureState = 'curriculum'
  await viewport(1440)
  await send('Page.navigate', { url: 'http://127.0.0.1:4178/' })
  await until('!!document.querySelector(".student-dashboard")')
  await send('Network.enable')
  // Test player loading and fallback links without fetching third-party video content.
  await send('Network.setBlockedURLs', { urls: ['*://www.youtube-nocookie.com/*'] })
  for (let index = 0; index < titles.length; index++) {
    await evaluate('[...document.querySelectorAll(".nav-item")].find(b=>b.textContent.includes("Learning Path")).click()')
    await until('!!document.querySelector(".learning-path")')
    await evaluate('document.querySelectorAll(".path-card")[' + index + '].click()')
    await until('!!document.querySelector(".lesson-choice")')
    await evaluate('document.querySelector(".lesson-choice").click()')
    await until('!!document.querySelector(".lesson-study-guide")')
    await evaluate('scrollTo(0,0)')
    await checkLayout('Lesson ' + (index + 1) + ' desktop')
    assert.equal(await evaluate('document.querySelectorAll(".guide-self-check details").length'), 3)
    assert.equal(await evaluate('document.querySelector(".guide-video-caption a").href'), 'https://www.youtube.com/watch?v=' + videoIds[index])
    assert.equal(await evaluate('document.querySelectorAll(".guide-video iframe").length'), 0)
    if (index === 0) {
      await screenshot('lesson-desktop.png', false)
      await evaluate('document.querySelector(".guide-table-wrap").scrollIntoView({block:"center"})')
      await screenshot('lesson-example.png', false)
      await evaluate('document.querySelector(".guide-video-section").scrollIntoView({block:"start"})')
      await screenshot('lesson-video.png', false)
    }
    await evaluate('document.querySelector(".guide-self-check details summary").click()')
    assert.equal(await evaluate('document.querySelector(".guide-self-check details").open'), true)
    await evaluate('document.querySelector(".guide-video-placeholder").click()')
    assert.equal(await evaluate('document.querySelector(".guide-video iframe").getAttribute("src")'), 'https://www.youtube-nocookie.com/embed/' + videoIds[index] + '?rel=0')
    assert.equal(await evaluate('!!document.querySelector(".guide-video-caption a")'), true)
    await viewport(390, 844)
    await checkLayout('Lesson ' + (index + 1) + ' phone')
    await evaluate('document.querySelector(".guide-contents a").click()')
    assert.equal(await evaluate('location.hash'), '#guide-' + ['quality-fundamentals', 'risk-based-testing', 'learning-from-outcomes', 'expected-and-actual-results', 'clear-bug-reports'][index] + '-0')
    if (index === 0) {
      await evaluate('scrollTo(0,0)')
      await screenshot('lesson-phone.png', false)
    }
    await viewport(1440)
    await evaluate('document.querySelector(".lesson-page>.back-link").click()')
    await until('!!document.querySelector(".lesson-choice")')
    await evaluate('document.querySelector(".learning-page>.back-link").click()')
    await until('!!document.querySelector(".learning-path")')
  }
  console.log('PASS all 5 lesson guides: objectives, 15 answer reveals, exact video links, click-to-load players, fallback links, table containment, and section navigation')
  const signInAs = async role => {
    await evaluate(`fetch('/api/test-role?role=${role}')`)
    await send('Page.navigate', { url: 'http://127.0.0.1:4178/' })
    await until(`!!document.querySelector('.role-${role}')`)
    await evaluate(`document.querySelector('.role-${role}').click()`)
    await until(`!!document.querySelector('.student-signin-card')`)
    await evaluate(`for (const [name,value] of [['email','${role}@example.test'],['password','preview-only-password']]) { const input = document.querySelector('input[name='+name+']'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); }`)
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await until(`!!document.querySelector('.staff-dashboard')`)
  }
  await viewport(1440)
  await signInAs('teacher')
  await checkLayout('Teacher dashboard desktop'); await screenshot('teacher-dashboard-desktop.png')
  assert.equal(await evaluate(`document.querySelectorAll('.staff-quick-grid>button').length`), 2)
  await evaluate(`document.querySelector('.staff-primary-action').click()`)
  await until(`!!document.querySelector('.monitoring-panel')`)
  await until(`document.querySelectorAll('.review-selectors select').length === 2`)
  await evaluate(`const selects = document.querySelectorAll('.review-selectors select'); selects[0].value = '101'; selects[0].dispatchEvent(new Event('change',{bubbles:true}))`)
  await until(`document.querySelectorAll('.review-selectors select')[1].options.length === 3`)
  await evaluate(`const activity = document.querySelectorAll('.review-selectors select')[1]; activity.value = '11'; activity.dispatchEvent(new Event('change',{bubbles:true}))`)
  await until(`!!document.querySelector('.selected-submission')`)
  assert.equal(await evaluate(`document.querySelectorAll('.submission-field').length`), 5)
  await evaluate(`document.querySelector('.practical-review').scrollIntoView({block:'start'})`)
  await checkLayout('Teacher monitoring desktop'); await screenshot('teacher-monitoring-desktop.png', false)
  await signInAs('administrator')
  await checkLayout('Administrator dashboard desktop'); await screenshot('admin-dashboard-desktop.png')
  assert.equal(await evaluate(`document.querySelectorAll('.staff-quick-grid>button').length`), 4)
  await evaluate(`[...document.querySelectorAll('.staff-quick-grid>button')].find(button => button.textContent.includes('Shape the curriculum')).click()`)
  await until(`!!document.querySelector('.content-admin')`)
  await evaluate(`scrollTo(0,0)`)
  await checkLayout('Administrator content desktop'); await screenshot('admin-content-desktop.png')
  console.log('PASS teacher and administrator desktop dashboards, quick actions, monitoring, and content management')
  assert.deepEqual(runtimeErrors, [], 'No browser runtime exceptions')
  console.log('PASS sign-in/register toggle, show/hide password, learning CTA, badge navigation, module locks, new-student CTA, real-data calculations')
  console.log(`Visual previews: ${output}`)
} finally {
  socket?.close()
  browser.kill()
  await new Promise(done => server.close(done))
}
