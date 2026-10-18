# Progress redesign

Implemented and verified on 18 October 2026 for desktop and tablet sizes. Phone layouts were excluded as requested.

## Student experience

- Course completion counts fully completed modules against all published modules, consistent with the Learning Path and Profile course totals. Unstarted modules are included; an empty course shows 0% safely. The previous view averaged only existing progress records.
- Named module rows replace the unlabelled chart. Each row shows its recorded progress, lesson count, highest quiz score when available, and a completed/in-progress/ready/locked label. A native dropdown filters completed, in-progress, and unstarted modules.
- The progress explanation describes the existing backend rules: reading contributes 20%, required practical work 30%, and the best quiz score up to 50% per lesson. Module progress averages its lessons. These weights were not changed. The Learning Path's partial checkpoint percentage remains a separate measure; completed-module totals agree between pages.
- Quiz history shows the latest five attempts, including retakes, with a control to expand the full history. Submission dates and scores remain visible.
- The main action opens the Learning Path, then the post-test when all modules are complete, or Survey Results after the post-test. The primary action remains visible within the first screen at the tested widths.

The design reuses studio colours and local SVG icons, native progress bars and form controls, explicit dark heading colours, and textual status labels. No new dependency or backend change was required.

## Navigation refresh correction

Browser testing found that reading a lesson, opening Progress, and returning to the Learning Path could show the lesson as unread until a reload. `Dashboard.handleReward` refreshed progress, the journey, and activities but retained old module/lesson completion data. It now refreshes module and activity data together after a learning update. The browser scenario verifies this navigation repeatedly through reading, practical work, and quizzes.

## Verification

Production build and frontend lint passed. A Chrome scenario on a fresh temporary installation verified:

- All five modules before any learning progress, with status counts and an empty quiz-history state.
- Actual recorded module progress of 20% after reading, 50% after practical submission, 90% after an 80% quiz, and 100% after a successful retake.
- Course completion of 0%, 20% for one of five completed modules, and 100% for all five.
- All status filters and an empty filter result; completed/ready/locked state changes.
- Six real quiz attempts, newest-first ordering, and expansion beyond the latest five.
- Post-test and Survey Results actions, plus persistence after reload.
- A simulated empty published catalogue, without including earlier course progress in the current course total.
- Starting, partial, advancing, and completed states at 1440, 1024, and 768 pixels in light and dark system preferences. No page overflow, broken icons, or uncaught JavaScript errors were observed.

The empty-catalogue check used browser response overrides only. All created accounts and learning records were confined to the harness database, which was removed afterwards. No real learner records were changed. This pass does not establish Firefox, Safari, screen-reader, classroom-load, or intended-user usability results.

## Repeat

Build the frontend and start a fresh temporary installation using [browser verification](playwright-browser-verification.md), then run:

```powershell
playwright-cli -s=qualitycraft-qa open http://127.0.0.1:4179 --browser=chrome
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-progress-qa.js
playwright-cli -s=qualitycraft-qa close
```

Stop the harness afterwards to remove its temporary database. The scenario is standalone and creates its own temporary teacher, student, class, and learning records.

## Evidence

- [Starting course](../design-review/playwright/44-progress-starting-1440.png)
- [Partial module](../design-review/playwright/44-progress-partial-1440.png)
- [One module completed](../design-review/playwright/44-progress-advancing-1440.png)
- [Completed course](../design-review/playwright/44-progress-complete-1440.png)
- [Completed course on tablet](../design-review/playwright/44-progress-complete-1024.png)
- [Starting course on tablet](../design-review/playwright/44-progress-starting-768.png)

Additional state/width combinations are saved in the same directory. Screenshots contain temporary test accounts.
