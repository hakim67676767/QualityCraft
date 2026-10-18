# Manage Content redesign

Implemented and verified on 18 October 2026 for desktop and tablet. Phone layouts were excluded as requested.

## Administrator workflow

The page now has a collapsible four-part quick-start guide, persistent module/lesson selectors, and focused sections for module details, lessons, quiz questions, practical activities, and preview/publishing. Selecting existing content loads its saved details into the edit form. Separate New module/New lesson actions start new content and clear dependent selections and edit targets. Creating content selects the new record automatically.

Question and activity sections show saved records beside a single add/edit form. Their controls explain answer choices, correct answers, required activities, ordering, saved drafts, and publishing. True/false questions use a correct-answer dropdown. Pre/post surveys are explicitly identified as belonging to Research & Evidence.

Preview displays saved lesson text, question lists, activities, and publish-readiness warnings. New or hidden modules require a successful current preview before publishing through this page. Saving changes invalidates an earlier preview. Already-published modules have explicit guidance that saved edits are already available.

The redesign uses the existing studio palette and local icons. Native form controls, native expandable sections, and native modal alert dialogs provide the interactions. Delete confirmation initially focuses Cancel, supports Escape, and restores focus on cancellation. Existing backend validation and deletion dependency rules remain in effect; questions/activities must be removed before their unused lesson, and lessons before their unused module. The interface does not claim cascading deletion.

Request effects disregard responses for a previously selected module/lesson. Background lesson loading no longer clears save confirmations or preview results. Errors remain beside the relevant form; initial loading failures have a retry action. No dependency or backend change was required.

See the [simple administrator usage guide](manage-content-guide.md). The same essential instructions are included directly on the page.

## Verification

Frontend lint and production build passed. Chrome checks on a fresh temporary installation verified:

- Initial module selection populating the edit form; separate creation forms; automatic selection after creation.
- Module and lesson creation, updates, and unused-record deletion.
- Multiple-choice, true/false, and short-answer question creation; edits, cancellation, validation errors, and deletion.
- Test-case, bug-report, and reflection activity creation; edits, required/optional state, cancellation, and deletion.
- Module/lesson switching clearing previous edit targets without saving unsaved text to another record.
- Initial load and creation failures followed by successful retry with entered data preserved.
- Native delete-dialog initial focus, Escape, focus restoration, cancellation, and confirmation.
- A dependency-blocked lesson deletion retaining its record, followed by successful deletion after explicitly removing its unused question.
- Preview warnings for missing content, saved lesson text in preview, and preview invalidation after edits.
- Publishing, hiding, republishing, and corresponding availability of activities in the assignment catalogue.
- Saved question/activity persistence after reload.
- All editor sections at 1440, 1024, and 768 pixels in light and dark system preferences, without page overflow, broken icons, or uncaught JavaScript errors.

Expected HTTP failures were exercised deliberately: 503 for simulated load/save failures, 400 for an invalid answer key, and 409 for dependent content. Temporary test content was isolated in the QA database. No real course or student records were changed.

## Repeat

Build the frontend and start a fresh temporary installation using [browser verification](playwright-browser-verification.md), then run:

```powershell
playwright-cli -s=qualitycraft-qa open http://127.0.0.1:4179 --browser=chrome
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-content-qa.js
playwright-cli -s=qualitycraft-qa close
```

Stop the harness afterwards to remove its temporary database. The scenario is standalone. Its delete operations target only content it creates in that installation.

This pass covers Chrome. It does not establish Firefox, Safari, screen-reader, classroom-load, or intended-user usability results.

## Evidence

- [Module editor](../design-review/playwright/45-content-module-1440.png)
- [Lesson editor](../design-review/playwright/45-content-lesson-1440.png)
- [Question editor](../design-review/playwright/45-content-questions-1440.png)
- [Activity editor](../design-review/playwright/45-content-activities-1440.png)
- [Preview with saved content](../design-review/playwright/45-content-preview-1440.png)
- [Readiness warnings](../design-review/playwright/45-content-readiness-warnings-1440.png)
- [Question editor on tablet](../design-review/playwright/45-content-questions-768.png)

Additional tablet screenshots are saved in the same directory. Evidence contains temporary administrator/content records.
