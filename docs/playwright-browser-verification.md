# QualityCraft browser verification

The badge redesign has additional [verification notes and screenshots](badge-redesign.md), including its dedicated browser scenario.

The current default pre/post format is a rating-only understanding survey. Its [verification notes and standalone browser scenario](understanding-surveys.md) cover the new format; the sequence below explicitly publishes knowledge instruments to check historical compatibility.

Playwright CLI 0.1.22 and its Codex companion skill are installed. The tests use an isolated, headless Google Chrome session and the real compiled frontend, Express backend, and MySQL database. Browser actions create and change records only in a randomly named temporary test database served on `http://127.0.0.1:4179`.

## Verified workflows

| Surface | Verified through the browser |
| --- | --- |
| Administrator | Sign in; create teacher and student accounts; register a pending participant; complete consent, assent, and school permission; authorise participation; enable the research gate |
| Assessment editor | Create a draft; change its title and question; save; publish separate multiple-choice pre-test and post-test instruments |
| Content and rewards | Preview an existing module; open XP rules and badges |
| Teacher assignments | Sign in; create a class; assign an activity with a due date |
| Student journey | Sign in; join the class; answer the published pre-test; see class assignments; complete all five lessons, practical submissions, and quizzes; retake a quiz; complete the published post-test and suitability survey |
| Quiz gate | Attempting a quiz before its required practical work is rejected; submitting the practical work permits the quiz |
| Practical review | Select a student and activity using dropdowns; save teacher feedback; sign in as the student and read that feedback; save a revision and verify that the old review is invalidated |
| Reporting | Download teacher CSV and PDF, anonymised research CSV, and configuration JSON |
| Research results | Display one valid pre/post pair, assessment versions, and six suitability ratings; withdraw the participant and verify the valid-pair total becomes zero; reauthorise and verify it becomes one |
| Access controls | Teacher and student requests to administrator APIs return 403 |
| Authentication | Password visibility control; invalid-login feedback; public student registration; session restoration after reload |
| Desktop and tablet | Administrator research, teacher monitoring, and student Learning Path at 1440, 1024, and 768 pixels; no horizontal page overflow or broken images |
| Staff UI polish | Review appears before reports; save confirmation and review counts refresh; an unchanged review can be saved; changing class clears the student/activity selection; survey details expand; research section links move keyboard focus; consent checkboxes have consistent dimensions |

No uncaught browser JavaScript errors were observed during the successful workflows. The request log contained no HTTP 500 errors. Expected HTTP errors were checked explicitly: 401 while signed out or testing an invalid login, and 403 for the required-activity gate or attempts to access an administrator API without that role.

The downloaded research CSV was checked for the absence of the learner's name and email, and for the presence of the pre/post instrument versions. The teacher CSV contains the expected test learner. The PDF begins with the expected `%PDF-` signature, and the configuration JSON has the documented export format. PDF visual layout was not reviewed in this pass.

## Saved evidence

Screenshots and downloaded test reports are in `design-review/playwright`:

- [Administrator research workspace](../design-review/playwright/02-research-admin.png)
- [Teacher assignment](../design-review/playwright/03-teacher-assignment.png)
- [Published student pre-test](../design-review/playwright/04-published-pre-test.png)
- [Student assignments](../design-review/playwright/05-student-assignments.png)
- [Required practical-work gate](../design-review/playwright/06-required-activity-gate.png)
- [Quiz feedback](../design-review/playwright/07-quiz-feedback.png)
- [Completed post-test and survey](../design-review/playwright/08-course-complete.png)
- [Teacher review](../design-review/playwright/09-teacher-review.png)
- [Teacher feedback visible to the learner](../design-review/playwright/10-student-teacher-feedback.png)
- [Paired research results](../design-review/playwright/11-paired-research-results.png)
- [Withdrawn participant excluded](../design-review/playwright/12-withdrawn-excluded.png)
- [Focused practical review](../design-review/playwright/16-focused-review.png)
- [Teacher dashboard](../design-review/playwright/17-teacher-dashboard.png)
- [Administrator dashboard](../design-review/playwright/18-admin-dashboard.png)
- [Organised research workspace](../design-review/playwright/19-research-workspace.png)

Additional screenshots cover all nine role/viewport combinations. They contain temporary test accounts, not real participants.

## Repeat the checks

Build the frontend first. From `backend`, start the temporary installation in a terminal:

```powershell
node scripts/browser-qa-server.js
```

Wait for the ready message. From the project root in a second terminal, run these commands in order, stopping if any returns an error:

```powershell
playwright-cli -s=qualitycraft-qa open http://127.0.0.1:4179 --browser=chrome
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-admin-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-staff-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-student-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-review-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-layout-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-ui-polish-qa.js
playwright-cli -s=qualitycraft-qa close
```

The files are Playwright CLI function expressions, not standalone Node programs. The scenarios deliberately depend on the records created in earlier stages. Use a fresh temporary installation for each complete run. Screenshots and reports replace the prior test evidence at the same paths.

In the server terminal, type `stop` and press Enter, or press Ctrl+C. The harness closes its server and removes its own temporary database. It validates the generated database name before removal. When launched through an automation terminal, keep stdin open with a PTY so that the stop command can be delivered.

## Limits

The Learning Path was redesigned and checked separately on 17 October 2026. See the [Learning Path change notes and repeatable scenarios](learning-path-redesign.md).

Classes was also redesigned and checked for students, teachers, and administrators on 17 October 2026. See the [Classes change notes and scenario](classes-redesign.md).

Survey Results, Post-test, and Profile were redesigned and checked on 17 October 2026, including the Classes heading visibility correction under dark system preferences. See the [reflection and profile change notes](reflection-profile-redesign.md).

Progress was redesigned and checked on 18 October 2026, including partial module progress, course totals, filters, quiz history, and the lesson-completion refresh when navigating between pages. See the [Progress change notes](progress-redesign.md).

Manage Content was redesigned and checked on 18 October 2026, including its simple usage guide, creation/editing flows, preview/publishing, selection changes, and native delete confirmations. See the [content editor change notes](content-editor-redesign.md).

The workflow suite was rerun after the staff UI changes on 16 October 2026. This pass covers Chrome and the workflows above. It does not establish Firefox, Safari, screen-reader compatibility, simultaneous classroom load capacity, or external video availability. Mobile phone layouts were excluded as requested. See [the UI change notes](ui-polish.md).
