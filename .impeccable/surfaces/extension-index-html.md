---
version: 1
slug: "extension-index-html"
primary_target: "extension/index.html"
related_targets: []
---

# Spotter panel

Scope: the whole CEP panel (`extension/index.html`), Operate mode. Audience: Premiere Pro editors auditioning music and sound effects from folders on disk. Task: find a sound fast, hear it, get it into the project or timeline. Constraints: docked and often narrow; Premiere's shortcuts keep working; libraries of thousands of files; drives come and go. Content is the user's own files; nothing is invented.

Confirmed with the user: layout is cards with a toggle to a dense list; colour is Premiere's neutral greys with teal only for selection and playback.

## Direction contract

THESIS: A sound browser that looks like part of Premiere: neutral grey panels, the brand's teal appearing only where something is chosen or playing. Refuses the category default of a branded dark theme with coloured chrome and fake decorative waveforms.

OWN-WORLD: Premiere's grey ladder (#191919 sidebar, #1e1e1e content, #262626 cards, #3a3a3a seams); teal from the Narrative Node mark: #3f8a92 for selection outlines and controls that are on, #6fb4bb pale teal for played waveform and progress, #16383b selection wash. Inter at 11-12px (11px is the floor), JetBrains Mono for durations, counts and time. 8px card radius (amended from 6px at the finish review: the reference's rounded cards), 5px controls, pill counts, 1px seams, no shadows, no motion.

STORY: The editor adds a Music or SFX folder, sees every file as its real waveform with a duration, clicks to hear it, and double-clicks or drags it into Premiere, where it lands in a bin named after its folder.

FIRST VIEWPORT: Left sidebar (200px): MUSIC and SFX headers with + buttons, folder trees with count pills, Auto-Play switch and Rescan at the foot. Right: toolbar (folder name, file count, search, cards/list toggle), the sound grid, then the player bar (round play button, name, full waveform, time, volume). Footer line promoting Navigator under the sidebar.

FORM: Pinned by the user's reference (sidebar, waveform card grid, bottom player, Auto-Play toggle); no concept roll, no seed key. Signature move: real waveforms on every card and row, and the playing card fills pale teal behind the playhead in step with the player.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
