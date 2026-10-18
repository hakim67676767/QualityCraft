# QualityCraft FYP2 requirements traceability

This matrix records how the implemented prototype maps to the requirements and research procedure in the QualityCraft project report. It is intended to be updated with the final pilot dates, participant totals, ethics reference, screenshots, and measured results before submission.

**Survey format change, 16 October 2026:** the user selected rating-only pre/post surveys about software-testing understanding. The implemented default now measures self-reported understanding on a 1–5 agreement scale, replacing the report's proposed objective knowledge-test format. Historical knowledge scores remain separate. See [the statements, interpretation, and verification](understanding-surveys.md).

| Requirement or evidence | Implementation | Verification evidence | Status |
| --- | --- | --- | --- |
| Student, teacher, and administrator access | Role checks in `backend/middleware/auth.js` and protected routes in `backend/server.js` | API test confirms public registration cannot request an administrator role; database smoke test confirms a teacher cannot use administrator content APIs | Implemented |
| Sequential learning journey | Class and pre-test gates, module unlock middleware, lesson completion, required activity gate, quiz, post-test, and suitability survey | Database smoke test checks every gate, including required practical work before a quiz | Implemented |
| Practical software testing activities | Structured test-case, bug-report, and reflection submissions with teacher feedback | Database smoke test submits and reviews activities; teacher review screen organizes work by student and activity | Implemented |
| Teacher class assignment | Teacher Assignments workspace with class, activity, and optional due date | Database smoke test creates and reads a class assignment | Implemented |
| Teacher monitoring and reports | Class analytics, student progress, practical review, CSV, and PDF export | Database smoke test verifies reports and exports | Implemented |
| Content, quiz, badge, and rule management | Administrator content and gamification workspaces with validation, preview, publication, and audit entries | Unit and database smoke tests cover authoring and publication | Implemented |
| Versioned pre-test and post-test instruments | Editable drafts, immutable published versions, signed student/phase/version form references, and linked attempt records | MySQL regression verifies published multiple-choice payloads, draft edits, publication, historical grading, and concurrent-submission protection | Implemented |
| Rating-only software-testing surveys (updated user requirement) | Ten matching understanding statements, individual rating snapshots, no percentage score; student, teacher, and admin displays and exports | Unit tests, database regression, and full browser journey with both surveys | Implemented |
| Consent, assent, and school permission | Research participant register with opaque study codes and pending, authorised, or withdrawn status | Unit tests require all three approvals; API prevents authorisation with incomplete approvals | Implemented |
| Separate demonstration users from research participants | Ordinary accounts remain outside `research_participant`; optional research-authorisation gate can be enabled by an administrator | Default keeps demonstrations usable; setting can require an authorised record before assessment | Implemented |
| Paired pre/post analysis | Anonymised analysis for valid pairs, incomplete and excluded cases, means, medians, gains, sample SD, IQR, percent change, and Likert frequencies | Pure analytics unit tests plus end-to-end database test | Implemented |
| Anonymised research export | CSV contains study code, scores, change, pair status, and suitability responses without names or email addresses | Database smoke test rejects an export containing the test student's name | Implemented |
| Audit logs and settings | Administrator Research & Evidence workspace reads audit history and controls registration/research authorisation | Database-backed endpoints and audit recording | Implemented |
| Backup evidence | Administrator configuration export plus a separate full database backup/restore command; see `docs/database-recovery.md` | MySQL regression restores every table into a second temporary database, compares row counts and key records, and refuses an existing target | Implemented |
| Accessibility baseline | Skip link, labelled controls, semantic tables, keyboard-reachable regions, status/alert messages, visible focus styles | ESLint and production build; manual keyboard and screen-reader review remains part of final acceptance | Implemented; manual review required |
| Desktop and tablet interface | Role-specific dashboard layouts and organized teacher/admin workflows | Production build and existing interface verification scripts | Implemented |
| Native mobile application | Explicitly outside the report scope and excluded from this implementation | Scope decision | Not required |

## Verification commands

From `backend`:

```text
npm test
npm run test:db
```

From `frontend`:

```text
npm run lint
npm run build
```

## Evidence still supplied by the researcher

The software cannot create institutional evidence. Before the final report is submitted, attach the ethics or faculty approval reference, school permission, blank guardian consent and student assent forms, recruitment dates, actual authorised participant total, participant withdrawal/exclusion notes, test execution screenshots, and the final anonymised analysis export. Keep identity-to-study-code mapping outside research exports and restrict it to the authorised researcher.
