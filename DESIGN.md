---
name: Spotter
description: A sound browser that looks like part of Premiere, with teal only where something is chosen or playing.
colors:
  rail-grey: "#191919"
  ground-grey: "#1e1e1e"
  card-grey: "#262626"
  card-hover-grey: "#2c2c2c"
  seam-grey: "#3a3a3a"
  control-edge: "#4a4a4a"
  lit-edge: "#606060"
  well-black: "#1b1b1b"
  field-black: "#161616"
  chip-grey: "#2a2a2a"
  ink: "#d8d8d8"
  ink-strong: "#ffffff"
  ink-soft: "#a3a3a3"
  ink-faint: "#8c8c8c"
  ink-disabled: "#6a6a6a"
  wave-ahead: "#5c5c5c"
  mark-teal: "#3f8a92"
  mark-teal-lit: "#4a9aa2"
  pale-teal: "#6fb4bb"
  teal-wash: "#16383b"
  teal-chip: "#1f4549"
  error-red: "#e57373"
typography:
  title:
    fontFamily: "Inter, Adobe Clean, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.01em"
  body:
    fontFamily: "Inter, Adobe Clean, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.01em"
  body-strong:
    fontFamily: "Inter, Adobe Clean, Segoe UI, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.01em"
  meta:
    fontFamily: "Inter, Adobe Clean, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
    letterSpacing: "0.01em"
  section:
    fontFamily: "Inter, Adobe Clean, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "14px"
    letterSpacing: "0.06em"
  numeric:
    fontFamily: "JetBrains Mono, Consolas, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.01em"
rounded:
  chip: "4px"
  control: "5px"
  menu: "6px"
  card: "8px"
  pill: "9px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "26px"
  button-hover:
    backgroundColor: "{colors.card-grey}"
    textColor: "{colors.ink-strong}"
  button-disabled:
    textColor: "{colors.ink-disabled}"
  play-button:
    backgroundColor: "{colors.mark-teal}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.round}"
    size: "34px"
  play-button-hover:
    backgroundColor: "{colors.mark-teal-lit}"
  mini-play:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    size: "22px"
  mini-play-playing:
    backgroundColor: "{colors.mark-teal}"
    textColor: "{colors.ink-strong}"
  search-field:
    backgroundColor: "{colors.field-black}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.control}"
    padding: "0 8px 0 26px"
    height: "26px"
  sound-card:
    backgroundColor: "{colors.card-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "112px"
  sound-card-hover:
    backgroundColor: "{colors.card-hover-grey}"
  waveform-well:
    backgroundColor: "{colors.well-black}"
    rounded: "{rounded.control}"
    height: "56px"
  tree-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "26px"
  tree-row-selected:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.ink-strong}"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    height: "32px"
    padding: "0 10px 0 8px"
  list-row-selected:
    backgroundColor: "{colors.teal-wash}"
  count-pill:
    backgroundColor: "{colors.chip-grey}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.numeric}"
    rounded: "{rounded.pill}"
    height: "17px"
  count-pill-selected:
    backgroundColor: "{colors.teal-chip}"
    textColor: "{colors.ink-strong}"
  format-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.numeric}"
    rounded: "{rounded.chip}"
    height: "17px"
  view-toggle-on:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.ink-strong}"
    width: "28px"
    height: "24px"
  switch-on:
    backgroundColor: "{colors.mark-teal}"
    width: "28px"
    height: "16px"
  menu:
    backgroundColor: "{colors.card-hover-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.menu}"
    padding: "4px"
  menu-item-hover:
    backgroundColor: "{colors.teal-wash}"
    textColor: "{colors.ink-strong}"
---

# Design System: Spotter

## Overview

**Creative North Star: "The Docked Native"**

Spotter is a sound browser that should read as one more Premiere Pro panel, not as a product with its own theme. It wears Premiere's grey ladder, Premiere's type sizes and Premiere's 1px seams, and lets exactly one colour in: the dark teal of the Narrative Node mark, which appears only where something is chosen or playing. Everything else is grey, so the teal always means "this one".

The panel is dense and docked, often narrow, used in a dark edit suite while auditioning many sounds and placing few. The content is the user's own files drawn as their real waveforms with real durations; the waveform is the only picture in the system and it is never decorative. Depth is a lighter grey, never a shadow. Nothing moves except playback: the playhead advancing and the played portion of a waveform filling pale teal.

Spotter shares the greys, type and doctrine of its sibling Navigator, but its accent is teal, not Navigator's blue.

**Key Characteristics:**
- Premiere's neutral greys; teal reserved for selection, the on state, and playback.
- Real waveforms on every card, row and the player; played portion in pale teal.
- Flat: no shadows, no gradients for depth, no transitions.
- Inter at 11 to 13px with JetBrains Mono for every number (durations, counts, time, formats).
- Rounded cards (8px) against tighter controls (5px), round play buttons, pill counts.

