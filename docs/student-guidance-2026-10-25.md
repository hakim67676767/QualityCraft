# Student guidance handoff - 25 October 2026

Students who were unsure what to do after signup now receive an inline, account-aware getting-started guide. It keeps the approved navy/cyan software theme and existing system structure.

The guide presents one next action above a three-step checklist: join the teacher's class, complete the pre-test, then start learning. The action changes from **Find my class** to **Go to pre-test** to **Open Learning Path** as real account records change. Completed steps show **Done**; the current step says **Your next step**. Completing the pre-test opens Learning Path automatically. Locked navigation exposes the prerequisite through its disabled state and explanatory title.

New students see the guide expanded. **Hide guide** collapses its details while keeping the next action accessible; **Show guide** expands them. **Getting started** in the header reopens and focuses the guide. Returning students with saved lesson completion, attempts or module progress see their normal dashboard unless they reopen it. The primary action moves focus to class search, the pre-test heading or the destination heading. Guide visibility is in-memory UI state; completion comes from existing records, with no local-storage flags or backend changes.

Expandable help explains lesson reading, practical work, quizzes, progress, badges, profile, post-test prerequisites, saved survey responses and finding a class. Loading failures provide an alert and retry action. The checklist stacks below 1180px; phone layouts wrap the guide/header controls and retain the action before the checklist. Existing focus and reduced-motion styles apply.

Implementation: `frontend/src/StudentGuide.jsx`, `frontend/src/student-guide.css`, and integration in `frontend/src/App.jsx`. Direction: `design-plans/student-guidance-direction.md`. The shared design identity is unchanged, so `DESIGN.md` and its sidecar require no update for this extension.

Verification supplied by the implementation pass: registration -> class join -> pre-test -> Learning Path fixture flow passed; 16 viewport checks passed with no page exceptions; build, lint and five existing tests passed; detector output was empty (`[]`). The independent finish reviewer returned ship with no material fixes. Teacher and administrator smoke checks confirmed no guide was shown and no navigation was newly disabled. No deployment was performed.
