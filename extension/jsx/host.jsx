/*
 * Spotter by Narrative Node: the project side (ExtendScript, Premiere Pro).
 * Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
 *
 * The panel calls these with evalScript. Every argument arrives as a JavaScript
 * literal (a string, or an array of strings for a bin path), and every function
 * returns a short string: "ok", or "error: <what the editor should read>".
 *
 * Bins mirror the folders, as in Navigator: a sound in D:/Music/Wedding/Upbeat
 * under the Music folder D:/Music goes to Music > Wedding > Upbeat; sound
 * effects go under Assets > SFX.
 */

function spotterBinChild(parent, name) {
    for (var i = 0; i < parent.children.numItems; i++) {
        var child = parent.children[i];
        if (child && child.type === ProjectItemType.BIN && child.name === name) return child;
    }
    return null;
}

/** Finds or makes each bin along the path, from the project root. */
function spotterEnsureBin(names) {
    var bin = app.project.rootItem;
    for (var i = 0; i < names.length; i++) {
        var next = spotterBinChild(bin, names[i]);
        if (!next) {
            var made = bin.createBin(names[i]);
            next = made || spotterBinChild(bin, names[i]);
        }
        if (!next) return bin;
        bin = next;
    }
    return bin;
}

function spotterSamePath(a, b) {
    if (!a || !b) return false;
    var norm = function (p) { return String(p).replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase(); };
    return norm(a) === norm(b);
}

/** The clip for this file in a bin (not its sub-bins), or null. */
function spotterFindIn(bin, filePath) {
    for (var i = bin.children.numItems - 1; i >= 0; i--) {
        var child = bin.children[i];
        if (!child || child.type === ProjectItemType.BIN) continue;
        try { if (spotterSamePath(child.getMediaPath(), filePath)) return child; } catch (e) {}
    }
    return null;
}

/**
 * Premiere sometimes ignores the target bin and imports into the root, and a
 * drag onto the timeline always imports there. Moves such a clip into its bin.
 */
function spotterSweepRoot(filePath, bin) {
    var root = app.project.rootItem;
    if (bin === root) return spotterFindIn(root, filePath);
    var stray = spotterFindIn(root, filePath);
    if (stray) {
        try { stray.moveBin(bin); } catch (e) {}
    }
    return spotterFindIn(bin, filePath) || stray;
}

/** Imports the file into its bin, or finds it there if it is already in. */
function spotterImportItem(filePath, binPath) {
    var bin = spotterEnsureBin(binPath);
    var item = spotterFindIn(bin, filePath);
    if (item) return item;
    app.project.importFiles([filePath], true, bin, false);
    return spotterSweepRoot(filePath, bin);
}

function spotterCheck(filePath) {
    if (!app.project) return "error: Open a project first.";
    if (!new File(filePath).exists) return "error: The file is no longer there.";
    return "";
}

function spotterImport(filePath, binPath) {
    try {
        var problem = spotterCheck(filePath);
        if (problem) return problem;
        return spotterImportItem(filePath, binPath) ? "ok" : "error: Premiere did not import the file.";
    } catch (e) {
        return "error: " + e.toString();
    }
}

/** Where a clip may go at the playhead: the first audio track with nothing under it there. */
function spotterFreeAudioTrack(seq, seconds) {
    for (var t = 0; t < seq.audioTracks.numTracks; t++) {
        var track = seq.audioTracks[t];
        if (track.isLocked && track.isLocked()) continue;
        var busy = false;
        for (var c = 0; c < track.clips.numItems; c++) {
            var clip = track.clips[c];
            if (clip.start.seconds <= seconds && clip.end.seconds > seconds) { busy = true; break; }
        }
        if (!busy) return track;
    }
    return null;
}

function spotterInsert(filePath, binPath) {
    try {
        var problem = spotterCheck(filePath);
        if (problem) return problem;
        var seq = app.project.activeSequence;
        if (!seq) return "error: Open a sequence first.";
        var item = spotterImportItem(filePath, binPath);
        if (!item) return "error: Premiere did not import the file.";
        var at = seq.getPlayerPosition();
        var track = spotterFreeAudioTrack(seq, at.seconds);
        if (!track) return "error: Every audio track has a clip at the playhead.";
        track.overwriteClip(item, at.seconds);
        return "ok";
    } catch (e) {
        return "error: " + e.toString();
    }
}

/** After a drag onto the timeline or Project panel: puts the clip (every copy, if Premiere made two) in its bin. */
function spotterTidyDrop(filePath, binPath) {
    try {
        if (!app.project) return "ok";
        var root = app.project.rootItem;
        if (!spotterFindIn(root, filePath)) return "ok";
        var bin = spotterEnsureBin(binPath);
        if (bin === root) return "ok";
        for (var guard = 0, stray; guard < 10 && (stray = spotterFindIn(root, filePath)); guard++) stray.moveBin(bin);
        return "ok";
    } catch (e) {
        return "error: " + e.toString();
    }
}

var spotterLastPlayhead = -1;
var spotterLastPlayheadTime = 0;

/**
 * Returns "true" if the active sequence playhead is moving (timeline playback),
 * or "false" if stationary, no sequence is open, or an error occurs.
 */
function spotterIsTimelinePlaying() {
    try {
        if (!app.project || !app.project.activeSequence) return "false";
        var pos = app.project.activeSequence.getPlayerPosition();
        if (!pos) return "false";
        var now = (new Date()).getTime();
        var sec = pos.seconds;
        var moving = false;
        if (spotterLastPlayhead >= 0 && (now - spotterLastPlayheadTime) <= 600 && (now - spotterLastPlayheadTime) >= 40) {
            if (Math.abs(sec - spotterLastPlayhead) > 0.005) {
                moving = true;
            }
        }
        spotterLastPlayhead = sec;
        spotterLastPlayheadTime = now;
        return moving ? "true" : "false";
    } catch (e) {
        return "false";
    }
}

