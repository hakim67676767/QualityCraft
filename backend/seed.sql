START TRANSACTION;

INSERT INTO `module` (title, description, status)
SELECT 'Foundations of Quality', 'Core concepts for building reliable software.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Foundations of Quality');
SET @foundations_module_id = (SELECT module_id FROM `module` WHERE title = 'Foundations of Quality' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @foundations_module_id, 'Quality fundamentals', 'Goal: explain why testing matters and distinguish prevention from defect detection.\n\nQuality assurance (QA) improves the process used to build software so defects are prevented. Testing checks a product against an expected outcome and helps detect defects. Both support confidence, but neither proves that all defects are gone. Quality is a responsibility shared by the whole team, not only testers.\n\nA peer review examines work early to find problems before release. A test plan describes the scope, approach, and resources for what will be tested. A quality standard provides a consistent benchmark that the team can use to judge its work.\n\nExample: for a login form, define a valid username and password, the expected result, and the actual result. Compare them and record any difference.\n\nYou may try the optional test case activity below. It is not required to pass the quiz.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @foundations_module_id AND sequence_no = 1);
SET @foundations_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @foundations_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key, explanation)
SELECT @foundations_lesson_id, 'multiple_choice', items.options, items.question_text, items.answer_key, items.explanation
FROM (
    SELECT '["Prevent defects", "Find every possible defect", "Write more code", "Skip reviews"]' AS options, 'What is the main goal of quality assurance?' AS question_text, 'Prevent defects' AS answer_key, 'The correct answer is "Prevent defects". Review this concept in the lesson and apply it to the example before trying again.' AS explanation
    UNION ALL SELECT '["Only the testing team", "Only the customer", "Only the project manager", "The whole team"]', 'Who is responsible for software quality?', 'The whole team', 'The correct answer is "The whole team". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Data backup", "Changing the project name", "Peer review", "Code deployment"]', 'Which activity helps find defects early?', 'Peer review', 'The correct answer is "Peer review". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["User password list", "Test plan", "Bug report", "Release notes"]', 'Which document describes what will be tested?', 'Test plan', 'The correct answer is "Test plan". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["A consistent benchmark", "A project schedule", "A user password", "A guarantee that no testing is needed"]', 'What does a quality standard provide?', 'A consistent benchmark', 'The correct answer is "A consistent benchmark". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["It removes the need for all future testing", "It makes every program run faster", "It replaces the need to understand users", "It can prevent misunderstandings before they become defects"]', 'A team reviews requirements before writing code. Why does this help quality?', 'It can prevent misunderstandings before they become defects', 'The correct answer is "It can prevent misunderstandings before they become defects". Review this concept in the lesson and apply it to the example before trying again.'
) AS items
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @foundations_lesson_id) = 0;

INSERT INTO `module` (title, description, status)
SELECT 'Test Case Design', 'Turn requirements into clear, repeatable checks.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Test Case Design');
SET @case_module_id = (SELECT module_id FROM `module` WHERE title = 'Test Case Design' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @case_module_id, 'Expected and actual results', 'Goal: write a test case another person can run.\n\nA useful test case has a purpose, starting conditions, test data, steps, and an expected result. Run the steps and record the actual result separately. A pass means the two results match for that case.\n\nExample: enter an empty password. Expected: the form explains that a password is required. Actual: record what the application displayed.\n\nYou may try the optional test case activity.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @case_module_id AND sequence_no = 1);
SET @case_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @case_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key, explanation)
SELECT @case_lesson_id, 'multiple_choice', items.options, items.question_text, items.answer_key, items.explanation
FROM (
    SELECT '["Expected result", "Team name", "Project color", "The testerâ€™s opinion"]' AS options, 'Which item tells you what should happen?' AS question_text, 'Expected result' AS answer_key, 'The correct answer is "Expected result". Review this concept in the lesson and apply it to the example before trying again.' AS explanation
    UNION ALL SELECT '["Before deciding what to test", "Only before the application is built", "Instead of running the test", "After running the test steps"]', 'When should a tester record the actual result?', 'After running the test steps', 'The correct answer is "After running the test steps". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Release date only", "The project logo color", "Starting conditions", "Personal opinion"]', 'What should a tester know before starting a test?', 'Starting conditions', 'The correct answer is "Starting conditions". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["The application icon", "Actual result", "Team size", "Test authorâ€™s name"]', 'What do you compare with the expected result?', 'Actual result', 'The correct answer is "Actual result". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Repeatable steps", "Hidden assumptions", "Unclear data", "A result with no test steps"]', 'What makes a test case easier for another person to run?', 'Repeatable steps', 'The correct answer is "Repeatable steps". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["The expected error as the actual result", "A pass because a page opened", "No result because the test used an empty value", "The dashboard opening as the actual result and the mismatch as a failure"]', 'A login test expects an error for an empty password, but the dashboard opens. What should you record?', 'The dashboard opening as the actual result and the mismatch as a failure', 'The correct answer is "The dashboard opening as the actual result and the mismatch as a failure". Review this concept in the lesson and apply it to the example before trying again.'
) AS items
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @case_lesson_id) = 0;

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @case_lesson_id, 'test_case', 'Design a boundary test', 'Choose a simple form. Record input, steps, expected result, and actual result for an empty or boundary value.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @case_lesson_id AND activity_type = 'test_case');

