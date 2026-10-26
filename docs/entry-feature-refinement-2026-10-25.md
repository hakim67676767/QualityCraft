# Entry feature refinement - 25 October 2026

The role selection and sign-in feature areas now use a shared EntryFeatures list from StudentVisuals.jsx. The user requested alignment with the existing pages, then explicitly requested removal of the white background. The final version places white SVG symbols, compact feature names and supporting text directly over the original landscape, separated by fine rules. The audience footer is also transparent. Existing sign-in form and navigation remain intact.

The existing landscape, scoped Geist typography and existing icon system are reused. No new raster or design tokens were introduced. Desktop features use three columns; intermediate widths use stacked rows. Sign-in retains its incumbent phone behavior, hiding the supporting feature list so the form remains prominent.

Build and lint passed. Browser checks covered both screens at 1440, 1024, 768, 390 and 320 pixels with no document overflow. Role selection still opens the sign-in form. The mechanical detector returned no findings before the later user-directed material changes. Expected unauthenticated /api/me 401 responses are unrelated to this visual change. No deployment occurred. Final captures: design-review/entry-features-{roles,signin}-{width}.png.

Final review: the reviewer verified the transparent treatment. A mobile cloud contrast issue was resolved by strengthening the role-page image scrim; the reviewer returned ship for that correction. All ten layouts were recaptured after the fix.
