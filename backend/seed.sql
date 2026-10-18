START TRANSACTION;

INSERT INTO `module` (title, description, status)
SELECT 'Foundations of Quality', 'Core concepts for building reliable software.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Foundations of Quality');
SET @foundations_module_id = (SELECT module_id FROM `module` WHERE title = 'Foundations of Quality' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @foundations_module_id, 'Quality fundamentals', 'Goal: explain why testing matters and distinguish prevention from defect detection.\n\nQuality assurance (QA) improves the process used to build software so defects are prevented. Testing checks a product against an expected outcome and helps detect defects. Both support confidence, but neither proves that all defects are gone. Quality is a responsibility shared by the whole team, not only testers.\n\nA peer review examines work early to find problems before release. A test plan describes the scope, approach, and resources for what will be tested. A quality standard provides a consistent benchmark that the team can use to judge its work.\n\nExample: for a login form, define a valid username and password, the expected result, and the actual result. Compare them and record any difference.\n\nBefore the quiz, complete the test case activity below.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @foundations_module_id AND sequence_no = 1);
SET @foundations_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @foundations_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key)
SELECT @foundations_lesson_id, foundations_questions.question_type, foundations_questions.options, foundations_questions.question_text, foundations_questions.answer_key
FROM (
    SELECT 'multiple_choice' AS question_type, '["Prevent defects","Find every possible defect","Write more code"]' AS options, 'What is the main goal of quality assurance?' AS question_text, 'Prevent defects' AS answer_key
    UNION ALL SELECT 'true_false', '["True","False"]', 'Quality is owned only by the testing team.', 'false'
    UNION ALL SELECT 'multiple_choice', '["Peer review","Code deployment","Data backup"]', 'Which activity helps find defects early?', 'Peer review'
    UNION ALL SELECT 'short_answer', NULL, 'Name the document that describes what will be tested.', 'Test plan'
    UNION ALL SELECT 'multiple_choice', '["A consistent benchmark","A project schedule","A user password"]', 'What does a quality standard provide?', 'A consistent benchmark'
) AS foundations_questions
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @foundations_lesson_id) = 0;

INSERT INTO `module` (title, description, status)
SELECT 'Testing Strategies', 'Choose practical techniques for finding risk and defects.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Testing Strategies');
SET @testing_module_id = (SELECT module_id FROM `module` WHERE title = 'Testing Strategies' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @testing_module_id, 'Risk-based testing', 'Goal: choose useful tests when time is limited.\n\nRisk-based testing starts with failures that are likely or costly. Check high-impact risks first, then boundaries and invalid inputs. Boundary-value tests check the edges of allowed input, such as the minimum and maximum length of a password. Negative testing checks unexpected or invalid inputs and the errors they should produce.\n\nA unit test checks a small component in isolation. Regression testing checks that a change did not reintroduce an earlier defect.\n\nExample: a school results portal should test incorrect logins and missing results before minor color changes.\n\nWrite a bug report for a failed case before taking the quiz.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @testing_module_id AND sequence_no = 1);
SET @testing_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @testing_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key)
SELECT @testing_lesson_id, testing_questions.question_type, testing_questions.options, testing_questions.question_text, testing_questions.answer_key
FROM (
    SELECT 'multiple_choice' AS question_type, '["High-impact risks","Random features","Finished documentation"]' AS options, 'What should risk-based testing prioritize?' AS question_text, 'High-impact risks' AS answer_key
    UNION ALL SELECT 'true_false', '["True","False"]', 'Boundary values are useful test cases.', 'true'
    UNION ALL SELECT 'multiple_choice', '["Unit test","Load test","Acceptance test"]', 'Which test checks a small unit of code?', 'Unit test'
    UNION ALL SELECT 'short_answer', NULL, 'What is testing with invalid or unexpected inputs called?', 'Negative testing'
    UNION ALL SELECT 'multiple_choice', '["Reintroduced defects","New employees","Faster internet"]', 'What does regression testing protect against?', 'Reintroduced defects'
) AS testing_questions
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @testing_lesson_id) = 0;