INSERT INTO `module` (title, description, status)
SELECT 'Testing Strategies', 'Choose practical techniques for finding risk and defects.', 'published'
WHERE NOT EXISTS (SELECT 1 FROM `module` WHERE title = 'Testing Strategies');
SET @testing_module_id = (SELECT module_id FROM `module` WHERE title = 'Testing Strategies' LIMIT 1);

INSERT INTO `lesson` (module_id, title, content, sequence_no)
SELECT @testing_module_id, 'Risk-based testing', 'Goal: choose useful tests when time is limited.\n\nRisk-based testing starts with failures that are likely or costly. Check high-impact risks first, then boundaries and invalid inputs. Boundary-value tests check the edges of allowed input, such as the minimum and maximum length of a password. Negative testing checks unexpected or invalid inputs and the errors they should produce.\n\nA unit test checks a small component in isolation. Regression testing checks that a change did not reintroduce an earlier defect.\n\nExample: a school results portal should test incorrect logins and missing results before minor color changes.\n\nWrite a bug report for a failed case before taking the quiz.', 1
WHERE NOT EXISTS (SELECT 1 FROM `lesson` WHERE module_id = @testing_module_id AND sequence_no = 1);
SET @testing_lesson_id = (SELECT lesson_id FROM `lesson` WHERE module_id = @testing_module_id AND sequence_no = 1 LIMIT 1);

INSERT INTO `question` (lesson_id, type, options, question_text, answer_key, explanation)
SELECT @testing_lesson_id, 'multiple_choice', items.options, items.question_text, items.answer_key, items.explanation
FROM (
    SELECT '["High-impact risks", "Random features", "Finished documentation", "The easiest checks only"]' AS options, 'What should risk-based testing prioritize?' AS question_text, 'High-impact risks' AS answer_key, 'The correct answer is "High-impact risks". Review this concept in the lesson and apply it to the example before trying again.' AS explanation
    UNION ALL SELECT '["Only a typical value in the middle", "Only values from a different feature", "No inputs at all", "Values at and just outside the range limits"]', 'Which values are most useful for testing the boundaries of an allowed range?', 'Values at and just outside the range limits', 'The correct answer is "Values at and just outside the range limits". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Acceptance test", "End-to-end user journey test", "Unit test", "Load test"]', 'Which test checks a small unit of code?', 'Unit test', 'The correct answer is "Unit test". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Acceptance testing", "Negative testing", "Regression testing", "Load testing"]', 'What is testing with invalid or unexpected inputs called?', 'Negative testing', 'The correct answer is "Negative testing". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Reintroduced defects", "New employees", "Faster internet", "Changes to the teamâ€™s meeting schedule"]', 'What does regression testing protect against?', 'Reintroduced defects', 'The correct answer is "Reintroduced defects". Review this concept in the lesson and apply it to the example before trying again.'
    UNION ALL SELECT '["Test only the page color", "Skip login because payment was the reported problem", "Deploy without testing because the fix is small", "Retest the payment fix and run regression tests on login"]', 'A payment fix also changes shared login code. Which test strategy best reduces risk?', 'Retest the payment fix and run regression tests on login', 'The correct answer is "Retest the payment fix and run regression tests on login". Review this concept in the lesson and apply it to the example before trying again.'
) AS items
WHERE (SELECT COUNT(*) FROM `question` WHERE lesson_id = @testing_lesson_id) = 0;

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @foundations_lesson_id, 'test_case', 'Write a test case', 'Optional: describe a simple login-form test, including input, expected result and actual result.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @foundations_lesson_id AND activity_type = 'test_case');

INSERT INTO `activity` (lesson_id, activity_type, title, instructions)
SELECT @testing_lesson_id, 'bug_report', 'Report a bug', 'Optional: write a bug report with steps to reproduce, expected result, actual result and severity.'
WHERE NOT EXISTS (SELECT 1 FROM `activity` WHERE lesson_id = @testing_lesson_id AND activity_type = 'bug_report');

COMMIT;
