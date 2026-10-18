# Lesson quiz feedback

The answer review uses numbered cards with explicit Correct and Needs review labels. Correct answers use teal; submitted answers needing review use amber. Incorrect responses show the student's answer beside the correct answer, with comparisons stacked at narrower tablet widths. The summary counts both outcomes.

Teacher-authored explanations remain visible. The exact legacy seeded explanation that instructed every student to retry is omitted. Students with incorrect responses get a lesson review link and retake guidance; perfect attempts do not. True/false values use consistent casing. Grading, XP, saved attempts, and database records are unchanged.

Validation: frontend lint, three unit tests, and production build passed. `frontend/scripts/playwright-feedback-qa.js` exercised a real five-question submission and perfect retake against an isolated temporary MySQL installation. It verified outcome counts, correct-answer comparisons, authored explanations, legacy-message removal, long response wrapping, keyboard lesson navigation, and no stale feedback after retaking. Text contrast met WCAG AA and there was no horizontal overflow at 1440, 1024, and 768 pixels under light and dark colour preferences. No production student records were used.

To repeat the browser check, build the frontend, start `backend/scripts/browser-qa-server.js`, and run the QA script through Playwright CLI against a fresh temporary installation. Stop the helper afterward to remove its temporary database. Screenshots are local QA artifacts under `design-review/playwright/46-feedback-*` and are excluded from Git.
