# Software theme handoff - 25 October 2026

The user-approved dark software screenshot supersedes the earlier landscape/green identity across public entry, student, teacher and administrator pages. Structure, curriculum, workflows, role permissions and saved records remain the functional authority. No deployment was performed.

`frontend/src/technology-theme.css`, loaded last, owns final navy/cyan surfaces, role accents, technical welcomes and inherited component overrides. Shared layout remains in `student-redesign.css` and `staff-redesign.css`; `profile-page.css` owns profile composition. `App.jsx` supplies entry and `StudentVisuals.jsx` supplies inline chip SVG and the noninteractive testing preview. The original landscape and provenance remain stored, with no new raster generation.

`DESIGN.md` records the implemented shared world; `.impeccable/design.json` supplies extension metadata and portable component previews. Earlier student-only scope and landscape-only guidance are superseded. Compatibility names such as `--qc-green` now resolve to cyan.

Build, lint and the five existing tests passed before this documentation handoff. Final verification passed 32 student and 60 staff responsive layout cases with no page overflow. Four entry widths, password visibility, keyboard focus, lesson/quiz retake controls and opening/cancelling the delete dialog were also checked using isolated demo fixtures. Staff routes raised no page exceptions. The independent reviewer identified two destructive-action contrast issues; both were corrected, recaptured and received a ship verdict for those fixes. The single mechanical detector returned no findings. Real database login was not part of these fixture checks. See `design-plans/software-theme-direction.md` for direction and the implementation review artifacts for final validation evidence.

Future changes should preserve readable dark fields, clear locked/completed states, visible keyboard focus, reduced-motion support and phone task order. Keep illustrative code distinct from live status. Hidden legacy decoration and superseded CSS declarations are not design rules.

Colour refinement: primary text now uses blue-gray #bfd5e8. Remaining white staff review/editor backgrounds and profile avatar borders now inherit the slate surface token.