## Colors

A neutral grey ladder lifted straight from Premiere, with one teal family and one red.

### Primary
- **Mark Teal** (`mark-teal`): the "on" colour. Selected card outline, the player's round play button, the playing card's mini-play fill, the Auto-Play switch when on, the search field's focus border, text selection. Lightens to **Mark Teal Lit** (`mark-teal-lit`) only on the play button's hover.
- **Pale Teal** (`pale-teal`): the played portion of every waveform, the playing sound's name, the selected section title, focus rings and the search caret. It is the colour of "now".
- **Teal Wash** (`teal-wash`): the background of selected tree rows, selected list rows, the active view-toggle segment and highlighted menu items. **Teal Chip** (`teal-chip`) is the count pill on a selected row.

### Neutral
- **Rail Grey** (`rail-grey`): the sidebar and the player bar, the panel's outer frame.
- **Ground Grey** (`ground-grey`): the content area behind the grid and list.
- **Card Grey** (`card-grey`) and **Card Hover Grey** (`card-hover-grey`): sound cards at rest and on hover; Card Hover Grey is also the context-menu surface.
- **Well Black** (`well-black`) and **Field Black** (`field-black`): recessed surfaces, darker than the ground. Well Black holds the waveform inside a card and the status line; Field Black is the search field.
- **Chip Grey** (`chip-grey`): count pills and the off switch track.
- **Seam Grey** (`seam-grey`): 1px dividers between sidebar, bar, results and player; also the unplayed track of an empty waveform and the volume track.
- **Control Edge** (`control-edge`) and **Lit Edge** (`lit-edge`): 1px borders on buttons, fields and toggles at rest and on hover.
- **Ink** (`ink`), **Ink Strong** (`ink-strong`), **Ink Soft** (`ink-soft`), **Ink Faint** (`ink-faint`): body text, names and headings, metadata, icons and placeholders. **Ink Disabled** (`ink-disabled`) only on disabled controls.
- **Wave Ahead** (`wave-ahead`): the unplayed bars of a waveform.
- **Error Red** (`error-red`): "Not found" on a missing folder and the status line in error.

### Named Rules
**The Teal Means Chosen Rule.** Teal appears only on what is selected, switched on, focused or playing. A teal element at rest, unselected and silent, is a bug.

**The Premiere Ladder Rule.** Surfaces step through the grey ladder (rail, ground, card, card hover) and recessed wells go darker than the ground. No tinted neutrals, no new greys for a single element.

## Typography

**Body Font:** Inter (with Adobe Clean, Segoe UI, system-ui), bundled as woff2 at 400, 500 and 600.
**Numeric Font:** JetBrains Mono 500 (with Consolas, Menlo).

**Character:** Premiere's own small, even UI type. Inter carries every word; JetBrains Mono carries every number, so durations and times line up and read as measurements.

### Hierarchy
- **Title** (600, 13px, 16px): the toolbar heading (the folder in view) and the empty-state heading.
- **Body** (400, 12px, 16px): tree rows, buttons, menu items, switch labels. Body Strong (600) is a sound's name on a card and in the player; list-view names use 500.
- **Meta** (400, 11px, 14px): file counts, folder names under a sound, the status line, menu hints, the footer promotion line (15px leading).
- **Section** (600, 11px, 0.06em, uppercase): the MUSIC and SFX section headers in the sidebar, which are buttons that show every sound in the section, following Premiere's own panel-section convention.
- **Numeric** (JetBrains Mono 500, 11px, 14px): durations, elapsed and total time, count pills, format chips (0.02em).

### Named Rules
**The 11px Floor Rule.** Nothing is set below 11px.

**The Numbers Are Mono Rule.** Every duration, time, count and file format is JetBrains Mono; no number is set in Inter.

## Layout

A two-column grid: the sidebar takes `clamp(156px, 28%, 228px)` and the main column takes the rest. The main column stacks a 44px toolbar, the scrolling results, a status line when needed, and a 60px player bar, separated by 1px seams.

The card grid is computed, not CSS grid: cards are at least 176px wide and 112px tall, with 12px outer padding and 10px gaps, and columns fill the available width. The list view is full-width 32px rows with a 1px divider. Both views are virtualised for libraries of thousands of files.

Spacing runs on a tight 4 / 6 / 8 / 10 / 12px rhythm; 12px is the panel's edge inset, 26px the standard control and tree-row height.

