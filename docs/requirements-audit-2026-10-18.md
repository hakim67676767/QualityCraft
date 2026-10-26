# QualityCraft requirement audit — 18 October 2026

Scope: the six requirements, intended student journey, and three report outcomes supplied in the conversation. Product revision: `25c7c57`. This review inspected current source, reran automated checks, and exercised the built application with real Express/MySQL services in an isolated temporary database. The live Railway page and database readiness returned HTTP 200 and served the matching frontend bundle. No production learner records were created, changed, or used as research evidence.

## Verdict

The main application features work in the tested workflows. The supplied requirements are not fully satisfied word for word: the dashboard recommends the next module rather than an individual pending practical activity, and the default pre/post instruments measure self-reported understanding using ratings rather than tested knowledge using percentage scores. Real participant evaluation results were not inspected in this audit, so successful test runs do not demonstrate the study outcomes.

## Component traceability

| Requirement | Status | Verified behaviour and limits |
| --- | --- | --- |
| Student dashboard: modules, next activity, progress, points, badges | Mostly satisfied | Modules, completion, quiz average, XP, level, earned badges, and next-module navigation are implemented in `frontend/src/StudentExperience.jsx`. Specific practical activities are available inside the Learning Path. A literal next-pending-activity card on the dashboard is not implemented. |
| Lessons, guided exercises, quizzes about testing, test cases, bug reports | Satisfied in tested workflows | Five lesson guides include objectives, examples, self-checks, and sources. Required test-case, bug-report, and reflection submissions and lesson quizzes work. Browser checks completed all five modules. Content authoring also supports these activity types. |
| Immediate quiz feedback | Satisfied | Submission returns an actual attempt score and per-answer feedback. The UI shows numbered answer cards, correct-answer comparisons, explanations, and best versus latest score. Earlier regression checks verify that lower retakes preserve the highest score. |
| Teacher dashboard and authorised class monitoring | Satisfied in tested workflows | Teachers can assign existing practical activities, monitor students, choose a student/activity for review, save feedback, and export CSV/PDF. Server queries restrict teachers to their own classes; students and teachers cannot enter administrator APIs. |
| Administrator users, content, assessments | Satisfied in tested workflows | User creation and role restrictions, module/lesson/question/activity editing, preview and publishing, versioned pre/post instrument authoring, participant authorisation, and research exports are implemented. Published/used instruments are locked against content changes. |
| Linked pre/post results and suitability feedback | Partially satisfies the supplied wording | Matching original before/after responses and suitability ratings can be saved, compared, summarised, and exported. Current defaults are ten matched 1–5 understanding statements, with percentage-score fields deliberately NULL. This implements the earlier user-selected survey format, not an objective pre/post knowledge test. Actual target-student evaluation results were not verified. |

## Student journey

The implemented sequence is:

Register / log in → join a teacher's class → original pre-survey → lessons and required practical work → quizzes and immediate feedback → progress, XP and badges → original post-survey → suitability feedback.

Reading, practical submissions, quizzes, and rewards repeat within each module. Progress and badges are available during learning. Modules unlock in sequence; quizzes require lesson reading and required practical work; the post-survey requires all published modules complete. Suitability submission requires a recorded post-survey. Research authorisation is an additional configurable gate; research comparisons require an authorised participant with all recorded approvals. Withdrawal excludes the participant from research analysis.

This follows the intended journey with the explicit class-enrolment step added. Research-mode settings determine whether recorded authorisation is required before survey access.

## Three final-report outcomes

| Outcome | What the evidence supports | What remains |
| --- | --- | --- |
| The platform works, supported by recorded system tests | Supported for the tested workflows, roles and desktop/tablet viewports. Commands and browser scenarios are recorded below and in existing verification documents. | Put test cases, expected/actual results, execution dates and screenshots in the final report. These checks do not establish all-browser compatibility or classroom-load capacity. |
| Suitability for the target students has been evaluated | The six-item suitability questionnaire, optional comment, persistence, authorised research summaries and exports work. | Conduct or provide the actual target-group evaluation, participant counts and collected responses, then report the analysis. Synthetic QA accounts cannot demonstrate this outcome. This audit does not establish whether a real study has already taken place. |
| Change in understanding measured with linked pre/post results | Original responses are linked to the same student and research study code; matched statements and concept keys produce before/after means and changes. Retakes are separate and do not replace the original baseline. | With the current instruments, describe the outcome as change in **self-reported understanding on a 1–5 scale**. Objective knowledge gain would require comparable scored knowledge assessments. Actual paired participant results and the study interpretation remain to be supplied or reviewed. |

