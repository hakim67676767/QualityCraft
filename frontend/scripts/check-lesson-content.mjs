import assert from 'node:assert/strict'
import { lessonGuides, getLessonGuide, getGuideReadingMinutes, getLessonQuestionText } from '../src/content/lessonGuides.js'

assert.equal(lessonGuides.length, 5)
for (const guide of lessonGuides) {
  assert.equal(getLessonGuide(guide.moduleTitles[0], guide.lessonTitles[0]), guide)
  assert(guide.sections.length >= 4)
  assert(guide.objectives.length >= 3)
  assert.equal(guide.checks.length, 3)
  assert(guide.checks.every(check => check.question && check.answer))
  assert(guide.sources.every(source => new URL(source.url).protocol === 'https:'))
  assert(/^[a-zA-Z0-9_-]{11}$/.test(guide.video.id))
  assert(getGuideReadingMinutes(guide) >= 4)
  for (const section of guide.sections) {
    if (section.table) assert(section.table.rows.every(row => row.length === section.table.headers.length))
  }
  console.log('PASS ' + guide.id + ': ' + getGuideReadingMinutes(guide) + ' min guide, objectives, examples, checks, video, sources')
}
assert.equal(getLessonGuide('Custom class project', 'Quality fundamentals'), null)
assert.equal(getLessonGuide('Foundations of Quality', 'A teacher-written advanced lesson'), null)
assert.equal(getLessonGuide(' foundations of quality ', ' QUALITY FUNDAMENTALS '), lessonGuides[0])
const legacyQuestion = { question_text: 'What is testing with expected and unexpected inputs called?' }
assert.equal(getLessonQuestionText(legacyQuestion, lessonGuides[1]), 'What is testing with invalid or unexpected inputs called?')
assert.equal(getLessonQuestionText(legacyQuestion, lessonGuides[0]), legacyQuestion.question_text)
console.log('PASS custom lesson isolation, title normalisation, and scoped quiz wording fix')
