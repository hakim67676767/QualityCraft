// Existing question IDs are retained when a prompt changes; submitted answers
// remain in quiz_attempt_answer as historical snapshots.
const rows = {
    'Foundations of Quality': [
        ['What is the main goal of quality assurance?', 'Prevent defects', 'Find every possible defect', 'Write more code', 'Skip reviews'],
        ['Who is responsible for software quality?', 'The whole team', 'Only the testing team', 'Only the customer', 'Only the project manager', 'Quality is owned only by the testing team.'],
        ['Which activity helps find defects early?', 'Peer review', 'Code deployment', 'Data backup', 'Changing the project name'],
        ['Which document describes what will be tested?', 'Test plan', 'Bug report', 'Release notes', 'User password list', 'Name the document that describes what will be tested.'],
        ['What does a quality standard provide?', 'A consistent benchmark', 'A project schedule', 'A user password', 'A guarantee that no testing is needed'],
        ['A team reviews requirements before writing code. Why does this help quality?', 'It can prevent misunderstandings before they become defects', 'It removes the need for all future testing', 'It makes every program run faster', 'It replaces the need to understand users'],
    ],
    'Test Case Design': [
        ['Which item tells you what should happen?', 'Expected result', 'Team name', 'Project color', 'The tester’s opinion'],
        ['When should a tester record the actual result?', 'After running the test steps', 'Before deciding what to test', 'Only before the application is built', 'Instead of running the test', 'An actual result is recorded after running the steps.'],
        ['What should a tester know before starting a test?', 'Starting conditions', 'Personal opinion', 'Release date only', 'The project logo color'],
        ['What do you compare with the expected result?', 'Actual result', 'Team size', 'Test author’s name', 'The application icon'],
        ['What makes a test case easier for another person to run?', 'Repeatable steps', 'Hidden assumptions', 'Unclear data', 'A result with no test steps'],
        ['A login test expects an error for an empty password, but the dashboard opens. What should you record?', 'The dashboard opening as the actual result and the mismatch as a failure', 'The expected error as the actual result', 'A pass because a page opened', 'No result because the test used an empty value'],
    ],
    'Testing Strategies': [
        ['What should risk-based testing prioritize?', 'High-impact risks', 'Random features', 'Finished documentation', 'The easiest checks only'],
        ['Which values are most useful for testing the boundaries of an allowed range?', 'Values at and just outside the range limits', 'Only a typical value in the middle', 'Only values from a different feature', 'No inputs at all', 'Boundary values are useful test cases.'],
        ['Which test checks a small unit of code?', 'Unit test', 'Load test', 'Acceptance test', 'End-to-end user journey test'],
        ['What is testing with invalid or unexpected inputs called?', 'Negative testing', 'Regression testing', 'Load testing', 'Acceptance testing'],
        ['What does regression testing protect against?', 'Reintroduced defects', 'New employees', 'Faster internet', 'Changes to the team’s meeting schedule'],
        ['A payment fix also changes shared login code. Which test strategy best reduces risk?', 'Retest the payment fix and run regression tests on login', 'Test only the page color', 'Skip login because payment was the reported problem', 'Deploy without testing because the fix is small'],
    ],
}

const catalogue = Object.fromEntries(Object.entries(rows).map(([title, questions]) => [title, questions.map((row, index) => {
    const [question, answer, ...rest] = row
    const choices = [answer, ...rest.slice(0, 3)]
    const offset = index % choices.length
    const options = [...choices.slice(offset), ...choices.slice(0, offset)]
    return { match: row[5] || question, question, answer, options, explanation: `The correct answer is "${answer}". Review this concept in the lesson and apply it to the example before trying again.` }
})]))

const archivedShortAnswerChoices = {
    'Continuous improvement': ['Continuous improvement', 'Release scheduling', 'Data backup', 'One-time inspection'],
    Severity: ['Severity', 'Team size', 'Release name', 'Screen resolution'],
}

module.exports = { catalogue, archivedShortAnswerChoices }
