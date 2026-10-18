// Original study guides for the built-in course. Custom teacher lessons remain intact.
export const lessonGuides = [
  {
    id: 'quality-fundamentals',
    moduleTitles: ['Foundations of Quality'],
    lessonTitles: ['Quality fundamentals', 'Introduction to Software Quality', 'Software Quality Fundamentals'],
    objectives: ['Explain quality using a familiar school application.', 'Distinguish quality assurance, quality control, and testing.', 'Describe peer reviews, quality standards, and a test plan.'],
    introduction: 'Imagine a school portal that looks beautiful but shows the wrong examination result. Would you call it good software? Quality means that an application helps people complete the right task reliably. Appearance matters, but so do correct information, clear feedback, and behaviour users can trust.',
    sections: [
      {
        title: 'What does quality look like in everyday software?',
        paragraphs: ['Think about an assignment submission page. A student needs to upload the correct file, receive confirmation, and find the submission later. The teacher needs to see the same file. A useful quality requirement describes a result we can check, rather than a vague promise such as “the page should be good”.', 'Different users also have different needs. A fast page may still be difficult to use on a phone. An application that works for one student may fail when a whole class signs in. Ask who uses the feature, what they want to achieve, and what would happen if it failed.'],
        bullets: ['Correctness: the submitted file and student name are recorded accurately.', 'Reliability: an interrupted upload does not display a misleading success message.', 'Usability: the student understands how to upload and correct an error.', 'Accessibility: controls have readable labels and can be reached using a keyboard.', 'Security: one student cannot view another student’s private work.'],
      },
      {
        title: 'QA, quality control, and testing work together',
        paragraphs: ['Quality assurance (QA) focuses on how the team works. A team can agree on a requirements checklist and review a design before building it. These habits help prevent avoidable defects. Quality control (QC) evaluates the resulting work. Testing is one way to investigate whether the software behaves as required.', 'Testing gives the team evidence. Running a login test can reveal a failure, but it does not repair the program. A developer investigates the cause and changes the code; the tester then checks the result. Passing the tests you selected does not prove that every possible defect is gone.'],
        table: { headers: ['Activity', 'Main focus', 'School-portal example'], rows: [['Quality assurance', 'Improve the process', 'Agree that every form design gets a peer review.'], ['Quality control', 'Evaluate the product', 'Check a release against agreed acceptance criteria.'], ['Testing', 'Investigate behaviour', 'Submit an empty upload and observe the error message.']] },
        note: 'Quality is shared by the whole team. Testers provide evidence; developers, designers, teachers, and users all help define and achieve quality.',
      },
      {
        title: 'Find misunderstandings before they become expensive',
        paragraphs: ['A peer review is a second person examining work and asking useful questions. You can review requirements, a design, a test case, or code. You do not always need a running application. If a requirement says “students can submit any file”, a reviewer might ask whether file types and sizes need limits.', 'A quality standard is an agreed benchmark for consistent work. In a class project, a small standard might require every input to have a label and every validation error to explain the next action. A standard helps the team judge work consistently, but meeting a checklist alone does not guarantee that users’ needs are met.'],
      },
      {
        title: 'Turn a goal into a test plan and a concrete check',
        paragraphs: ['A test plan explains the testing goal, scope, approach, resources, responsibilities, and timing. It answers questions such as: which features will we check, which devices will we use, who will record failures, and what evidence do we need before release? A test case is more specific: it gives the inputs, steps, and expected result for one check.', 'For a login page, first agree that an existing student with the correct credentials should reach the dashboard. Then enter a test account, select Sign in, and record what actually happened. Compare the expected and actual results. Use a separate case for an incorrect password, because it has a different expected result.'],
        bullets: ['Requirement: a valid account can sign in.', 'Input: an approved classroom test account and its correct password.', 'Expected result: the dashboard opens and displays that account’s name.', 'Actual result: record the screen and messages observed after running the case.', 'Conclusion: pass if the observation matches the requirement; investigate any difference.'],
      },
    ],
    takeaways: ['Quality is about useful, dependable behaviour as well as appearance.', 'QA improves processes; testing investigates products and provides evidence.', 'Early reviews uncover unclear requirements.', 'A test plan sets the approach; a test case describes one concrete check.'],
    checks: [
      { question: 'Your team introduces a form-design review before coding. Is this mainly QA or executing a test?', answer: 'It is mainly QA: the team is improving its process to prevent problems. Reviewing the design can also uncover defects without running the application.' },
      { question: 'A login test passes. Does this prove the entire portal has no defects?', answer: 'No. It provides evidence about the conditions you checked. Other inputs, devices, features, or interactions may behave differently.' },
      { question: 'What should you decide before calling an upload test a pass?', answer: 'Define the expected behaviour from an agreed requirement, run the test, and compare that expectation with the actual observation.' },
    ],
    video: { id: 'oLc9gVM8FBM', title: 'Software Testing Explained: How QA is Done Today', channel: 'AltexSoft', focus: 'A wider introduction to software testing and its role in a development team.', prompts: ['Which testing activities happen before release?', 'How does a team use testing to gain confidence?', 'Which example could you adapt to a school portal?'] },
    sources: [{ title: 'IBM: What is software testing?', url: 'https://www.ibm.com/think/topics/software-testing' }],
  },
  {
    id: 'risk-based-testing',
    moduleTitles: ['Testing Strategies', 'Testing Fundamentals'],
    lessonTitles: ['Risk-based testing', 'Testing Strategies', 'Introduction to Testing Strategies'],
    objectives: ['Prioritise tests using likelihood and impact.', 'Choose boundary and negative tests for a simple form.', 'Explain unit testing, regression testing, and retesting.'],
    introduction: 'Your team has twenty minutes before demonstrating a school results portal. You cannot check every possible input, device, and feature. Risk-based testing helps you decide where careful testing is most valuable, while being honest about what remains unchecked.',
    sections: [
      {
        title: 'Start with what could go wrong',
        paragraphs: ['A risk is a possible problem with an uncertain chance of happening. In testing, think about the likelihood of a failure and its impact on users. A results page that displays the wrong student’s marks has a serious impact. A slightly misaligned icon is usually less harmful. A feature that was recently changed may deserve extra attention.', 'Write the failure as a clear statement: “A student may see another student’s results when opening a saved link.” Discuss it with the team. Testing can reveal problems and reduce uncertainty; it cannot promise that a failure will never happen.'],
        bullets: ['Identify important user tasks, such as signing in and viewing results.', 'List possible failures for each task.', 'Estimate likelihood and impact using a simple agreed scale.', 'Test the most serious risks first, then reassess as you learn.'],
      },
      {
        title: 'Use a small risk table to explain your priorities',
        paragraphs: ['For a classroom exercise, rate likelihood and impact from 1 (low) to 3 (high), then multiply them to compare priorities. The numbers are estimates, not measured probabilities. Talk about the reasoning behind the scores; two features with the same score may still need different checks.', 'Start with the student-data problem below, followed by missing results and then the cosmetic icon. Lower priority means less testing effort or later testing, rather than pretending that the feature has no risk.'],
        table: { headers: ['Possible failure', 'Likelihood', 'Impact', 'Example score'], rows: [['Wrong student’s marks are shown', '2', '3', '6 — investigate first'], ['Results fail to load', '2', '2', '4 — investigate next'], ['An icon is slightly misaligned', '1', '1', '1 — investigate later']] },
      },
      {
        title: 'Check input boundaries, not only a typical value',
        paragraphs: ['Suppose a classroom registration form accepts a nickname between 3 and 12 characters. A normal 7-character name may pass even when the length check is wrong. Boundary-value testing examines the edges of the permitted range and nearby values, where comparison mistakes often appear.', 'Try lengths 2, 3, 4, 11, 12, and 13. The 3- and 12-character names should be accepted; 2 and 13 should be rejected. The other values help investigate behaviour immediately inside the range. Record the response instead of assuming that the form enforced the rule.'],
        note: 'Read the requirement first. The expected result depends on whether the boundary is inclusive and on how the application counts characters.',
      },
      {
        title: 'Positive and negative tests answer different questions',
        paragraphs: ['A positive test uses valid conditions and checks that the intended task succeeds. A negative test uses invalid or unexpected conditions and checks that the application responds appropriately. An empty required name, an unsupported file type, or a wrong password are examples of negative test inputs.', 'A negative test can pass. If an empty required field produces the correct, helpful error message, the software has handled the invalid input correctly. “Negative” describes the input or scenario, not the pass/fail outcome. Use approved classroom test accounts for your checks.'],
      },
      {
        title: 'Know what unit tests and regression tests add',
        paragraphs: ['A unit test checks a small component in isolation. A developer can check a function that decides whether a score is within 0 to 100. A complete login journey is broader: it involves the form, server, session, and dashboard.', 'After a change, retesting checks whether a particular reported failure is fixed. Regression testing checks whether the change damaged behaviour that worked before. If the team changes login validation, retest the original empty-field bug and also check correct credentials, incorrect credentials, and signing out. Keep high-risk cases in the regression checklist.'],
      },
    ],
    takeaways: ['Use likelihood and impact to justify what you test first.', 'Boundaries and invalid inputs reveal cases a typical input can miss.', 'Negative tests pass when invalid input is handled correctly.', 'Retesting confirms a fix; regression testing checks for unwanted effects.'],
    checks: [
      { question: 'Which should you check first: a wrong-result problem or an icon colour mismatch? Why?', answer: 'Usually the wrong-result problem, because its impact on students is much greater. Explain the likelihood and impact rather than choosing only by appearance.' },
      { question: 'A name must be 3–12 characters. What would you expect for lengths 2, 3, 12, and 13?', answer: 'Reject 2, accept 3, accept 12, and reject 13, assuming the stated limits are inclusive.' },
      { question: 'Does an error message mean a negative test failed?', answer: 'Not necessarily. If invalid input should produce that error and it does so correctly, the negative test passes.' },
    ],
    video: { id: 'yqNJVw4vOl4', title: 'What is Risk Based Testing?', channel: 'Paul Gerrard - Testing Anything', focus: 'How thinking about risk helps a tester decide what evidence to collect.', prompts: ['How does the presenter connect risks to project goals?', 'What uncertainty can a test reduce?', 'What high-impact risk would you prioritise in a results portal?'] },
    sources: [{ title: 'ISTQB Glossary: risk-based testing', url: 'https://glossary.istqb.org/en_US/term/risk-based-testing' }, { title: 'IBM: testing levels and regression testing', url: 'https://www.ibm.com/think/topics/software-testing' }],
  },
  {
    id: 'learning-from-outcomes',
    moduleTitles: ['Continuous Improvement', 'Quality Improvement'],
    lessonTitles: ['Learning from outcomes', 'Continuous Improvement', 'Improving Software Quality'],
    objectives: ['Identify a recurring problem using test results and feedback.', 'Explain what a retrospective is for.', 'Write an improvement with an owner, a success measure, and a review date.'],
    introduction: 'Finding and fixing one bug is useful. Understanding why similar problems keep appearing is even more valuable. Continuous improvement means using what the team learned to make the next version and the next round of work better.',
    sections: [
      {
        title: 'Treat test results as evidence, not a scoreboard',
        paragraphs: ['After testing an assignment portal, your team has several bug reports and student comments. Start by grouping the observations: unclear error messages, failed uploads, and missing submission records. Look for patterns instead of rushing to blame a person.', 'A repeated failure can have several causes. Perhaps the file-size requirement was unclear, the team did not test the boundary, or the error message hides the real problem. A test result shows what happened under the recorded conditions. It does not automatically explain the cause. Gather evidence before choosing an improvement.'],
        bullets: ['What failed, and under which conditions?', 'Which students or tasks were affected?', 'Which check discovered the failure?', 'Has a similar problem appeared before?', 'What information is missing from our investigation?'],
      },
      {
        title: 'Use a retrospective to improve how the team works',
        paragraphs: ['A retrospective is a structured conversation about a completed period of work. The team asks what went well, what was difficult, and what it wants to change next. Everyone should be able to contribute, including people who found problems and people who built the feature.', 'For a class project, each member could write one success and one difficulty on a note. Group related notes and choose one improvement the team can actually try. “Be more careful” is too vague. “Before each release, a partner reviews the upload test cases against the file-size rule” describes a repeatable action.'],
        note: 'Describe the process and the evidence. “We missed the maximum file-size case” helps the team learn more than “someone did a bad job”.',
      },
      {
        title: 'Choose measurements that answer a useful question',
        paragraphs: ['A metric is a measurement used to support a decision. Decide the question first. If you want to know whether clearer error messages help students recover, measure how many students successfully retry an upload after an error, using the same task and conditions.', 'Raw defect counts can be misleading. Finding ten defects in a large, thoroughly tested release may tell a different story from finding two in a tiny release that was barely checked. Compare similar scopes, test effort, and severity. A trend across releases is more useful when you understand that context.'],
        table: { headers: ['Question', 'Useful evidence', 'Keep comparable'], rows: [['Are boundaries being covered?', 'Boundary cases documented and executed', 'The same file-size rules'], ['Do clearer errors help?', 'Successful retries after an upload error', 'Similar tasks, devices, and participants'], ['Is the same defect returning?', 'Occurrences across releases', 'Similar scope and regression checks']] },
      },
      {
        title: 'Make the improvement small enough to test',
        paragraphs: ['Imagine three out of twelve classmates initially cannot recover from an oversized-file error. The team rewrites the message to state the maximum size and explain how to retry. A partner reviews it, and the team repeats the task with similar conditions. It also records whether participants had already seen the task, because practice can affect the result.', 'The action is a clearer message. The owner is the class-project designer. The success measure is fewer unsuccessful retries during the next comparable trial. The review date is after the next demonstration. This is a plan for collecting evidence, not a guarantee that the message caused every observed change.'],
        bullets: ['Observation: several students do not know how to recover from the error.', 'Action: explain the file-size limit and the next step.', 'Owner: assign someone to prepare the change and a partner to review it.', 'Measure: compare successful retries and collect student comments.', 'Review: keep, adjust, or replace the change based on the evidence.'],
      },
      {
        title: 'Repeat the cycle and share what you learn',
        paragraphs: ['Continuous improvement is a cycle of observing, choosing an action, trying it, and reviewing the outcome. Keep the action that helps, and revise one that does not. Add a regression check when a fixed defect could return.', 'In the reflection activity, describe one specific issue, one practical improvement, and the evidence you will collect. If you cannot explain how you will recognise improvement, make your success measure more concrete before submitting.'],
      },
    ],
    takeaways: ['Retrospectives help the team improve its way of working.', 'A defect trend needs context to be meaningful.', 'Choose a metric because it answers a decision.', 'An improvement needs an action, an owner, a success measure, and a review.'],
    checks: [
      { question: 'Why is “we will work harder” a weak improvement plan?', answer: 'It does not name a specific action or explain how to judge whether the action helped. Replace it with a repeatable change and a measure.' },
      { question: 'Release A has two defects and release B has eight. Is B necessarily worse?', answer: 'No. Compare the release scope, severity, testing effort, and user impact before drawing that conclusion.' },
      { question: 'What should happen when an improvement does not help?', answer: 'Review the evidence, adjust or replace the action, and try again. The purpose is learning, not defending the original idea.' },
    ],
    video: { id: 'dJNCHvqKljU', title: 'Agile Retrospectives Done Right - Agile Coach (2019)', channel: 'Atlassian', focus: 'How a team can reflect on completed work and decide what to improve next.', prompts: ['How can a facilitator help everyone contribute?', 'What should happen after the team discusses problems?', 'Which part of the approach would work in your class project?'] },
    sources: [{ title: 'Atlassian: how to run a retrospective', url: 'https://www.atlassian.com/team-playbook/plays/retrospective' }],
  },
  {
    id: 'expected-and-actual-results',
    moduleTitles: ['Test Case Design'],
    lessonTitles: ['Expected and actual results', 'Writing Test Cases', 'Test Case Design'],
    objectives: ['Turn a requirement into a test another person can repeat.', 'Separate preconditions, inputs, steps, and expected results.', 'Record actual results and decide whether a case passes or fails.'],
    introduction: 'A good test case is a small set of clear instructions with a checkable outcome. Another student should be able to run it and understand your conclusion without having to guess what you meant.',
    sections: [
      {
        title: 'Start with a requirement, then choose one purpose',
        paragraphs: ['Suppose a school library form lets a student request between one and three books. The requirement says the number must be a whole number in that range. A test scenario is a broad idea such as “check the number of books”. A test case is one concrete check, such as entering 0 and expecting a validation message.', 'Keep one main purpose per case so a failure is easy to understand. Use separate cases for a valid request, an empty input, an out-of-range number, and a decimal value. If the requirement is unclear about a decimal value, ask for clarification instead of treating your guess as the expected result.'],
      },
      {
        title: 'Know the parts of a repeatable test case',
        paragraphs: ['Give the case an identifier so you can refer to it later. A clear title names the behaviour being checked. Preconditions explain what must already be true, such as the student being signed in and the request form being open.', 'Test data describes the exact input. Steps describe the actions in order. Write the expected result before execution using the requirement, and the actual result after execution using what you observed. The status records your conclusion; it is not a substitute for describing the evidence.'],
        table: { headers: ['Field', 'Example for the library form'], rows: [['ID and title', 'LIB-002: Reject a request for zero books'], ['Preconditions', 'A test account is signed in; the request form is open.'], ['Test data', 'Number of books = 0'], ['Steps', 'Enter 0, then select Submit request.'], ['Expected result', 'A validation message states the allowed range; no request is created.'], ['Actual result', 'Record the message and whether a request was created after execution.'], ['Status', 'Pass, fail, blocked, or not run, based on the evidence.']] },
      },
      {
        title: 'Work through a complete example',
        paragraphs: ['Confirm that you are using the intended test version and that the account has permission to request books. Open the form and clear any previous value. Enter 0, select Submit request once, and observe both the feedback and the request history.', 'Imagine the page accepts 0 and displays a success message. Record that observation as the actual result. The test fails because the input breaks the stated minimum of one book. The bug report should link back to LIB-002, which tells the developer which check found the problem.', 'Now imagine the page correctly rejects 0, but the request-history page is unavailable. You have evidence that the validation message works, but cannot verify every part of the expected result. Record the limitation and mark the appropriate check blocked rather than inventing an observation.'],
      },
      {
        title: 'Use boundaries and invalid inputs to widen coverage',
        paragraphs: ['For a range of one to three books, try 0, 1, 2, 3, and 4. Values 1 and 3 are the valid boundaries. Values 0 and 4 sit immediately outside them. Also consider an empty input and 1.5 because the requirement says “whole number”. Each case has its own expected result.', 'Do not copy observed behaviour into the expected-result field simply to make a case pass. If the requirement changes, update the expectation and explain the new rule. Keep earlier execution records so the history remains understandable.'],
        bullets: ['Valid case: 2 creates a request for exactly two books.', 'Lower edge: 1 is accepted; 0 is rejected.', 'Upper edge: 3 is accepted; 4 is rejected.', 'Invalid format: 1.5 is rejected when only whole numbers are allowed.', 'Missing input: an empty required field produces useful feedback.'],
      },
      {
        title: 'Review your case before someone else runs it',
        paragraphs: ['Ask a classmate to follow the instructions without extra hints. Replace “use the page normally” with the actual field, value, and button. Include the starting state and any cleanup needed to avoid affecting a later test.', 'For the practical activity, choose a form you are allowed to test. Write the input, steps, and expected result before trying it. Then record the actual result. If you have not run the case, write “not run” rather than claiming that an imagined observation occurred.'],
      },
    ],
    takeaways: ['A scenario describes what to investigate; a case describes one specific check.', 'Write expectations before execution and actual results afterwards.', 'Include exact inputs, starting conditions, and repeatable steps.', 'Pass/fail is a conclusion supported by recorded observations.'],
    checks: [
      { question: 'Where should “the page accepted zero books” go if you saw it during the test?', answer: 'In the actual-result field. The expected result should still describe the agreed rule that zero is rejected.' },
      { question: 'Why should a case say that the student is already signed in?', answer: 'It is a precondition. Without it, a classmate may be testing a sign-in failure rather than the book-request behaviour.' },
      { question: 'Can you write an actual result before running a case?', answer: 'No. Write the expectation first, then run the check and record what you observed. Use “not run” when execution has not happened.' },
    ],
    video: { id: 'nnqy-LB4g7o', title: '15 Steps To Write A Test Case', channel: 'Software Testing by Daniel Knott', focus: 'Practical advice for making test cases clear and useful to another tester.', prompts: ['Which details make a test repeatable?', 'How would you improve the title and steps of LIB-002?', 'Which advice separates an expectation from an observation?'] },
    sources: [{ title: 'TestDevLab: writing test cases with examples', url: 'https://www.testdevlab.com/blog/best-practices-for-writing-test-cases-an-introduction' }],
  },
  {
    id: 'clear-bug-reports',
    moduleTitles: ['Defect Reporting'],
    lessonTitles: ['Clear bug reports', 'Writing Bug Reports', 'Defect Reporting'],
    objectives: ['Write a clear summary and numbered reproduction steps.', 'Separate observed behaviour from expectations and guesses.', 'Describe impact, environment, evidence, and severity.'],
    introduction: 'You found a failure, but “the login is broken” does not give a developer enough information to investigate. A useful bug report tells the team what happened, why it matters, and how to reproduce it.',
    sections: [
      {
        title: 'Confirm the observation and describe one problem',
        paragraphs: ['Repeat the steps when practical to learn whether the failure happens consistently. If it only happens sometimes, report that frequency honestly and keep the conditions you observed. Do not hide an intermittent problem just because you cannot make it happen every time.', 'Check whether the issue has already been reported. One report should normally describe one distinct problem. Combining an incorrect mark, a slow page, and a misaligned button in one report makes it hard to decide what was fixed. A screenshot is useful evidence, but it does not replace written reproduction steps.'],
      },
      {
        title: 'Include the details someone else needs',
        paragraphs: ['The title should identify the feature, the failure, and the condition. Record the application version, device or operating system, browser, and account role where they matter. Exact conditions are particularly useful when a problem appears on a phone but not on a laptop.', 'Write numbered steps from a known starting state. Keep expected and actual behaviour in separate fields. Include error text and relevant evidence. Use test accounts and remove passwords or private student information from anything you attach.'],
        bullets: ['Title: a specific summary that another person can search for.', 'Environment: the version, device, browser, and account role.', 'Preconditions and test data: the starting conditions and exact inputs.', 'Steps: actions another person can perform in order.', 'Expected result: the agreed behaviour from the requirement.', 'Actual result: the observed failure and relevant error text.', 'Impact and evidence: who is affected and what supports the observation.'],
      },
      {
        title: 'Compare a vague report with a useful report',
        paragraphs: ['Vague report: “Login doesn’t work. Please fix it.” The team must guess which page, which credentials, and what “doesn’t work” means. It can take several rounds of questions before anyone can investigate.', 'The following is a fictional classroom observation. Replace the sample environment and results with what you actually tested. Do not copy a browser version or a failure claim that you did not observe.'],
        table: { headers: ['Report field', 'Worked example'], rows: [['Title', 'Correct classroom credentials leave the student on the sign-in page'], ['Environment', 'School-portal test build 1.2; classroom laptop; Chrome; student role'], ['Preconditions', 'An active student test account exists and is signed out.'], ['Steps', '1. Open Sign in. 2. Enter correct test credentials. 3. Select Sign in once.'], ['Expected result', 'The dashboard opens and shows the student’s name.'], ['Actual result', 'The form remains visible and displays “Unable to load dashboard”.'], ['Frequency and impact', 'Observed in three attempts; the student cannot reach lessons.'], ['Evidence', 'An error screenshot with credentials and identifying details removed.']] },
      },
      {
        title: 'Understand severity and priority',
        paragraphs: ['Severity describes how seriously the defect affects the product or user. Priority describes how urgently the team should address it. They are related, but not identical. A complete inability to sign in may be severe. A small typo on a page being shown at an imminent school event may have a higher immediate priority than a similar typo elsewhere.', 'In the QualityCraft activity, use the provided Low, Medium, or High severity scale and explain the impact. Do not assign High simply because the problem annoyed you. Consider whether the main task is blocked, whether data is wrong or lost, and whether a reasonable workaround exists.'],
        note: 'Describe observations neutrally. “The dashboard did not open after Sign in” is evidence. “The developer forgot the database” is an unverified guess.',
      },
      {
        title: 'Follow the defect through to a verified fix',
        paragraphs: ['A report helps a developer reproduce and investigate the failure. After a fix, rerun the original reproduction steps. That is retesting. Also check related behaviour, such as incorrect credentials and signing out, to look for unwanted effects of the change. That is regression testing.', 'In the activity, include a title, reproduction steps, expected and actual results, and severity. If you are reporting a fictional classroom scenario rather than a live observation, say so explicitly. A useful report is accurate enough for someone else to act on.'],
      },
    ],
    takeaways: ['Write one distinct, reproducible problem per report.', 'Keep expectations, observations, and possible explanations separate.', 'Severity describes impact; priority describes urgency.', 'Evidence supports the report, and retesting checks the fix.'],
    checks: [
      { question: 'Is “the server is probably broken” an actual result?', answer: 'No. It is a possible explanation. The actual result should state what you observed, such as an error message or a page that did not load.' },
      { question: 'What is missing from a report that contains only a screenshot?', answer: 'Usually the starting conditions, exact steps, test data, expected result, environment, and frequency. The screenshot supports those details.' },
      { question: 'What should you do when the developer says the issue is fixed?', answer: 'Rerun the original steps to verify the fix, record the outcome, and check related cases for regressions.' },
    ],
    video: { id: 'Qqfbr2itLGM', title: 'How To Write A Good Bug Report?', channel: 'Software Testing by Daniel Knott', focus: 'The information a development team needs to investigate a useful bug report.', prompts: ['Which details help another person reproduce a failure?', 'What would you add to a report that only says “login broken”?', 'How can a report stay concise without losing useful evidence?'] },
    sources: [{ title: 'Mozilla: bug writing guidelines', url: 'https://bugzilla.mozilla.org/page.cgi?id=bug-writing.html' }],
  },
]

const normalise = value => String(value || '').trim().toLowerCase().replace(/[–—]/g, '-')

export function getLessonGuide(moduleTitle, lessonTitle) {
  return lessonGuides.find(guide =>
    guide.moduleTitles.some(title => normalise(title) === normalise(moduleTitle)) &&
    guide.lessonTitles.some(title => normalise(title) === normalise(lessonTitle))
  ) || null
}

export function getGuideReadingMinutes(guide, originalContent = '') {
  const text = [originalContent, guide?.introduction, ...(guide?.objectives || []), ...(guide?.sections || []).flatMap(section => [section.title, ...(section.paragraphs || []), ...(section.bullets || []), section.note, ...(section.table?.rows || []).flat()]), ...(guide?.takeaways || [])].filter(Boolean).join(' ')
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 180))
}

// Existing installations receive the wording fix immediately, before their next migration.
export function getLessonQuestionText(question, guide) {
  if (guide?.id === 'risk-based-testing' && question.question_text === 'What is testing with expected and unexpected inputs called?') {
    return 'What is testing with invalid or unexpected inputs called?'
  }
  return question.question_text
}
