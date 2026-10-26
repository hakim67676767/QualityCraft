---
name: QualityCraft
description: A software learning workspace with dark layered documents and clear cyan actions.
colors:
  pine: "#2ed4f1"
  pine-hover: "#7ce8f9"
  ink: "#bfd5e8"
  muted: "#a1b0c8"
  ground: "#080e18"
  surface: "#101a2b"
  line: "#27374d"
  tint: "#132a39"
  entry-surface: "#101a2b"
  sidebar: "#0d1625"
  field-border: "#354961"
  focus: "#65def5"
  error: "#ffa5aa"
  action-ink: "#05202e"
  teacher: "#44dbb1"
  administrator: "#b6a0ff"
  field: "#0b1423"
  nav-active: "#113347"
  nav-active-text: "#75e6f8"
typography:
  display:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "clamp(38px,4.5vw,52px)"
    fontWeight: 700
    lineHeight: 1.07
    letterSpacing: "-.035em"
  headline:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "23px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-.025em"
  body:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  reading:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "15px"
    lineHeight: 1.9
  label:
    fontFamily: "QC Geist, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  tag: "4px"
  control: "6px"
  module: "8px"
  panel: "10px"
  entry: "12px"
spacing:
  field-gap: "8px"
  control-gap: "12px"
  inset: "20px"
  section: "24px"
  column: "25px"
  desktop-gutter: "38px"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.pine-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.pine}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  nav-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.nav-active-text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: QualityCraft

## Overview

**Creative North Star: "The software learning workspace"**

QualityCraft uses near-black navy ground, layered blue documents and clear cyan actions to express the software craft it teaches. Technical identity comes from a microchip mark, inline SVG symbols and actual code examples. The user-approved software reference of 25 October 2026 supersedes the earlier landscape-and-green identity across entry, student, teacher and administrator screens.

The system preserves familiar navigation, content hierarchy and workflows. Dense lessons, editors and research surfaces remain readable documents; software details support the task rather than creating extra controls. Palette tokens remain scoped to entry, workspace and loading containers rather than the global root.

**Key Characteristics:**
- Dark navy layers, crisp blue borders and cool readable text.
- Cyan actions with restrained green and violet role accents.
- Self-hosted Geist for the interface; monospace for code.
- Existing responsive task hierarchy, visible focus and explicit learning states.

## Colors

Cyan is the shared action color; teacher green and administrator violet distinguish role symbols rather than recoloring entire workspaces.

### Primary
- **Cyan** (`pine`, a retained compatibility name) marks primary actions, progress and available learning actions. The lighter hover sibling provides feedback without lift.
- **Focus cyan** distinguishes keyboard position; **Action ink** provides dark labels on filled cyan controls.

### Secondary
- **Teacher green** identifies teacher role icons and role code.
- **Administrator violet** identifies administrator role icons and role code.

### Neutral
- **Ink** carries headings and main text; **Muted** carries supporting information.
- **Ground** forms the canvas; **Surface** groups reading and controls; **Sidebar** distinguishes navigation.
- **Line** and **Field border** distinguish structure and editable controls. **Tint** supports secondary states.
- **Field** creates a darker editable inset; **Nav active** and its light text sibling identify selection.
- **Error** provides readable validation feedback on a dark red inset.

**The Shared World Rule.** Use the same dark software palette across public entry and all three roles; preserve role-specific information and permissions.

## Typography

**Display Font:** QC Geist, with Segoe UI and sans-serif fallbacks.
**Body Font:** The same locally served variable family from `frontend/public/fonts/Geist-Variable.ttf`, with swap loading and weights (100?900).

Frontmatter records representative roles, not a universal modular scale. Entry title is bold and cyan; overview welcome headings retain a lighter weight (450) and a responsive size ending at (43px). Section introductions use the headline role; workspace headings use the title role. Panel and row titles commonly use (17?19px), weight (500). Phone section introductions reduce to (25px).

General copy uses the body role. Lesson paragraphs use the reading role with a measure of (72ch); the outer reader also caps general paragraphs at (75ch). Form labels and actions use the label role. Supporting metadata uses (11?12px), never as a replacement for reading copy. Code previews use Consolas/monospace at (12px), line-height (2); role code uses (11px).

**The Code Type Rule.** Reserve monospace for code examples and role code; keep ordinary interface copy in Geist.

## Layout

Desktop workspaces pair a sticky full-height rail (218px) with flexible content. Header and content share a centered maximum width (1450px) and desktop gutters (38px). Dashboard columns use `minmax(0,1.8fr) minmax(260px,1fr)` with a (25px) gap. Containers use `min-width:0` to wrap safely. Staff editing, review and research surfaces retain their established task-specific layouts.

