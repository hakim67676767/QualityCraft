# Release readiness — 18 October 2026

QualityCraft passes the local functional checks below and is suitable for a demonstration or staging deployment. Public launch remains conditional on configuring and checking the actual host. No public deployment was performed in this review.

## Verified in this review

| Area | Result and evidence |
| --- | --- |
| Frontend | ESLint, question compatibility unit test, production Vite build, and all five lesson guide checks pass. |
| Backend | Twelve automated tests pass across authentication, production configuration, reporting, consent, matched understanding ratings, and response snapshots. SQL checks find zero mismatched INSERT statements. |
| Dependencies | `npm audit --json` reports zero known vulnerabilities in both packages, including frontend development dependencies. `npm ls --depth=0` passes for both installations. This is a point-in-time advisory check. |
| Installation | The MySQL regression now invokes the real setup command twice on a new random database. Both fresh setup and repeat setup finish successfully. |
| Student learning | Browser verification completes class enrolment, the ten-statement pre-survey, reading, required practical work, all five module quizzes, a quiz retake, the matched post-survey, and saved results after reload. |
| Classes | Fresh-install browser checks pass student joining, teacher/admin creation, teacher ownership restrictions, search, additional membership persistence, navigation shortcuts, and failed load/create/join recovery at all three desktop/tablet widths. |
| Progress | A separate fresh-install browser run verifies persisted 20/50/90/100 module progress, 0/20/100 course completion, filters, quiz retakes and full history, post-test/results actions, reloads, and an empty catalogue. Four progress states pass all three widths under light/dark system preferences. |
| Surveys and profile | Browser checks cover locked/active/completed post-test states, suitability feedback, per-statement comparisons, old/incompatible/missing results, profile milestones, and pre/post survey retakes preserving original responses and XP. |
| Teacher and permissions | Browser checks confirm assignment delivery with a due date, learner/activity review menus, feedback visible to the student, obsolete feedback cleared after revision, CSV/PDF downloads, and forbidden student/teacher access to staff/admin APIs. Logout removes browser authentication. |
| Content management | Browser checks pass module/lesson/question/activity CRUD, all supported question and activity types, validation, failed request recovery, delete confirmation and focus restoration, preview readiness, publish/hide/republish, and reload persistence. |
| Data integrity and recovery | The isolated MySQL suite passes version-bound assessments, concurrent duplicate submission handling, authorisation/withdrawal rules, assignment and review revisions, exports, and full backup restoration into a separate new database. All restored table row counts match; overwriting an existing target is rejected. |
| Existing local services | The regular frontend and API health endpoints both return HTTP 200 after verification. The isolated browser helper databases are removed after testing. |

Browser scenarios use the built frontend and real Express/MySQL services in randomly named temporary databases. Deliberate 400/401/403/409/503 responses are used to verify validation, access restrictions, and recovery; they are not unexpected browser JavaScript exceptions. No real learner records are changed. Desktop/tablet checks use 1440, 1024, and 768 pixel widths; relevant redesigned screens are checked with both light and dark system preferences. Phone layouts are outside this review's requested scope.

## Fixed during the review

- Added the missing `backend/.env.example` referenced by first-time setup instructions.
- Closed the shared database pool when the setup command finishes, preventing a completed setup from keeping the process alive.
- Added production startup checks for configured database credentials, a dedicated non-root database account, and a non-placeholder JWT secret of at least 32 bytes.
- Verified production session cookies include Secure, HttpOnly, and SameSite=Strict.
- Added no-store API responses, content-type sniffing protection, frame embedding protection, and a referrer policy; disabled the Express identification header.
- Made malformed session cookies return 401, malformed JSON return 400, oversized JSON return 413, and empty login/registration requests return validation errors.
- Added regression coverage for these cases and repeated login throttling. Updated deployment instructions to use HTTPS and one origin for frontend/API.

## Required on the live host before inviting users

1. Deploy the built frontend through Express on the same HTTPS origin as `/api`. Set `NODE_ENV=production`, the live `CORS_ORIGIN`, a private random JWT secret, and credentials for a dedicated application database account. Leave `VITE_API_URL` unset. The current local installation is in development mode and uses MySQL root; those settings must not be copied to production.
2. Take a private full backup before changing an existing database; apply migrations using a deployment account with the necessary schema permissions. New installations use setup. Give the runtime account only the permissions it needs on the application database.
3. Create secure live administrator/teacher accounts. Remove unnecessary demo accounts or replace their test passwords before allowing public access. Do not distribute the local `.env`, backups, browser session files, QA downloads, or downloaded tool repositories.
4. Configure recurring private database backups and verify that an operator can restore them. The backup command and automated restoration test are implemented; an actual hosting backup schedule has not been configured or checked here. See [database recovery](database-recovery.md).
5. Verify on the real HTTPS URL: sign-in as each role, session persistence after reload, logout, static assets, API access, a trial class/assignment/feedback exchange, survey access, exports, and restart/recovery. Confirm the host restarts the backend after a failure and does not publicly expose MySQL.
6. Review the published course and survey wording and enable research authorisation according to the actual study's recorded approvals before collecting participant data.

The live domain, TLS/reverse proxy, hosting environment, scheduled backups, and a realistic concurrent classroom workload have not been verified. Keyboard checks are included in browser scenarios; a screen-reader audit and independent penetration test have not been performed. Passing local checks does not certify these external conditions.

## Repeating the checks

Run `npm run lint`, `npm test`, `npm run build`, and `node scripts/check-lesson-content.mjs` from `frontend`; run `npm test` and `npm run test:db` from `backend`. Database tests require create/drop permission for their own temporary databases, and the setup regression launches a child Node process.

For browser checks, start `node scripts/browser-qa-server.js` from `backend` with stdin available, and use the named `qualitycraft-qa` Playwright CLI session against `http://127.0.0.1:4179/`. In a fresh temporary installation, run `playwright-understanding-survey-qa.js`, then `playwright-reflection-qa.js`, `playwright-release-qa.js`, and `playwright-content-qa.js` from `frontend/scripts`. Run the progress and classes suites in separate fresh temporary installations. Close the QA browser and send `stop` to the helper after each installation to remove its database. See [browser verification](playwright-browser-verification.md).

The release scenario was added in this review. An initial stale selector for the Learning Path assignment section was corrected to use its accessible region name; the corrected scenario passes.
