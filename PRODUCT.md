# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(A CEP extension panel inside Adobe Premiere Pro: HTML, CSS and JavaScript in Adobe's embedded Chromium, with Node.js enabled and ExtendScript for the project.)

## Stack

Plain HTML, CSS and JavaScript, no framework and no build step for the panel itself. Chosen for the reasons the user gave: "since there is no video we can build this as a direct cep extension", installed by copying the files into Premiere's extensions folder. ExtendScript (`host.jsx`) does the project work. Installers: a Windows `.exe` (Inno Setup) and a macOS `.pkg`, each copying a ZXP-signed copy of the extension.

## Users

Video editors working in Premiere Pro who keep music and sound effects in folders on disk (purchased libraries, stock downloads, their own recordings) and want to audition and place them without leaving Premiere. They meet Spotter as a free download; many will not have heard of Narrative Node before.

## Product Purpose

Browse the music and sound-effect folders you already have, inside Premiere: add Music and SFX folders, see each file's waveform, listen, and send a sound to the project or the timeline. It exists to be useful on its own and to introduce Narrative Node's paid plugin, Navigator. Success: an editor finds the right sound and has it in the sequence without opening Explorer or Finder.

## Positioning

Spotter is the asset-link part of Navigator, given away: the same folder model (Music and SFX folders, subfolders mirrored as bins on import), cut down to audio, with no helper app and no video. It is free and open source (GPL-3.0).

## Operating Context

- Docked in a Premiere Pro workspace beside the Project panel and timeline, often narrow, in a dark editing room.
- Libraries run from dozens to thousands of files, on internal drives, external drives and network shares; a drive may be disconnected.
- Editors audition many sounds quickly and place few. Premiere's own shortcuts (Space, Ctrl/Cmd+S, J/K/L) must keep working.

## Capabilities and Constraints

- Two sections only: **Music** and **SFX**. No video assets (that is Navigator's).
- Several folders per section; subfolders shown as a tree.
- Click to listen; double-click to import; drag onto the timeline or Project panel; insert at the playhead.
- Imports land in bins that mirror the folders: Music ▸ subfolders, Assets ▸ SFX ▸ subfolders (Navigator's convention).
- Formats: what Premiere imports and the panel's Chromium can play. AIFF imports but may not preview.
- Promotion of Navigator: one button at the foot of the sidebar ("Try Navigator", "For Video Footage", a "50% OFF" bubble) opening narrativenode.app/from-spotter, the page that gives the SPOTTER50OFF code. Set by the user on 2026-10-05; nothing else in the panel promotes it.
- Card size: one slider after the folder name scales cards, cards with waveforms and list rows alike.
- Licence: GPL-3.0. Lives in `spotter/` of the Navigator repository, self-contained, to be published as its own public repository.
- Undecided: the minimum Premiere version and whether Premiere 27 still loads CEP extensions; to be confirmed on real installs.

## Brand Commitments

- Name: **Spotter by Narrative Node**. Extension id `com.narrativenode.spotter`.
- Brand colours: dark teal, as in the Narrative Node mark (`icons/logo.png`) and store banner (`brand/`). The user asked for "the brand colors (dark teal)".
- UI idea taken from a reference extension the user pointed to (`com.multiply.scorelink v6`): sidebar of folders, grid of sound cards with waveforms, a player along the bottom, Auto-Play toggle.
- Shares Navigator's visual doctrine where it applies: no shadows, nothing animates except playback, controls drawn exactly.

## Evidence on Hand

None. No users, reviews or download numbers exist yet; do not invent any.

## Product Principles

1. Premiere comes first: never take a keystroke Premiere needs, never block the project.
2. Show the real thing: real waveforms and durations read from the files, not decoration.
3. Nothing is imported by browsing; the project only changes when the editor asks.
4. A missing drive or an unplayable file costs its own row, never the panel.
5. Free means complete: no nags, no locked features.
