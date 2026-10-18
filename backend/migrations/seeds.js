// Idempotent data migrations and reference seeds.
//
// phase "backfill"  -> runs after new columns exist, before indexes are created
// phase "preIndex"  -> runs before unique indexes are created (dedupe first)
// phase "postIndex" -> runs once the full schema is in place
//
// Every statement is written so that running the migration twice is harmless.

const seeds = [
    {
        name: "negative-testing-question-wording",
        phase: "postIndex",
        sql: `UPDATE \`question\` q
            JOIN \`lesson\` l ON l.lesson_id = q.lesson_id
            JOIN \`module\` m ON m.module_id = l.module_id
            SET q.question_text = 'What is testing with invalid or unexpected inputs called?'
            WHERE m.title IN ('Testing Strategies', 'Testing Fundamentals')
              AND l.title = 'Risk-based testing'
              AND q.question_text = 'What is testing with expected and unexpected inputs called?'
              AND q.answer_key = 'Negative testing'`,
    },
    {
        name: "lesson-completion-from-existing-quizzes",
        phase: "backfill",
        sql: "INSERT IGNORE INTO `lesson_completion` (user_id, lesson_id) SELECT DISTINCT user_id, lesson_id FROM `quiz_attempt`",
    },
    {
        name: "module-sequence-backfill",
        phase: "backfill",
        sql: "UPDATE `module` SET sequence_no = module_id WHERE sequence_no = 0",
    },
    {
        name: "module-published-at-backfill",
        phase: "backfill",
        sql: "UPDATE `module` SET published_at = CURRENT_TIMESTAMP WHERE status = 'published' AND published_at IS NULL",
    },
    {
        name: "question-explanation-default",
        phase: "backfill",
        sql: "UPDATE `question` SET explanation = CONCAT('The correct answer is \"', answer_key, '\". Re-read this concept in the lesson before retrying the quiz.') WHERE explanation IS NULL OR explanation = ''",
    },
    {
        name: "progress-completed-at-backfill",
        phase: "backfill",
        sql: "UPDATE `progress` SET completed_at = CURRENT_TIMESTAMP WHERE status = 'complete' AND completed_at IS NULL",
    },
    {
        name: "quiz-attempt-total-backfill",
        phase: "backfill",
        sql: "UPDATE `quiz_attempt` qa SET qa.total_questions = (SELECT COUNT(*) FROM `question` q WHERE q.lesson_id = qa.lesson_id) WHERE qa.total_questions = 0",
    },
    {
        name: "quiz-attempt-correct-backfill",
        phase: "backfill",
        sql: "UPDATE `quiz_attempt` SET correct_count = LEAST(total_questions, ROUND(score / 100 * total_questions)) WHERE total_questions > 0 AND correct_count = 0 AND score > 0",
    },
    {
        name: "foundations-lesson-quiz-alignment",
        phase: "postIndex",
        sql: `UPDATE \`lesson\` l JOIN \`module\` m ON m.module_id = l.module_id
            SET l.content = CONCAT(l.content, CHAR(10), CHAR(10), 'Key ideas for this lesson: QA prevents defects by improving the development process. Quality is shared by the whole team. Peer review finds problems early. A test plan describes what will be tested. A quality standard is a consistent benchmark.')
            WHERE m.title = 'Foundations of Quality' AND l.title = 'Quality fundamentals'
              AND l.content NOT LIKE '%Key ideas for this lesson:%'
              AND l.content NOT LIKE '%A quality standard provides a consistent benchmark%'`,
    },
    {
        name: "testing-strategies-lesson-quiz-alignment",
        phase: "postIndex",
        sql: `UPDATE \`lesson\` l JOIN \`module\` m ON m.module_id = l.module_id
            SET l.content = CONCAT(l.content, CHAR(10), CHAR(10), 'Key ideas for this lesson: Prioritize high-impact risks. Boundary-value tests check input edges. Negative testing checks invalid or unexpected inputs. Unit tests check small components. Regression tests look for defects reintroduced by a change.')
            WHERE m.title = 'Testing Strategies' AND l.title = 'Risk-based testing'
              AND l.content NOT LIKE '%Key ideas for this lesson:%'
              AND l.content NOT LIKE '%Negative testing checks unexpected or invalid inputs%'`,
    },
    {
        name: "improvement-lesson-quiz-alignment",
        phase: "postIndex",
        sql: `UPDATE \`lesson\` l JOIN \`module\` m ON m.module_id = l.module_id
            SET l.content = CONCAT(l.content, CHAR(10), CHAR(10), 'Key ideas for this lesson: A retrospective helps the team improve how it works. Continuous improvement repeats testing, learning, and adjusting. Collect metrics to support decisions, use defect trends to spot recurring problems, and define a success metric for each improvement.')
            WHERE m.title = 'Continuous Improvement' AND l.title = 'Learning from outcomes'
              AND l.content NOT LIKE '%Key ideas for this lesson:%'
              AND l.content NOT LIKE '%In a retrospective, the team reflects%'`,
    },
    {
        name: "survey-response-dedupe",
        phase: "preIndex",
        sql: `DELETE sr FROM \`survey_response\` sr
            JOIN (
                SELECT user_id, phase, MAX(response_id) AS keep_id
                FROM \`survey_response\`
                GROUP BY user_id, phase
            ) newest ON newest.user_id = sr.user_id AND newest.phase = sr.phase
            WHERE sr.response_id <> newest.keep_id`,
    },
]