Narrow panels give room to the waveform first. Below 1180px the player's buttons drop their words; below 600px the volume slider, list-view folder and format columns, and file count go; below 520px the player buttons go entirely and the player waveform takes its own row so time and mute keep theirs.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth is tonal: a card is one step lighter than the ground, hover is one step lighter again, and recessed surfaces (waveform wells, the search field, the status line) are darker than the ground. The context menu, the only floating surface, is separated by a 1px Lit Edge border and the Card Hover Grey fill, not a shadow.

### Named Rules
**The Lighter Grey Rule.** To lift something, make it one grey lighter; to sink it, one grey darker. Never a shadow, never a blur.

**The Only Motion Is Playback Rule.** No transitions or animations. The playhead advancing and the waveform filling are the only things that move; state changes (hover, toggle, expand) are instant.

## Shapes

Two radii carry the system: gently rounded cards (8px) and tighter controls (5px) for buttons, fields, tree rows, toggles and the waveform well inside a card. The menu sits between them (6px) with 4px items; format chips are 4px. Counts are full pills (9px on 17px), play buttons and the volume thumb are circles. Borders are always 1px: solid for controls, dashed for the "add folder" line and for a mini-play whose file cannot preview. Icons are inline SVG line drawings at a 1.3px stroke, 10 to 15px; play and pause glyphs are filled.

## Components

### Buttons
- **Shape:** 26px tall, 5px radius, 1px Control Edge border, transparent fill, 10px side padding, 13px icon with 6px gap.
- **Hover / Active:** border goes to Lit Edge, fill to Card Grey, text to Ink Strong; pressed is Card Hover Grey. Instant, no transition.
- **Disabled:** Ink Disabled text on a darker border.
- **Icon button:** 20px square, borderless until hover, Ink Faint icon.

### Play Buttons
- **Player play:** a 34px Mark Teal circle with a filled white glyph; hover lightens to Mark Teal Lit; disabled is a grey circle.
- **Mini-play:** a 22px outlined circle on each card and row. Hover rings it in Pale Teal; when its sound plays it fills Mark Teal and shows pause. A sound that cannot preview gets a dashed ring in Ink Faint.

### Sound Card (signature)
- **Corner Style:** 8px.
- **Background:** Card Grey, Card Hover Grey on hover; selected adds a 1px Mark Teal border and the well darkens to a teal-tinted near-black.
- **Content:** a 56px Well Black waveform well (5px radius, 6px inset) holding the file's real waveform, then mini-play beside the name (Body Strong) over duration (Numeric), folder (Meta) and a format chip.
- **Playing:** the name turns Pale Teal and the waveform fills Pale Teal behind the playhead, in step with the player.

### Waveforms
Bars mirrored about the centre line, 2px bars with 1px gaps in list rows and the player. Unplayed bars are Wave Ahead, played bars Pale Teal, a file with no peaks yet shows a flat Seam Grey line. The waveform is always the file's real peaks.

### Inputs / Fields
- **Search:** 26px, Field Black fill, 1px Control Edge border, 5px radius, magnifier inset at 8px, Pale Teal caret. Focus switches the border to Mark Teal with no ring.

### Navigation
- **Sidebar tree:** 26px rows inset 6px with a 5px radius, 12px indent per depth, 16px chevron twisty. Hover is a one-step lighter grey; selected is Teal Wash with Ink Strong text. Count pills sit at the right and give way to a remove button on hover. A missing folder is struck through in Ink Faint with "Not found" in Error Red.
- **View toggle:** a two-segment 1px-bordered group; the active segment is Teal Wash.
- **Auto-Play switch:** 28 by 16px track; off is Chip Grey with a grey knob, on is Mark Teal with a white knob.

### Context Menu
Card Hover Grey surface, 1px Lit Edge border, 6px radius, 4px padding, 24px items with 4px radius; hover and keyboard focus are Teal Wash. Shortcut hints sit right in Ink Faint Meta.

## Do's and Don'ts

### Do:
- **Do** keep teal to selected, on, focused and playing states (Mark Teal, Pale Teal, Teal Wash).
- **Do** draw every waveform from the file's real peaks, played portion in Pale Teal.
- **Do** set every number in JetBrains Mono 500 at 11px.
- **Do** separate regions with 1px Seam Grey lines and lift surfaces by one step of the grey ladder.
- **Do** use 8px radius for cards and 5px for controls, rows and fields.
- **Do** let the player waveform keep its room on narrow panels; drop button words, then buttons, before it shrinks.

### Don't:
- **Don't** use box-shadow, drop shadows or blur for depth or for the menu.
- **Don't** add transitions or animations; only playback moves.
- **Don't** colour chrome, headers or idle controls teal, and don't introduce a second accent.
- **Don't** set any text below 11px.
- **Don't** draw decorative or placeholder waveforms that are not the file's own.
