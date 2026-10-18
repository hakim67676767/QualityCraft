# Badge redesign — 16 October 2026

The student badge page now presents an achievement cabinet with original SVG medals, a latest-achievement feature, an earned total, descriptions, earned dates, and sorting by name or award date. Each of the eight existing milestone types has its own symbol. Custom or legacy achievements have a fallback medal.

The same artwork appears on the student dashboard and in administrator badge management. Administrators can preview the badge name, description, and milestone symbol while filling out the existing creation form. Earning rules and award records are unchanged. The dashboard response now includes the existing badge description and criterion metadata for consistent presentation.

The implementation uses native HTML controls and local SVG artwork, with no additional packages or remote image requests. Desktop and tablet layouts are the supported review scope.

## Verification

Frontend lint and production build, plus backend tests, pass. On a fresh temporary installation, the administrator, staff, and full student journey browser scenarios passed. The focused badge scenario checks all eight earned symbols, persisted descriptions and dates, name/date sorting, return to learning, dashboard medals, the empty collection action, and the administrator live preview. Layout checks cover 1440, 1024, and 768 pixels for students and desktop/tablet widths for administrators.

The empty collection uses an explicit browser response fixture; the earned collection uses the real Express/MySQL records created by the student journey. Test records are removed when the temporary harness stops.

Screenshots:

- [Badge collection](../design-review/playwright/20-badge-collection-1440.png)
- [Tablet collection](../design-review/playwright/20-badge-collection-768.png)
- [Dashboard shelf](../design-review/playwright/21-dashboard-badges.png)
- [Empty collection](../design-review/playwright/22-empty-badges.png)
- [Administrator preview](../design-review/playwright/23-admin-badge-preview.png)

To repeat, use the temporary server described in [browser verification](playwright-browser-verification.md), run the admin, staff, and student stages, then run `playwright-cli -s=qualitycraft-qa --raw run-code --filename=frontend/scripts/playwright-badges-qa.js`.
