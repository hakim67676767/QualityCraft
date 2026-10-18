# Classes design review — 17 October 2026

The Classes design is suitable overall for the current desktop and tablet application. The existing screenshots show clear class names, distinct joined/available sections, recognisable actions, and a consistent visual relationship to the Learning Path. This is a source and saved-screenshot review, not a new functional test or a study with students.

## Design language

- Audited surface: student, teacher, and administrator Classes views in the QualityCraft dashboard.
- Design sources: current `docs/classes-redesign.md`; `frontend/src/App.jsx` imports and Classes compositions; `frontend/src/ClassesView.jsx`; `frontend/src/classes.css`; resolved studio tokens in `frontend/src/interface-polish.css`. The screenshot evidence is from the verified current implementation. The Learning Path screenshot is a visual comparator for the documented shared design language, not a source of mandatory Classes behaviour.
- Documented decisions: purple/neutral palette and local SVG icons; separate student membership sections; teacher-owned versus administrator-wide class directories; desktop/tablet scope. Phone layouts are excluded.
- Governing owners and consumers: `App.jsx` imports the shared theme layers and renders `ClassesView` in both the first-join and normal Classes branches. `ClassesView` imports `classes.css`, which scopes the new presentation to `.classes-workspace` at widths of at least 768 pixels and consumes shared studio colours. Its role branches govern the content of all three Classes views.
- Explicit exceptions: None documented.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | The empty joined section directs students to a class that may not exist below it. This is a minor copy contradiction. | Contract: on the same page, “Look below for the class your teacher shared with you” conflicts with “No other classes available” when both class groups are empty. Runtime: `App.jsx:271` renders this view for students needing a class. `ClassesView.jsx:69–74` constructs both sections even when the API returns an empty list; line 101 uses the “Look below” copy for every empty joined section without checking available classes. `GET /api/classes` in `backend/server.js:427` can return an empty array. This finding is established from the source branch; the saved screenshots contain classes and do not show this state. | In the empty joined-section message, use “Ask your teacher to create a class so you can join.” when `available.length === 0`; retain the existing “Look below” message when classes are available. | One student-facing empty-state message in `ClassesView.jsx`; no API or membership change. | High |

## Improve first

Correct finding 1. It gives a first-time learner an accurate next step when no classroom has been created. No replacement of the current visual design is justified by this review.

## Assessment and tradeoffs

- The student desktop screenshot clearly separates membership from discovery. Its card titles and purple join buttons are easy to distinguish from supporting teacher/enrolment details.
- Teacher and administrator content matches their different scopes. The existing source preserves the teacher-owned class directory, while administrators see all classes.
- In the 768-pixel teacher and 1024-pixel administrator screenshots, the creation panel follows the directory. This keeps the class list first but requires scrolling to create a class once there are existing classes. It is a visible tradeoff, not a proven design-contract violation. No layout correction is prescribed without a decision that creation should take priority over the directory at these widths.
- Some metadata and helper text is 10–12 pixels. The screenshots establish that hierarchy, but this review did not test readability with intended learners, zoom preferences, or screen readers. It does not claim accessibility certification.
- Previously recorded browser verification covered functionality and overflow; it does not establish that intended learners find the interface easy to use. A short task-based session with a student and teacher would provide stronger suitability evidence.

## Rendered evidence inspected

- [Student desktop](../design-review/playwright/37-classes-student-1440.png)
- [Teacher tablet](../design-review/playwright/37-classes-teacher-768.png)
- [Administrator tablet](../design-review/playwright/37-classes-admin-1024.png)
- [Learning Path comparator](../design-review/playwright/31-learning-roadmap-1440.png)

No product source was changed during this review. The finding is not an implementation plan.
