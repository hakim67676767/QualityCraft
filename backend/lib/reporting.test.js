const test = require('node:test')
const assert = require('node:assert/strict')
const dbPath = require.resolve('../db')
const queries = []
const student = { user_id: 1, name: 'Avery Student', email: 'avery@example.test', classes: 'Alpha Class', completed_modules: 2, total_modules: 4, quiz_average: 80, pre_score: 50, post_score: 90, xp_points: 150, activity_submissions: 2, activities_reviewed: 1 }
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { promise: () => ({ execute: async (sql, parameters) => { queries.push({ sql, parameters }); return [[student]] } }) } }
const { loadStudentProgress, loadClassAnalytics, buildCsv } = require('../services/reportingService')

test('the active report service scopes teacher queries and reports feedback and paired changes', async () => {
    const rows = await loadStudentProgress({ classId: 7, teacherId: 9 })
    assert.equal(rows[0].student, 'Avery Student')
    assert.equal(rows[0].improvement, 40)
    assert.equal(rows[0].feedbackStatus, '1 awaiting review')
    assert.equal(rows[0].completedModules, 2)
    assert.deepEqual(queries[0].parameters, [7, 9])
    const summary = await loadClassAnalytics({ teacherId: 9 })
    assert.equal(summary.activitiesAwaitingReview, 1)
    assert.equal(summary.averageImprovement, 40)
    const csv = buildCsv([{ ...rows[0], student: '=malicious()' }])
    assert.ok(csv.includes('"\'=malicious()"'))
    assert.ok(csv.includes('1 awaiting review'))
})
