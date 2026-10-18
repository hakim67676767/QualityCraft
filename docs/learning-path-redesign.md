# Learning Path redesign

Implemented and verified on 17 October 2026 for desktop and tablet widths. Phone layouts were excluded as requested.

## Student experience

- A course summary shows overall module completion and the next action.
- A numbered roadmap distinguishes the current, completed, available, and locked modules. Each card includes its purpose, lesson/activity counts, estimated reading time, and progress.
- A module checklist shows lessons read, required practical activities submitted, and quizzes passed. These checkpoints contribute equally to the module percentage; overall course progress counts completed modules.
- Lesson navigation links to reading, practical activities, and the quiz. Existing reading, required-work, and 100% quiz gates remain in place.
- Class assignments appear together below the roadmap and open the corresponding lesson. Quiz retakes remain available.
- Completing the course leads to the post-test survey, or to survey results when it has already been submitted.

The changes use the existing purple palette and local SVG icons. No new dependency or backend change was needed.

## Verification

Frontend lint and production build passed. Chrome checks at 1440, 1024, and 768 pixels verified a visible next action and no horizontal page overflow. Browser workflows verified all five modules, required-work gates, assignments, quiz retakes, and pre/post surveys without uncaught JavaScript errors.

A separate progress scenario confirmed 0% → 33% after reading → 67% after the required activity. An 80% quiz kept the next module locked; a 100% retake completed the module and advanced the roadmap. Keyboard checks covered the lesson section links.

Use a fresh temporary installation described in [browser verification](playwright-browser-verification.md). After building the frontend and opening its QA URL, run these two scenarios in order:

```powershell
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-learning-path-qa.js
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-learning-progress-qa.js
```

The scenarios create temporary accounts and course records in the harness database. They do not target the normal project database. Close the named browser and stop the harness afterwards.

## Screenshots

- [Desktop roadmap](../design-review/playwright/31-learning-roadmap-1440.png)
- [Tablet roadmap](../design-review/playwright/31-learning-roadmap-768.png)
- [Module overview](../design-review/playwright/32-module-overview.png)
- [Lesson workspace](../design-review/playwright/33-lesson-workspace.png)
- [Completed course](../design-review/playwright/34-completed-learning-path.png)
- [Partial module progress](../design-review/playwright/35-module-progress.png)
- [Next module unlocked](../design-review/playwright/36-advancing-learning-path.png)

Evidence contains temporary test learners. This pass does not establish Firefox, Safari, screen-reader, or classroom-load compatibility.