Recommended report wording that matches the current chosen survey format: “A comparison of students' matched pre-learning and post-learning self-reported understanding ratings, together with participant feedback on the platform's suitability.” If the approved project specification explicitly requires objective knowledge scores, agree the assessment method with the supervisor before data collection. Existing lesson-quiz best scores cannot substitute for a pre-learning knowledge baseline. Do not reset original survey responses or publish replacement instruments solely for this audit.

## Verification performed in this audit

| Check | Result |
| --- | --- |
| Frontend `npm test` | PASS: five tests, including highest-score retention and latest-attempt handling. |
| Frontend `npm run lint` | PASS. |
| Frontend `npm run build` | PASS: 55 modules; bundle `index-DMtjpmYW.js`. |
| `node scripts/check-lesson-content.mjs` | PASS: five guides plus custom-lesson isolation and wording checks. |
| Backend `npm test` | PASS: 13 tests across authentication, readiness/configuration, reporting, consent, matching survey ratings and snapshots; SQL checks: zero mismatched INSERTs. |
| Backend `npm run test:db` | PASS: real temporary MySQL installation, version binding, submission gates, consent withdrawal, best-score reports, activity assignments/revisions, exports, and backup/restore. |
| `playwright-understanding-survey-qa.js` | PASS: administrator account creation/authorisation and rating instrument editor, class join, required pre-survey and keyboard responses, all five learning modules, quiz feedback/retake, post-survey, reload persistence, student/teacher/admin paired results and CSV. |
| `playwright-reflection-qa.js` | PASS: locked/active/completed post-survey, required answers, submission error recovery, suitability submission, original comparisons, incompatible/legacy results, profile, retakes, original-response/XP preservation, and layouts. |
| `playwright-release-qa.js` | PASS: teacher assignment, student/activity review menus, student-visible teacher feedback, review invalidation after revision, CSV/PDF downloads, role restrictions, earned badges/sorting, reload/logout. |
| `playwright-content-qa.js` | PASS: content CRUD and validation, all quiz/activity types, load/save recovery, selection changes, native delete handling, preview, publication, assignment availability, and persistence. |
| Live deployment read-only check | HTTP 200 for the page and `/api/ready`; current bundle found. Full browser journeys above ran against the isolated installation, not the live participant database. |

The four browser scenarios reported zero uncaught JavaScript errors. Relevant layout checks used 1440, 1024 and 768 pixels with light/dark preferences. Phone layouts remain outside the requested scope. Test downloads include the anonymised understanding CSV and teacher CSV/PDF; the understanding export did not contain the test student's name or email. The PDF download was checked by the browser scenario, not visually audited here.

The prior quiz label change left eleven obsolete “Latest score” selectors in five browser scripts. This audit updated those test selectors to “Latest attempt”; the understanding-survey scenario then passed against the current interface. No product behaviour was changed by this audit.

Browser artifacts are local, ignored files under `design-review/playwright`. Useful evidence includes `07-quiz-feedback.png`, `27-student-survey-comparison.png`, `28-teacher-survey-results.png`, `29-admin-survey-comparison.png`, the `38-survey-results-*`, `43-post-test-complete-*`, and `45-content-*` screenshots, `understanding-survey.csv`, and `release-teacher-progress.csv/pdf`. They contain temporary QA identities and synthetic results.

## Remaining actions

1. Align the final-report assessment wording with the chosen rating-only format, or arrange an approved separate objective pre/post assessment if knowledge-test scores are mandatory.
2. Decide whether “next activity” means the existing next-module recommendation or a specific pending practical activity; the latter would require a dashboard change.
3. Conduct or provide the actual authorised Form 4/5 participant study and analyse its matched original surveys and suitability responses. Report participant totals, missing/excluded pairs, dates and limitations.
4. Attach the recorded system-test evidence to the final report. Use real study exports for evaluation conclusions, never the synthetic QA changes shown in screenshots.

Before collecting real participant records on the current trial deployment, address the previously documented hosted-backup gap in `docs/railway-deployment.md`. This audit did not reconfigure hosting or certify recovery on Railway.

Related evidence: [requirements traceability](fyp2-requirements-traceability.md), [understanding survey method](understanding-surveys.md), [browser verification](playwright-browser-verification.md), [highest quiz scores](quiz-best-scores.md), and [deployment status](railway-deployment.md). The older release-readiness document is a historical pre-deployment snapshot; its statement that no public deployment had occurred is superseded by the deployment notes and this audit.
