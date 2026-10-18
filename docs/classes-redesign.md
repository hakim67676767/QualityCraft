# Classes redesign

Implemented and verified on 17 October 2026 for desktop and tablet sizes.

The Classes page now follows the Learning Path's purple and neutral design language. Students see joined classes separately from classes available to join. Cards show the teacher, enrolment count, membership status, and an appropriate join or Learning Path action. Search filters by class or teacher name.

Teachers have a labelled class-creation panel, their own class directory, and shortcuts to assignments and monitoring. Administrators see all classes and can create a class. Summary enrolments count memberships across classes, so a student in two classes contributes two enrolments.

Loading, empty, success, and action-specific error states are included. A failed class load offers a retry; failed creation and joining keep errors beside the relevant action. Native form controls, explicit labels, status announcements, and keyboard focus for the empty-state creation link are retained. No backend changes or new dependencies were required. Phone layouts were excluded as requested.

## Verification

Frontend lint and production build passed. The Chrome scenario verified:

- Administrator and teacher creation, whitespace validation, and teacher ownership filtering.
- Class/teacher search, no matches, and clearing search.
- Recovery from simulated load, creation, and join failures.
- First membership opening the existing pre-test survey, an additional membership, and persistence after reload.
- Separate joined/available sections and Learning Path, assignments, and monitoring navigation.
- All three roles at 1440, 1024, and 768 pixels, without horizontal page overflow, broken icons, or uncaught JavaScript errors.

Run the scenario on a fresh temporary database using the harness in [browser verification](playwright-browser-verification.md), after building the frontend:

```powershell
playwright-cli -s=qualitycraft-qa open http://127.0.0.1:4179 --browser=chrome
playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-classes-qa.js
playwright-cli -s=qualitycraft-qa close
```

Stop the harness afterwards to remove its temporary database. The scenario creates test accounts and class records only in that installation. This pass covers Chrome; it does not establish other-browser, screen-reader, or classroom-load compatibility.

## Evidence

- [Student desktop](../design-review/playwright/37-classes-student-1440.png)
- [Student tablet](../design-review/playwright/37-classes-student-768.png)
- [Teacher desktop](../design-review/playwright/37-classes-teacher-1440.png)
- [Teacher tablet](../design-review/playwright/37-classes-teacher-768.png)
- [Administrator desktop](../design-review/playwright/37-classes-admin-1440.png)

Screenshots contain temporary test accounts. Additional 1024-pixel and administrator tablet screenshots are saved in the same directory.
