// Run only against scripts/browser-qa-server.js, which owns a disposable DB.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const base = process.env.CURRICULUM_TEST_URL
if (base !== 'http://127.0.0.1:4179') throw new Error('Set CURRICULUM_TEST_URL=http://127.0.0.1:4179 for the disposable browser QA server')
const fixtures = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../design-review/playwright/fixtures.json'), 'utf8'))
const policy = require('../../curriculum-policy.json')

function client() {
    let cookie = ''
    return async (url, { method = 'GET', body, status = 200 } = {}) => {
        const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
        const result = await response.json()
        assert.equal(response.status, status, `${method} ${url}: ${JSON.stringify(result)}`)
        return result
    }
}

async function main() {
    const admin = client()
    await admin('/api/auth/login', { method: 'POST', body: { email: 'admin@browser.test', password: 'BrowserTest2026!' } })
    const className = `Curriculum QA ${Date.now()}`
    await admin('/api/classes', { method: 'POST', body: { name: className }, status: 201 })
    const classes = await admin('/api/management/classes')
    const classroom = classes.find((item) => item.name === className)
    assert.ok(classroom)
    const student = client()
    const studentEmail = `curriculum-${Date.now()}@browser.test`
    await student('/api/auth/register', { method: 'POST', body: { name: 'Curriculum Student', email: studentEmail, password: 'BrowserTest2026!' }, status: 201 })
    await student('/api/modules', { status: 403 })
    await student(`/api/classes/${classroom.class_id}/join`, { method: 'POST', body: {}, status: 201 })
    const pre = await student('/api/pre-test')
    await student('/api/pre-test', { method: 'POST', body: { assessmentToken: pre[0].assessmentToken, answers: pre.map(() => '3') }, status: 201 })
    const course = await student('/api/modules')
    assert.deepEqual([...new Set(course.map((item) => item.module_title))], policy.modules.map((item) => item.title))
    assert.equal(course.length, 18)
    assert.ok(course.every((item) => item.type === 'multiple_choice' && JSON.parse(item.options).length === 4))
    const results = []
    for (const [index, module] of policy.modules.entries()) {
        const quiz = fixtures.lessons.filter((item) => item.module_title === module.title)
        const lessonId = quiz[0].lesson_id
        const answers = (correctCount) => quiz.map((question, position) => position < correctCount ? question.answer_key : JSON.parse(question.options).find((option) => option !== question.answer_key))
        if (index === 0) {
            const nextQuiz = fixtures.lessons.filter((item) => item.module_title === policy.modules[1].title)
            await student('/api/quiz-attempts', { method: 'POST', body: { lessonId: nextQuiz[0].lesson_id, answers: nextQuiz.map((question) => question.answer_key) }, status: 403 })
        }
        let previous
        if (index === 0) {
            previous = await student('/api/quiz-attempts', { method: 'POST', body: { lessonId, answers: answers(2) }, status: 201 })
            assert.equal(previous.score, 33.33)
            assert.notEqual(previous.progress.status, 'complete')
            const locked = await student('/api/me/journey')
            assert.equal(locked.unlockedModuleIds.length, 1)
        }
        const passed = await student(previous ? '/api/quiz-attempts/retake' : '/api/quiz-attempts', { method: 'POST', body: { lessonId, answers: answers(3), ...(previous ? { previousAttemptId: previous.attemptId } : {}) }, status: 201 })
        assert.equal(passed.score, 50)
        assert.equal(passed.progress.status, 'complete')
        assert.equal(passed.progress.percentComplete, 100)
        if (index === 0) {
            const lower = await student('/api/quiz-attempts/retake', { method: 'POST', body: { lessonId, answers: answers(2), previousAttemptId: passed.attemptId }, status: 201 })
            assert.equal(lower.bestScore, 50)
            assert.equal(lower.progress.status, 'complete')
        }
        results.push({ module: module.title, difficulty: module.difficulty, score: passed.score, complete: passed.progress.status })
    }
    const completedCourse = await student('/api/modules')
    assert.ok(completedCourse.every((item) => !Number(item.lesson_completed)), 'No reading completion is required')
    const activities = await student('/api/activities')
    assert.ok(activities.length > 0)
    assert.ok(activities.every((activity) => !activity.is_required && !activity.submission_id))
    const journey = await student('/api/me/journey')
    assert.equal(journey.moduleIds.length, 3)
    assert.equal(journey.allModulesComplete, true)
    assert.ok((await student('/api/post-test')).length > 0)
    const report = await admin('/api/management/reports/students')
    const learner = report.find((row) => row.email === studentEmail)
    assert.equal(learner.totalModules, 3)
    assert.equal(learner.completedModules, 3)
    assert.equal(learner.quizAverage, 50)
    const lessonId = course[0].lesson_id
    for (const type of ['short_answer', 'true_false']) await admin('/api/admin/questions', { method: 'POST', body: { lessonId, type, questionText: 'Unsupported type', answerKey: 'True', options: ['True', 'False'] }, status: 400 })
    await admin('/api/admin/questions', { method: 'POST', body: { lessonId, type: 'multiple_choice', questionText: 'Invalid one-choice quiz', answerKey: 'Only answer', options: ['Only answer'] }, status: 400 })
    const activity = await admin('/api/admin/activities', { method: 'POST', body: { lessonId, title: 'Optional policy check', activityType: 'reflection', instructions: 'Optional practice only.', isRequired: true }, status: 201 })
    assert.equal(Number(activity.is_required), 0)
    await admin(`/api/admin/activities/${activity.activity_id}`, { method: 'DELETE' })
    console.log(JSON.stringify({ results, noPracticalSubmissions: true, noReadingCompletions: true, lowerRetakePreservesPass: true, postTestUnlocked: true, nonMcqRejected: true, activitiesAlwaysOptional: true }, null, 2))
}

main().catch((error) => { console.error(error.message); process.exitCode = 1 })