INSERT INTO `module` (title, description, status)
SELECT 'Continuous Improvement', 'Use feedback and evidence to improve the quality process.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Continuous Improvement');
SET @improvement_module_id = (SELECT module_id FROM `module` WHERE title = 'Continuous Improvement' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @improvement_module_id, 'Learning from outcomes', 'Goal: use test evidence to improve the next version.\n\nAfter testing, group failures by cause and review which checks found them. In a retrospective, the team reflects on what happened and chooses how to improve the way it works. Continuous improvement means repeating this cycle of testing, learning, and adjusting.\n\nA useful improvement names an action and a defined success metric that shows whether it helped. Collect metrics only when they inform a decision. A defect trend can reveal recurring problems; a raw count without context cannot.\n\nExample: if login failures repeat, add a boundary-value checklist and compare the next release with the earlier one.\n\nComplete the reflection activity before the quiz.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @improvement_module_id AND sequence_no = 1);
SET @improvement_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @improvement_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key)
SELECT @improvement_lesson_id, improvement_questions.question_type, improvement_questions.options, improvement_questions.question_text, improvement_questions.answer_key
FROM (
    SELECT 'multiple_choice' AS question_type, '["Improve the way the team works","Assign more meetings","Remove all documentation"]' AS options, 'What is the purpose of a retrospective?' AS question_text, 'Improve the way the team works' AS answer_key
    UNION ALL SELECT 'true_false', '["True","False"]', 'Metrics should be collected without a decision in mind.', 'false'
    UNION ALL SELECT 'multiple_choice', '["Defect trend","Screen brightness","Office location"]', 'Which signal can reveal a recurring problem?', 'Defect trend'
    UNION ALL SELECT 'short_answer', NULL, 'What is the repeated process of testing and adjusting called?', 'Continuous improvement'
    UNION ALL SELECT 'multiple_choice', '["A defined success metric","A longer report","More source code"]', 'What makes an improvement measurable?', 'A defined success metric'
) AS improvement_questions
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @improvement_lesson_id) = 0;

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @foundations_lesson_id, 'test_case', 'Write a test case', 'Describe a simple test for a login form, including the input, expected result, and actual result.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @foundations_lesson_id AND activity_type = 'test_case');

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @testing_lesson_id, 'bug_report', 'Report a bug', 'Write a clear bug report with a short title, steps to reproduce, expected result, and actual result.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @testing_lesson_id AND activity_type = 'bug_report');

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @improvement_lesson_id, 'reflection', 'Plan an improvement', 'Describe one quality improvement and explain how you would measure whether it worked.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @improvement_lesson_id AND activity_type = 'reflection');

INSERT INTO `module` (title, description, status)
SELECT 'Test Case Design', 'Turn requirements into clear, repeatable checks.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Test Case Design');
SET @case_module_id = (SELECT module_id FROM `module` WHERE title = 'Test Case Design' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @case_module_id, 'Expected and actual results', 'Goal: write a test case another person can run.\n\nA useful test case has a purpose, starting conditions, test data, steps, and an expected result. Run the steps and record the actual result separately. A pass means the two results match for that case.\n\nExample: enter an empty password. Expected: the form explains that a password is required. Actual: record what the application displayed.\n\nCreate your own test case in the activity.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @case_module_id AND sequence_no = 1);
SET @case_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @case_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key)
SELECT @case_lesson_id, items.question_type, items.options, items.question_text, items.answer_key
FROM (
    SELECT 'multiple_choice' AS question_type, '["Expected result","Team name","Project color"]' AS options, 'Which item tells you what should happen?' AS question_text, 'Expected result' AS answer_key
    UNION ALL SELECT 'true_false', '["True","False"]', 'An actual result is recorded after running the steps.', 'True'
    UNION ALL SELECT 'multiple_choice', '["Starting conditions","Personal opinion","Release date"]', 'What should a tester know before starting a test?', 'Starting conditions'
    UNION ALL SELECT 'short_answer', NULL, 'What do you compare with the expected result?', 'Actual result'
    UNION ALL SELECT 'multiple_choice', '["Repeatable steps","Hidden assumptions","Unclear data"]', 'What makes a test case easier for another person to run?', 'Repeatable steps'
) AS items
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @case_lesson_id) = 0;

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @case_lesson_id, 'test_case', 'Design a boundary test', 'Choose a simple form. Record input, steps, expected result, and actual result for an empty or boundary value.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @case_lesson_id AND activity_type = 'test_case');

INSERT INTO `module` (title, description, status)
SELECT 'Defect Reporting', 'Describe failures so someone else can reproduce them.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Defect Reporting');
SET @defect_module_id = (SELECT module_id FROM `module` WHERE title = 'Defect Reporting' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @defect_module_id, 'Clear bug reports', 'Goal: communicate a defect without guessing its cause.\n\nA bug report names the affected feature, the steps to reproduce, the expected result, and the actual result. Add test data and severity when useful. Describe observed behavior clearly so a developer can repeat and investigate it.\n\nExample: when a valid student enters a correct password, the page stays on the login form and shows an error. Include the browser and steps that produced it.\n\nWrite a concise report in the activity below.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @defect_module_id AND sequence_no = 1);
SET @defect_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @defect_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key)
SELECT @defect_lesson_id, items.question_type, items.options, items.question_text, items.answer_key
FROM (
    SELECT 'multiple_choice' AS question_type, '["Steps to reproduce","A guess about the developer","A slogan"]' AS options, 'What helps another person repeat a defect?' AS question_text, 'Steps to reproduce' AS answer_key
    UNION ALL SELECT 'true_false', '["True","False"]', 'A bug report should separate expected and actual behavior.', 'True'
    UNION ALL SELECT 'multiple_choice', '["Observed behavior","Personal blame","Unrelated features"]', 'What should the actual result describe?', 'Observed behavior'
    UNION ALL SELECT 'short_answer', NULL, 'What label describes how serious a defect is?', 'Severity'
    UNION ALL SELECT 'multiple_choice', '["Reproducible details","More exclamation marks","Only a screenshot"]', 'What makes a defect report actionable?', 'Reproducible details'
) AS items
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @defect_lesson_id) = 0;

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @defect_lesson_id, 'bug_report', 'Report a login defect', 'Write the title, steps, expected and actual result, and severity for a reproducible login problem.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @defect_lesson_id AND activity_type = 'bug_report');

COMMIT;
