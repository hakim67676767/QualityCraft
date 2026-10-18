# QualityCraft — Ponytail audit

## Fix status after implementation

The original audit below is retained as the record of what was found. The application defects have now been addressed using Ponytail's implementation workflow:

| Finding | Resolution | Verification |
| --- | --- | --- |
| 1 — withdrawn statistics | Shared strict status-and-consent eligibility for summaries and exports | Unit and MySQL withdrawal regression |
| 2 — choice options crash | Frontend accepts array and JSON-text options; assessment API emits arrays | Frontend unit test and published-instrument API regression |
| 3 — post/survey consent bypass | Authorisation guard on all research collection routes | MySQL rejects withdrawn pre/post/survey access |
| 4 — test version mismatch | Signed delivery reference and immutable published content; version columns in research export | Open v1 grades against v1 after v2 publication; duplicate submissions rejected |
| 5 — ignored instrument edits | Validated draft updates and publication; normalised item fields; copy published items to a new version | Draft edits persist; published edits rejected; create-as-published honoured |
| 6 — assignments disconnected | Class assignment and due-date data delivered to students and shown in Learning Path | MySQL student assignment metadata check; frontend lint/build |
| 7 — feedback invisible | Student API and activity form expose feedback and review status | MySQL verifies learner receives the review |
| 8 — pending consent stuck | Existing participant approval checkboxes and explicit save action | API regression completes pending approvals; frontend lint/build |
| 9 — stale review | Changed content clears obsolete review and returns to submitted; unchanged saves preserve review | MySQL verifies both paths |
| 10 — incomplete backup | UI accurately labels configuration export; separate full backup and safe restore command | All tables restored with matching row counts; target-overwrite rejection tested |
| 11 — missing stats/actor | Suitability object rendered correctly; audit endpoint returns actor_name | Verified in the real Chrome research workspace; screenshots in `design-review/playwright` |
| 12 — insufficient tests | Published-version, consent, assignment, feedback, recovery and active-report regressions added | Automated checks plus full Chrome admin/teacher/student journeys; see `docs/playwright-browser-verification.md` |
| 13 — unused implementations | Removed unused `gamificationService.js` and frontend `lib/journey.js` | Caller search and passing checks |

No real participant or assessment records were created or altered for these tests. The two unused helper files were removed; their original contents remain available in the conversation's patches. Chrome browser verification is now complete for the workflows documented in `docs/playwright-browser-verification.md`. Screen-reader testing and a concurrent classroom load test have not been completed.

## Original findings

What this repo does: QualityCraft teaches introductory software testing through lessons, practical activities, quizzes, and pre/post assessments. Teachers assign and review work; administrators manage accounts, content, rewards, and research records. This audit assumes a classroom pilot of roughly 30–50 students, several teachers, and occasional simultaneous submissions on one Express server and MySQL database.

Method: applied the downloaded `ponytail/skills/ponytail/SKILL.md` and `ponytail/skills/ponytail-audit/SKILL.md`. Read the entry points, schema and migrations, authentication, journey rules, content service, progress, rewards, reporting, research analysis, the main student/teacher/admin components, and the existing tests. The downloaded Ponytail repository, installed dependencies, and generated bundles were outside the product audit scope.

The application's existing automated checks pass. That does not establish that every feature works: the new failure cases below are absent from those checks. The earlier statement that the complete system was functional was too broad.

No application source was changed during this audit. Targeted API checks ran against a randomly named temporary MySQL database, which was removed afterward. Existing users, consent records, settings, and research data were not changed.

## Must fix

1. **Withdrawn participants still count as authorised in the research summary** (`backend/services/researchService.js:81`; `backend/server.js:809`).

   - **What this is:** The research summary calculates valid pre/post pairs and suitability statistics.
   - **Problem:** `isAuthorised()` falls back to checking the consent flags even when the explicit status is `withdrawn` or `pending`. Reproduced: one withdrawn participant with all three historical consent flags set still produces `authorisedParticipantCount: 1` and `validPairs: 1`; the CSV correctly excludes the same participant, so screen and export disagree.
   - **Fix:** Make an explicit participant status authoritative and require the relevant consent flags. Use the same eligibility rule for the summary, CSV, and backup summary.
   - **If we skip it:** Withdrawn participants remain in the reported research results and distort the analysis.

2. **Published multiple-choice assessments break the student question renderer** (`frontend/src/App.jsx:487`; `backend/server.js:173`).

   - **What this is:** `QuestionControl` renders questions for lesson quizzes and the pre/post assessments.
   - **Problem:** Lesson questions return options as JSON text, but the new JSON-backed assessment items return an actual array. The frontend always calls `JSON.parse(question.options)`. Reproduced with options `["A", "B"]`: the exact renderer expression throws `SyntaxError` because it attempts to parse `A,B` as JSON.
   - **Fix:** Accept an existing array and parse only string values, or normalize the API contract consistently. Validate that the result is an array.
   - **If we skip it:** Publishing ordinary choice-based research assessments can break the student assessment page.