At (1180px) the rail narrows to (195px), gutters become (25px), and major content/aside layouts become one column. Overview heroes also collapse to one column and hide their supplementary code preview. At (760px) the rail becomes a top navigation strip with horizontal overflow, content gutters become (20px), sign-in stacks and stats become a two-column strip. Staff assignment forms and review selectors become one column. At (380px), content gutters become (15px) and achievement cards become one column.

Public role selection is centered: a mark and title, three compact feature labels and a stacked role list capped at (540px). Role choices have minimum height (85px). Sign-in retains its welcome/form composition with a maximum width (1360px) and a (420px) form column; phones stack it. Workspace primary controls generally have minimum height (44px); sign-in fields and submit use (49px) and (48px).

## Elevation & Depth

Panels use tonal layering and fine borders rather than shadows. Sign-in alone retains a diffuse shadow (`0 16px 50px #00000030`). Overview backgrounds use a restrained dark blue gradient; it is a technical surface treatment, with no visible landscape imagery.

**The Quiet Reading Rule.** Lessons, work and quiz containers remain bordered documents; code details and welcome decoration stay outside the reading body.

## Shapes

Tags and markers use small corners (4px); controls and navigation use (6px). Module cards use (8px), general panels and code previews (10px), entry panels and role choices (12px). Thin borders carry structure. Avatars may be circles; badge medals retain their illustration silhouette. The entry microchip sits in a compact square enclosure with softened corners.

## Components

### Buttons

Cyan primary actions use dark labels, compact padding (10px 16px), control corners and no shadow. Hover lightens the fill without lift. Secondary controls use navy surfaces and a fine border; text actions use cyan. Shared focus uses a (3px) outline with (4px) offset; sign-in fields retain (2px) with (2px) offset. Color transitions last (.18s), ease-out. Reduced-motion preference removes transitions and smooth scrolling.

### Chips

Course-state labels use fine borders, dark cyan-tinted fill and small corners. Current and complete states carry explicit text; completed progress may use a green tint. Locked content retains a readable explanation. Chips communicate state rather than ornamental headings.

### Cards / Containers

Blue bordered panels group modules, progress, reflection and staff tasks. Dashboard headers use approximately (23px) insets; lesson panels use (28px) desktop and (22px 18px) phone padding. Module cards keep separate metadata and action rows. Current modules change border color; locked modules retain explanatory text. Staff metrics use flat strips and dividers rather than independent floating tiles.

### Inputs / Fields

Dark inset controls use field-border strokes, control corners, cool text and cyan carets. Placeholder text is subdued blue. Labels and focus remain visible; failures use error text on dark red. Radio and checkbox accents use cyan. Preserve actual disabled and validation behavior instead of inferring new states.

### Navigation

Icon-and-label rows have a (44px) minimum height. Selected rows use a dark cyan fill and light cyan text; hover uses a quiet blue tint. Phone navigation retains labels in a horizontally scrollable strip and hides decorative icons and auxiliary rail sections. Inline SVG icons use currentColor strokes, rounded caps and joins; ordinary icons render at (18?20px).

### Technical welcome

The microchip mark supplies the shared identity. Overview heroes pair the existing welcome/actions with a bordered, noninteractive code example on desktop; this preview hides at the tablet breakpoint. It is illustrative code, not live runtime status. The profile cover uses a restrained code-brace detail. Original landscape assets and provenance remain in the repository but are not visible theme materials.

## Do's and Don'ts

### Do:
- **Do** apply the shared software world across entry, student, teacher and administrator screens.
- **Do** preserve visible next actions, locked reasons and explicit completion text.
- **Do** use local Geist and inline SVG symbols; reserve monospace for code.
- **Do** preserve visible focus and reduced-motion behavior.

### Don't:
- **Don't** restore the superseded landscape-and-green identity on visible theme surfaces.
- **Don't** turn illustrative code into fabricated live status, versions or counts.
- **Don't** promote hidden legacy eyebrows, mascot art or ornamental effects into new patterns.
- **Don't** treat documentation or automated checks as an independent finish-review verdict.

Evidence: `frontend/src/technology-theme.css` is loaded last and owns the final palette and technical surfaces. `student-redesign.css` and `staff-redesign.css` provide shared layout; `profile-page.css` shapes the profile. `App.jsx` and `StudentVisuals.jsx` establish entry, chip symbols and code previews. `PRODUCT.md` and `design-plans/software-theme-direction.md` record the approved replacement. Legacy palette names remain compatibility aliases; underlying landscape declarations are superseded, not normative. This documentation does not canonize hidden legacy decoration or unreviewed drift.
