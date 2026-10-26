# Three-module curriculum

The active student course is ordered by increasing difficulty:

| Level | Module | Focus |
| --- | --- | --- |
| Easy | Foundations of Quality | Basic quality concepts and shared responsibility |
| Moderate | Test Case Design | Applying structure, expected results, and input coverage |
| Hard | Testing Strategies | Choosing and combining testing approaches for scenarios |

Each seeded lesson has six MCQs with four distinct options and one correct answer. Three correct answers (50%) pass. As clarified on 26 October 2026, quizzes are available immediately in unlocked modules. Only the quiz score determines completion and next-module access; reading is optional. Each lesson quiz must be passed to complete its module. The highest quiz score is retained for completion, including after a lower retake.

Practical activities remain available as optional, initially collapsed practice. They contribute no required progress and never gate quizzes or the next module. Admin question creation/editing accepts only MCQ, with at least two distinct choices and a matching answer key. Activity creation/editing always keeps submissions optional. Pre/post understanding surveys retain their separate rating format.

## Implementation and existing installations

`curriculum-policy.json` supplies the shared order, difficulty, and pass score to frontend and backend. Progress uses quiz scores only, reaching full credit at the 50% pass score. Reading and practical work contribute no required progress. Partial progress cannot round up to complete below the threshold. Dashboard, journey, and current-course reporting count published modules only.

`backend/migrations/threeModuleCurriculum.js` is included in `npm run migrate`. It can also be invoked using `node scripts/update-curriculum.js` from `backend`. A revision ledger makes the curriculum conversion run once. New installations use the updated seed content.

Before converting existing content, the migration saves modules, lessons, questions, activities, and progress in an ignored `design-review/curriculum/*.database-backup.json` file. It hides other modules, retains matching question IDs, converts legacy quiz types, makes activities optional, and recalculates current-course progress. Quiz attempts, answer snapshots, activity submissions, lesson completion records, badges, and XP are preserved; the migration grants no duplicate rewards. Hidden modules remain available to administrators for historical content management.

The local database was updated on 25 October 2026. Before/after counts remained identical for quiz attempts (15), answer snapshots (71), practical submissions (6), badges (13), and lesson completions (9). A second migration run was a no-op for curriculum data. No deployment was performed.

## Verification

- Frontend production build, lint, and unit tests.
- Backend API/reporting/unit tests and SQL seed validation.
- Disposable MySQL integration (`backend/scripts/check-curriculum.js`, with `CURRICULUM_TEST_URL=http://127.0.0.1:4179` and the browser QA server): all three modules pass at exactly 50% with no reading completions or practical submissions; below-pass scores do not unlock the next module; lower retakes preserve an earlier pass; post-test unlocks after three completions; reports show three completed modules and a 50% quiz average; non-MCQ questions and invalid choices are rejected; new activities remain optional.
- Real browser flow at widths 1440, 768, 390, and 320: three ordered difficulty levels, no horizontal overflow, six four-option MCQs immediately available, optional practice collapsed, quiz passed at 50% without marking reading, and results/progress matching the dark theme.

Local screenshots are stored in ignored `design-review/curriculum-*.png` files.

## Quiz-only completion follow-up (26 October 2026)

`backend/migrations/quizOnlyCompletion.js` records a separate revision, backs up current progress, and recalculates it from the highest lesson quiz scores. It does not rewrite the module catalogue or alter quiz attempts, reading records, practical submissions, XP, or badges. The regular migration command and `update-curriculum.js` both include this follow-up. Reading remains available as an optional tracking action; a score below 50% cannot unlock the next module even when reading or practical work is complete.

The follow-up was applied locally and checked twice for idempotence. Existing attempts (18), answer snapshots (89), practical submissions (6), badges (14), and reading records (10) were unchanged by this follow-up; question content and XP were also unchanged. The API integration completed all three modules at exactly 50% with zero reading completions and zero practical submissions. Browser verification confirmed the next module unlocks immediately after the 50% result and that quizzes are available before marking reading.
