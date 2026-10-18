# Highest quiz scores

Each lesson quiz keeps its highest achieved score as the student's grade. The Learning Path, lesson list, completion checklist, and student dashboard use this value. Student dashboard and teacher/admin report averages use the best score for each attempted quiz, so additional lower retakes cannot reduce those averages.

Every submission remains saved with its actual score and answers. The submitted-quiz screen distinguishes Best score from Latest attempt; answer feedback always describes the submitted attempt. Progress history retains each attempt's real score. The latest attempt ID, independently of its score, is used to start the next retake and preserve duplicate-submission protection. Pre/post understanding survey ratings are unchanged.

Existing attempts already preserve earlier results, so this change needs no data migration or reset. Backend completion already uses `MAX(score)` per lesson; the submission response now also includes that best score.

Validation: frontend lint, five frontend unit tests, production build, backend tests, and the isolated MySQL regression suite passed. Database checks verified that a 60% retake after 100% preserves completion, reports a best score of 100%, keeps both actual attempts, rejects duplicate retake requests, and leaves teacher report averages at 100%. Playwright exercised 60% → 100% → 60% → 100%, including a full reload, lesson checklist, dashboard average, attempt history, and another successful retake after the lower result. Browser checks reported no JavaScript errors. Only temporary test databases were used.
