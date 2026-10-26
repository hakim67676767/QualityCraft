const test = require('node:test')
const assert = require('node:assert/strict')
const { policy, scoreLesson } = require('../lib/learningPolicy')
const { catalogue } = require('../migrations/mcqCatalogue')

test('50% passes without a practical submission; a score below 50% does not', () => {
    const unsubmitted = [{ is_required: true, submission_id: null }]
    assert.equal(scoreLesson(true, unsubmitted, 50).percent, 100)
    assert.equal(scoreLesson(true, unsubmitted, 50).quizPassed, true)
    assert.equal(scoreLesson(true, unsubmitted, 49.99).quizPassed, false)
    assert.ok(scoreLesson(true, unsubmitted, 49.9999).percent < 100)
})

test('the quiz alone determines completion, independently of reading and practical work', () => {
    assert.equal(scoreLesson(false, [], 50).percent, 100)
    assert.equal(scoreLesson(false, [], 100).percent, 100)
    assert.equal(scoreLesson(true, [{ submission_id: 1 }], 0).percent, 0)
    assert.deepEqual(scoreLesson(true, [], 60).percent, scoreLesson(true, [{ submission_id: 1 }], 60).percent)
    assert.equal(scoreLesson(false, [], 0).percent, 0)
    assert.ok(scoreLesson(false, [], 49.9999).percent < 100)
})

test('invalid or out-of-range scores cannot inflate completion', () => {
    assert.equal(scoreLesson(true, [], NaN).quizPassed, false)
    assert.equal(scoreLesson(true, [], -10).percent, 0)
    assert.equal(scoreLesson(true, [], 101).percent, 100)
})

test('the ordered course has three levels and each quiz has six answerable MCQs', () => {
    assert.deepEqual(policy.modules.map((module) => module.difficulty), ['Easy', 'Moderate', 'Hard'])
    for (const module of policy.modules) {
        const questions = catalogue[module.title]
        assert.equal(questions.length, 6)
        for (const question of questions) {
            assert.equal(question.options.length, 4)
            assert.equal(new Set(question.options).size, 4)
            assert.equal(question.options.filter((option) => option === question.answer).length, 1)
        }
    }
})