3. **Withdrawing permission does not block the post-test or suitability survey** (`backend/server.js:117`; `backend/server.js:604`; `backend/server.js:664`).

   - **What this is:** The administrator can require research authorisation before research assessments.
   - **Problem:** The authorisation check is attached only to the pre-test routes. Reproduced: after a student completed the pre-test, an administrator withdrew the participant and enabled `requireResearchAuthorisation`; submitting the post-test still returned HTTP 201. The suitability submission route also has no research-authorisation check.
   - **Fix:** Apply the current participant authorisation rule to all research collection endpoints when the setting is enabled.
   - **If we skip it:** The system continues accepting research data after authorisation is withdrawn.

4. **A test can be graded against a different version from the one the student loaded** (`backend/server.js:173`; `backend/server.js:316`; `backend/server.js:620`; `frontend/src/App.jsx:299`).

   - **What this is:** Published instruments define the questions and answer keys for each assessment phase.
   - **Problem:** GET loads the current instrument, but POST receives only answer positions and reloads whichever instrument is current at submission time. Reproduced: the student loaded v1 with correct answer A; the administrator published v2 with correct answer B; submitting A recorded a score of 0 against v2, although the student had seen v1.
   - **Fix:** Bind the delivered instrument and ordered items to the student's assessment attempt. Grade that same version, or explicitly reject a stale form before writing a result. Research pairing should also identify the instrument versions used.
   - **If we skip it:** Publication during a session can silently produce incorrect scores and misleading pre/post comparisons.

5. **The assessment editor reports success while discarding edits** (`frontend/src/ResearchAdmin.jsx:137`; `backend/server.js:741`; `backend/server.js:763`).

   - **What this is:** Administrators create and edit instrument titles, versions, phases, items, and publication status.
   - **Problem:** POST always creates a draft even when the form selects Published. PATCH updates only status. Reproduced: PATCH returned HTTP 200 after changes to the title, version, and question, but GET returned every original value. GET also returns `answer_key` and `construct_key` while POST expects `answerKey` and `constructKey`, so the displayed item JSON cannot be reused unchanged as a new version.
   - **Fix:** Make the form and API agree. Support validated draft edits and explicit publication, and create a new immutable version for changes to an instrument already used in a study. Normalize item field names.
   - **If we skip it:** Administrators can believe corrected questions were saved or published when students still receive the old instrument.

6. **Teacher assignments are not connected to the student workflow** (`backend/server.js:552`; `backend/server.js:875`; `frontend/src/TeacherAssignments.jsx:109`).

   - **What this is:** Teachers select activities for their class and optionally set a due date.
   - **Problem:** Assignment rows are written and listed for staff, but student content, progress, and submission routes never read `class_assignment`. Reproduced: assigning an activity left the student's response unchanged and returned no assignment, class, or due-date fields. The UI promise that students will see the assignment is not implemented.
   - **Fix:** Include class assignments and due dates in student data and display them in the learning path. Define how assigned activities relate to the existing globally required curriculum, then apply that rule consistently.
   - **If we skip it:** Teachers can save assignments that students cannot identify or follow.

7. **Students cannot read teacher feedback** (`backend/server.js:552`; `frontend/src/App.jsx:434`).

   - **What this is:** Teachers review practical submissions and save feedback for learners.
   - **Problem:** Feedback is stored, but `/api/activities` does not return it and `ActivityForm` does not display it. Reproduced: after a teacher saved a review, the student's activity response had neither a `feedback` field nor review status.
   - **Fix:** Return review status, feedback, and review time for the authenticated student's own submissions, then show them in the activity form.
   - **If we skip it:** The teacher's review never reaches the learner, breaking the practical feedback loop.

8. **Pending participants cannot have their consent completed through the interface** (`frontend/src/ResearchAdmin.jsx:184`; `frontend/src/ResearchAdmin.jsx:205`).

   - **What this is:** A participant may be registered before every permission is received.
   - **Problem:** Consent checkboxes exist only on the creation form. Existing records offer only status changes, and Authorised is disabled when approvals are incomplete. Creating a pending participant also removes the student from the eligible list, so the creation form cannot update that record later. This was confirmed by tracing both form handlers and the backend update contract.
   - **Fix:** Let administrators edit the three approval fields on the existing participant record and send them to the existing PATCH endpoint.
   - **If we skip it:** A normally recruited participant can become stuck pending even after all permissions arrive.