// Applied by the runner after the dedupe seed above has run.
const postDedupeIndexes = [
    {
        table: "survey_response",
        name: "survey_response_user_phase_unique",
        definition: "UNIQUE KEY `survey_response_user_phase_unique` (`user_id`, `phase`)",
    },
]

const gamificationRules = [
    { code: "class_join", name: "Join a class", eventType: "class_join", xp: 5, description: "Awarded once when a student joins a class." },
    { code: "pre_test_complete", name: "Complete the pre-test", eventType: "pre_test_complete", xp: 15, description: "Awarded for finishing the pre-test gate." },
    { code: "quiz_submission", name: "Submit a quiz", eventType: "quiz_submission", xp: 10, description: "Base XP for submitting any lesson quiz." },
    { code: "quiz_correct_answer", name: "Correct quiz answer", eventType: "quiz_correct_answer", xp: 2, description: "Awarded per correct answer in a lesson quiz." },
    { code: "activity_submission", name: "Submit a practical activity", eventType: "activity_submission", xp: 20, description: "Awarded once per activity a student submits." },
    { code: "module_complete", name: "Complete a module", eventType: "module_complete", xp: 30, description: "Awarded when every lesson in a module reaches 100%." },
    { code: "post_test_complete", name: "Complete the post-test", eventType: "post_test_complete", xp: 40, description: "Awarded for finishing the final assessment." },
]

const badgeCatalogue = [
    { code: "first_steps", name: "First Steps", criteriaType: "class_join", threshold: 1, icon: "flag", sortOrder: 1, description: "Joined your first class.", criteria: "Join any classroom." },
    { code: "quiz_rookie", name: "Quiz Rookie", criteriaType: "quiz_attempt_count", threshold: 3, icon: "target", sortOrder: 2, description: "Submitted three lesson quizzes.", criteria: "Complete 3 quiz attempts." },
    { code: "perfect_score", name: "Perfect Score", criteriaType: "perfect_quiz", threshold: 1, icon: "star", sortOrder: 3, description: "Scored 100% on a lesson quiz.", criteria: "Score 100% on any lesson quiz." },
    { code: "activity_explorer", name: "Activity Explorer", criteriaType: "activity_count", threshold: 3, icon: "compass", sortOrder: 4, description: "Submitted three practical activities.", criteria: "Submit 3 practical activities." },
    { code: "module_master", name: "Module Master", criteriaType: "module_count", threshold: 1, icon: "layers", sortOrder: 5, description: "Completed a full learning module.", criteria: "Complete any module." },
    { code: "course_champion", name: "Course Champion", criteriaType: "module_count_all", threshold: 1, icon: "trophy", sortOrder: 6, description: "Completed every published module.", criteria: "Complete every published module." },
    { code: "post_test_finisher", name: "Post-Test Finisher", criteriaType: "post_test_count", threshold: 1, icon: "check", sortOrder: 7, description: "Completed the final post-test.", criteria: "Submit the post-test." },
    { code: "xp_collector", name: "XP Collector", criteriaType: "xp_threshold", threshold: 100, icon: "bolt", sortOrder: 8, description: "Earned 100 XP across the course.", criteria: "Earn 100 XP." },
]

module.exports = { seeds, postDedupeIndexes, gamificationRules, badgeCatalogue }
