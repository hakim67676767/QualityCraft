# Survey Results, Post-test, and Profile redesign

Implemented and browser-verified on 17 October 2026 for desktop and tablet sizes. Phone layouts were excluded as requested.

## Changes

Survey Results now leads with the original before/after responses, their submission dates, and the change in average agreement. The rating scale remains 1–5 and is explicitly described as self-reported understanding. A native expandable comparison shows each saved statement. Overall changes require matching concept keys and wording; missing or incompatible responses display a dash and an explanation. Earlier knowledge-check records keep their percentage-based presentation. Retake controls and history appear below the original comparison, and continue to preserve originals and earn no additional XP.

Post-test has distinct locked, answering, completed, and unavailable states. The locked state shows module progress and links to the Learning Path. The answering form keeps native radio groups and required responses, adds answered counts and a scale guide, and retains answers after submission failures. The completed view links to results and includes the existing suitability feedback. Original submissions cannot be submitted again through this view; the separate retake flow remains available.

Profile combines account identity, XP and level progress, module/badge/class counts, a milestone record, account details, the latest earned badge, and joined classes. Its actions open the existing Learning Path, results, badges, and class pages. Profile account details remain read-only.

The new views reuse the existing purple/neutral palette, local SVG icons, badge artwork, and native controls. No dependency, backend, or normal-database change was required.

## Heading visibility correction

The user's Classes screenshot exposed a near-white heading on a light background. The starter `index.css` changes `--text-h` under a dark system preference, while the product theme stays light. `interface-polish.css` now binds the starter text tokens to the studio's dark text colours. The Classes introduction also has an explicit heading colour, as do the new reflection/profile views.

Browser checks verified computed heading colour `rgb(51, 43, 71)` under both light and dark system preferences. This is a fix for the existing light product theme, not the addition of a separate dark theme.

## Verification

Frontend lint and production build passed. On a fresh temporary installation, the existing understanding-survey browser scenario passed the pre-test, all five learning modules, post-test, reload protection, student comparison, teacher reporting, and administrator paired analysis/export. The new reflection scenario then verified:

- First-time and completed profile counts, milestone states, class details, and badge navigation.
- Locked, answering, and completed Post-test views; required responses and native keyboard rating selection.
- Failed post-test submission retaining all ten choices, followed by successful retry.
- Suitability feedback submission.
- Original statement comparison; missing post responses; incompatible statement wording; earlier percentage-based records.
- Retake cancellation, pre/post retake submission, history and reload persistence, unchanged original responses, and no additional XP.
- Classes and all three new views at 1440, 1024, and 768 pixels under light and dark system preferences, without page overflow, broken icons, or uncaught JavaScript errors.

The mismatch and earlier-record display checks used temporary browser response overrides; they did not change stored responses. Test accounts and course records were confined to the harness database.

## Repeat

Build the frontend, start the fresh temporary installation described in [browser verification](playwright-browser-verification.md), then run from the project root:

```powershell
playwright-cli -s=qualitycraft-qa open http://127.0.0.1:4179 --browser=chrome
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-understanding-survey-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-reflection-qa.js
playwright-cli -s=qualitycraft-qa close
```

Stop the harness afterwards to remove its temporary database. These scenarios depend on the test records created in order. This pass covers Chrome and does not establish other-browser, screen-reader, intended-user readability, or classroom-load compatibility.

## Evidence

- [Original survey comparison](../design-review/playwright/38-survey-results-complete-1440.png)
- [Statement comparison](../design-review/playwright/38-survey-statement-comparison.png)
- [Retake history](../design-review/playwright/38-survey-results-retakes-1440.png)
- [Post-test answering](../design-review/playwright/39-post-test-answering-1440.png)
- [Post-test locked](../design-review/playwright/41-post-test-locked-1440.png)
- [Post-test completed and suitability feedback](../design-review/playwright/43-post-test-complete-1440.png)
- [Profile](../design-review/playwright/40-profile-complete-1440.png)
- [Profile on tablet](../design-review/playwright/40-profile-starting-768.png)
- [Corrected Classes heading](../design-review/playwright/42-classes-heading-1440.png)

Additional tablet and incomplete-state screenshots are in the same directory. All evidence contains temporary test learners.