9. **Changed work keeps its old Reviewed status** (`backend/server.js:578`).

   - **What this is:** Students can save a revised practical submission after review.
   - **Problem:** The update replaces content and submission time but preserves status, reviewer, and old feedback. Reproduced: completely different content remained `reviewed` with feedback written for the previous version.
   - **Fix:** When content changes, mark the revision as submitted and invalidate the review associated with the previous content. If retaining old feedback, label it clearly as applying to the earlier revision.
   - **If we skip it:** Teachers' pending-review counts and the review badge falsely suggest the new work has been checked.

## Should fix

10. **Download backup exports configuration, not recoverable study records** (`backend/server.js:819`; `frontend/src/ResearchAdmin.jsx:252`).

    - **What this is:** The administrator can download a file labelled as a backup.
    - **Problem:** The download includes learning content, settings, and an aggregate research summary. It excludes participant mappings, individual assessment attempts, classes, assignments, submissions, and individual survey responses; there is no restore workflow. Inspecting the downloaded object confirmed those records are absent.
    - **Fix:** Label this accurately as a configuration export and document a separate database backup and tested restoration process. Do not treat the current JSON as a complete system recovery backup.
    - **If we skip it:** A researcher relying on this file cannot recover the study after database loss.

11. **The research page hides suitability statistics and administrator names** (`frontend/src/ResearchAdmin.jsx:239`; `frontend/src/ResearchAdmin.jsx:258`; `backend/server.js:780`).

    - **What this is:** Research & Evidence presents suitability results and recent administrative activity.
    - **Problem:** The suitability renderer runs only when `summary.suitability` is an array; the service always returns an object containing `frequency` and `byItem`. The audit list reads `actor_name` or `admin_name`, but the endpoint returns `actor`, so it displays an empty User label instead of the administrator's name.
    - **Fix:** Render the actual suitability object and align the actor field between the API and interface.
    - **If we skip it:** Existing research results and the responsible administrator are hidden from this page despite valid API responses.

12. **The passing checks miss the workflows most likely to break** (`backend/scripts/smoke-db.js:50`; `backend/tests/researchService.test.js:31`; `frontend/scripts/check-student-design.mjs:16`).

    - **What this is:** Automated checks are used as evidence that the system works.
    - **Problem:** The database smoke test creates only a draft instrument and then completes the fallback quiz-question flow. It does not test a published choice-based instrument, edits, withdrawal, or feedback delivery. The existing visual fixture supplies string options and never exercises the JSON-array contract; the reporting unit test checks an older helper rather than the active reporting service.
    - **Fix:** Add focused regression checks for findings 1–9, using actual API payload shapes. Test the active reporting service and run at least one browser journey with a published research instrument.
    - **If we skip it:** The checks will continue passing while these features remain broken.

## Nice to have

13. **Remove unused parallel implementations of rewards and journey rules** (`backend/services/gamificationService.js:1`; `frontend/src/lib/journey.js:1`).

    - **What this is:** Older reward and student-journey helpers coexist with the implementations used by the app.
    - **Problem:** Searches of application code, tests, configuration, and documentation found no callers of either file. They contain 186 lines of unused alternative logic. For example, the unused reward helper increments XP without the event ledger that the active `rewardService` uses to prevent duplicate awards.
    - **Fix:** Delete these unused files after preserving the active `rewardService`, backend journey middleware, and current frontend behavior.
    - **If we skip it:** Future fixes can target code that the application never executes, or accidentally reintroduce weaker reward handling.

## Checks and limits

- Passed: `backend/npm test` (six Node tests plus SQL insert check).
- Passed: `backend/npm run test:db` (fresh MySQL happy-path journey).
- Passed: `frontend/npm run lint` and `frontend/npm run build`.
- Additional isolated MySQL/API reproductions confirmed findings 1–7 and 9, and inspected the backup contents for finding 10.
- Findings 8, 11, 12, and 13 are based on tracing the actual callers, response shapes, and source paths. No interactive browser session was used to demonstrate them.
- The temporary audit database was removed in a finally block; no production or demonstration records were edited.

Verdict: Fix withdrawn-participant handling and published assessment rendering first, then version binding and the editor contract. The normal demonstration journey passes, but the research workflow is not ready for a real pilot until these defects are addressed.

Lean: -186 lines, -0 dependencies possible from the two unused implementation files alone.

Not checked: interactive browser rendering, screen-reader behavior, concurrent classroom load, deployment/TLS configuration, third-party dependency vulnerability scanning, or real external video availability. The audit did not examine every CSS rule or study-guide paragraph. No application fixes were applied.
