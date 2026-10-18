# QualityCraft

A React, Express, and MySQL learning platform for introductory software testing.

The frontend has an illustrated student sign-in experience and a dashboard with a learning trail, earned badges, and level progress. Its role selection, dashboard, learning pages, and staff workspace connect to the real QualityCraft API and database. Public registration still creates student accounts; teachers and administrators sign in with accounts assigned those roles.

Each Learning Path module opens into its lessons. Students read and mark a lesson complete before its own quiz unlocks. The server enforces that order and records lesson completion in MySQL. Existing quiz attempts are counted as completed lessons during migration, so past learning work is preserved.

After submitting a lesson quiz, the student stays on that lesson to see the score and answer feedback. The quiz form closes after the first submission. Learning Path shows the latest score and a **Retake Quiz** button for each attempted lesson. A retake is an explicit new attempt; submitting the same first attempt or the same retake twice is rejected. Retakes update the latest score and progress but do not award the first-attempt XP again. The API uses `POST /api/quiz-attempts` for a first attempt and `POST /api/quiz-attempts/retake` for a retake; the latter requires `previousAttemptId` from the most recent attempt.

## Requirements

- Node.js compatible with Vite 8 (Node 20.19+ or 22.12+)
- MySQL 8 with a database named `qualitycraft`

## First-time setup

1. Create an empty MySQL database:

   ```sql
   CREATE DATABASE qualitycraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Copy `backend/.env.example` to `backend/.env`. Set the database credentials and replace `JWT_SECRET` with a long random secret. Set `CORS_ORIGIN` if the development frontend is not at `http://localhost:5173`.

3. In `backend`, run `npm ci` followed by `npm run setup`. Setup creates the base schema, sample lessons, and the additional product migrations. It can be run again safely.

4. Create the first administrator using environment variables, then run `npm run admin:create` from `backend`. For example, in PowerShell:

   ```powershell
   $env:ADMIN_NAME = 'Your Name'
   $env:ADMIN_EMAIL = 'you@example.com'
   $env:ADMIN_PASSWORD = 'use-a-long-unique-password'
   npm run admin:create
   ```

5. In `frontend`, run `npm ci`, then `npm run dev`. In a second terminal, run `npm start` from `backend`. Open the URL printed by Vite. Public registration creates student accounts. Administrators create teacher accounts in **Manage users**.

For an existing installation, run `npm run migrate` in `backend` and restart the backend after updating the files. This adds lesson completion records and supplements the three seeded lessons whose quiz concepts needed clearer explanations.

## Production build

Run `npm ci` and `npm run build` in `frontend`, then `npm ci --omit=dev` in `backend`. Express serves the built frontend and `/api` from the same origin. Leave `VITE_API_URL` unset for this deployment. Configure `backend/.env` from the supplied template: set `NODE_ENV=production`, a random JWT secret of at least 32 bytes, a dedicated database account (not root), and `CORS_ORIGIN=https://your-domain`. Serve HTTPS through the hosting platform or reverse proxy; production sessions use Secure cookies and require HTTPS.

For a new installation, create the empty database and run `npm run setup` with an account permitted to create its schema. For an existing installation, take a private full backup and run `npm run migrate`. Then run `npm start` in `backend` with the production configuration. The runtime database account needs access only to the application database. Production startup rejects missing database credentials, root database accounts, and missing, short, or placeholder JWT secrets. Never copy the local development root credentials to hosting.

Publish the application source, lockfiles, backend schema/migrations, and built frontend. Exclude `.env`, database backups, `node_modules`, browser sessions, QA artifacts, and the downloaded `ponytail`/`playwright-cli` tool repositories. See [release readiness](docs/release-readiness.md) for the final verification record and hosting checks.

## Checks

- `frontend`: `npm run lint`, `npm run build`
- `backend`: `npm test`
- `backend`: `npm run test:db` creates a randomly named temporary database, runs the full student and teacher journey, and removes that database when the test finishes. The configured MySQL account needs database create/drop permission.

Playwright CLI browser checks now cover the real administrator, teacher, and student journeys in a separate temporary installation, including research instruments, approvals, assignments, feedback, reports, and desktop/tablet layouts. See [browser verification](docs/playwright-browser-verification.md) for results, screenshots, and repeatable commands.

The regular API integration test uses a mocked database; `test:db` verifies the complete journey against MySQL, including published assessment versions, concurrent submissions, consent withdrawal, assignments, feedback delivery, revisions, exports, and full backup restoration. The frontend also has `npm test` for question option compatibility.

Administrators manage versioned pre-test and post-test instruments in **Research & Evidence**. Draft questions are editable. Published or retired questions are copied into a new version for editing; the original remains available for students who already loaded it. Each assessment form carries a signed student/phase/version reference, so publication cannot change an open form's grading. If no instrument is published, the five legacy quiz questions remain the demonstration fallback.

Only participants with an authorised status and all three recorded approvals enter research summaries and exports. With **Require research authorisation** enabled, the server checks this rule for pre-tests, post-tests, and suitability submissions. Existing participant approvals can be updated in the participant table. The research export identifies the pre/post instrument versions; mixed version groups are shown separately on the page.

Class assignments and optional due dates appear in the student's Learning Path and activity form. Assignments are class reminders: due dates do not change the published curriculum's required-activity quiz gate. Teacher feedback appears with the student's own submission. Saving changed content marks it submitted again and removes the review for the old version; saving identical content preserves the review.

**Export configuration** downloads content and settings only. For a full database backup containing accounts and individual study records, and safe restoration into a new database, see [database recovery](docs/database-recovery.md). The automated MySQL check tests restoration using temporary databases and refuses to overwrite an existing target.

For local visual checks, build the frontend and run `node scripts/check-student-design.mjs` from `frontend` with Node 22+ and Chrome installed. Set `QA_CHROME_PATH` if Chrome is installed somewhere other than its default Windows location. The check uses isolated fixtures, verifies sign-in controls, dashboard navigation, all five study guides, answer reveals, and video controls at desktop, tablet, and phone widths, and saves screenshots in `design-review`. It does not connect to the real backend or database. Video requests are blocked in the browser smoke check; live video metadata is checked separately.

The five built-in lessons now have original expanded study guides in `frontend/src/content/lessonGuides.js`: objectives, numbered explanations, worked examples, comparison tables, takeaways, self-checks, and a selected YouTube video with watch prompts. Guides match both module and lesson titles; teacher-written notes remain visible, and custom lessons retain their original reader. The guides work immediately with the existing API and require no database migration. Reading-time estimates use 180 words per minute and exclude video duration.

Run `node scripts/check-lesson-content.mjs` from `frontend` to check guide coverage and lesson matching. Run `node scripts/check-lesson-resources.mjs` to verify video titles and channels against YouTube's public metadata service. The optional player is loaded only after a student selects it, uses YouTube's privacy-enhanced embed domain, and always has an external watch link. Video viewing and self-checks do not award XP or affect lesson quiz scores.

The negative-testing question now correctly refers to invalid or unexpected inputs. Its answer key is unchanged. The frontend displays the corrected wording for existing installations; `npm run migrate` also persists this narrowly matched correction in the database without changing student progress or quiz attempts.

The original testing mascot and achievement illustrations are vector components in `frontend/src/StudentExperience.jsx`. Freehand icons are by Streamline under CC BY 4.0; attribution is included in `frontend/public/streamline/ATTRIBUTION.md`.
