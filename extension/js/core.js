/*
 * Spotter by Narrative Node: the parts that know nothing about the screen.
 * Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
 *
 * Plain functions over plain data, so they run the same in the panel and in
 * `node --test` (spotter/test). The file system comes in through `env`.
 */
(function (root) {
  "use strict";

  /** What Premiere imports as audio. */
  const AUDIO_EXTENSIONS = [".wav", ".mp3", ".aif", ".aiff", ".m4a", ".aac"];
  /** What the panel's Chromium can play and decode for a waveform. AIFF imports but does not play. */
  const PLAYABLE_EXTENSIONS = [".wav", ".mp3", ".m4a", ".aac"];

  const SECTIONS = ["music", "sfx"];
  const SECTION_LABELS = { music: "Music", sfx: "SFX" };
  /** Where each section imports to, from the project root (Navigator's convention). */
  const SECTION_BINS = { music: ["Music"], sfx: ["Assets", "SFX"] };

  function extensionOf(name) {
    const dot = name.lastIndexOf(".");
    return dot <= 0 ? "" : name.slice(dot).toLowerCase();
  }

  /** Hidden files, and the "._name" resource forks macOS leaves on other disks. */
  function isHidden(name) {
    return name.startsWith(".") || name === "Thumbs.db" || name === "desktop.ini";
  }

  function isAudio(name) {
    return !isHidden(name) && AUDIO_EXTENSIONS.includes(extensionOf(name));
  }

  function isPlayable(name) {
    return PLAYABLE_EXTENSIONS.includes(extensionOf(name));
  }

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const byName = (a, b) => collator.compare(a.name, b.name);

  /**
   * Reads a folder and everything under it into a tree:
   * { path, name, folders: [...], files: [{ path, name, ext, size, mtimeMs }], count }.
   * `count` is every audio file at or below the folder. A folder that cannot be
   * read gets `error` and no contents, and the rest of the tree carries on.
   */
  async function scanFolder(env, path, depth = 0) {
    const node = { path, name: env.basename(path) || path, folders: [], files: [], count: 0 };
    let entries;
    try {
      entries = await env.listDir(path);
    } catch (err) {
      node.error = err && err.code === "ENOENT" ? "missing" : "unreadable";
      return node;
    }
    const subfolders = [];
    for (const entry of entries) {
      if (isHidden(entry.name)) continue;
      const full = env.join(path, entry.name);
      if (entry.isDir) {
        if (depth < 12) subfolders.push(full);
      } else if (isAudio(entry.name)) {
        node.files.push({ path: full, name: entry.name, ext: extensionOf(entry.name), size: entry.size || 0, mtimeMs: entry.mtimeMs || 0 });
      }
    }
    for (const sub of subfolders) {
      const child = await scanFolder(env, sub, depth + 1);
      if (child.count > 0 || child.folders.length > 0) node.folders.push(child);
    }
    node.files.sort(byName);
    node.folders.sort(byName);
    node.count = node.files.length + node.folders.reduce((sum, f) => sum + f.count, 0);
    return node;
  }

  /** Every file at or below a folder, each with the folder it sits in relative to `base`. */
  function collectFiles(node, base = node.path, out = []) {
    for (const file of node.files) out.push({ ...file, folder: relativeFolder(base, node.path) });
    for (const sub of node.folders) collectFiles(sub, base, out);
    return out;
  }

  function splitPath(p) {
    return String(p).split(/[\\/]+/).filter((part) => part.length > 0);
  }

  function relativeFolder(base, folder) {
    const b = splitPath(base);
    const f = splitPath(folder);
    return f.slice(b.length).join(" › ");
  }

  /** Finds the folder node for a path within a tree, or null. */
  function findFolder(node, path) {
    if (samePath(node.path, path)) return node;
    for (const sub of node.folders) {
      const found = findFolder(sub, path);
      if (found) return found;
    }
    return null;
  }

  function samePath(a, b) {
    const norm = (p) => splitPath(p).join("/").toLowerCase();
    return norm(a) === norm(b);
  }

  /**
   * Whether `path` is `rootPath` or inside it. Compared by parts, so "D:/SFX"
   * from the folder picker matches "D:\SFX\Animals" built with Node's join.
   */
  function isInside(rootPath, path) {
    const r = splitPath(rootPath).map((p) => p.toLowerCase());
    const p = splitPath(path).map((x) => x.toLowerCase());
    return p.length >= r.length && r.every((part, i) => part === p[i]);
  }

  /** This build's version; the update check compares releases against it. Keep it equal to the manifest's. */
  const VERSION = "1.0.4";

  /**
   * Narrative Node's public updates repository: spotter.json says which version is newest and
   * carries short notices (an update, Navigator, a coming plugin). Empty turns the bar off.
   * Navigator reads version.json from the same repository.
   */
  const UPDATES_URL = "https://raw.githubusercontent.com/SKGaveesha/narrative-node-updates-server/refs/heads/main/spotter.json";
  /** A link in the file is followed only on these hosts, so a tampered file cannot send anyone to a lookalike. */
  const NOTICE_HOSTS = ["www.narrativenode.app", "narrativenode.app", "store.narrativenode.app", "github.com"];
  const UPDATE_FALLBACK_URL = "https://www.narrativenode.app/spotter";

  function safeUrl(url) {
    try {
      const u = new URL(String(url));
      return u.protocol === "https:" && NOTICE_HOSTS.includes(u.hostname.toLowerCase()) ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  const oneLine = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

  /**
   * What the file may say, and nothing else: a version, one link, one line of notes, and up to
   * ten notices of one line each. Anything malformed is dropped, never shown.
   */
  function readFeed(body) {
    const feed = { latest: null, url: UPDATE_FALLBACK_URL, notes: "", notices: [] };
    if (!body || typeof body !== "object") return feed;
    if (typeof body.latest === "string" && /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(body.latest)) feed.latest = body.latest;
    feed.url = safeUrl(body.url) || UPDATE_FALLBACK_URL;
    feed.notes = oneLine(body.notes, 120);
    for (const n of Array.isArray(body.notices) ? body.notices.slice(0, 10) : []) {
      if (!n || typeof n.id !== "string" || !/^[\w.-]{1,40}$/.test(n.id)) continue;
      const text = oneLine(n.text, 140);
      if (!text) continue;
      feed.notices.push({
        id: n.id,
        text,
        label: oneLine(n.label, 24) || "Learn more",
        url: safeUrl(n.url),
        until: typeof n.until === "string" && !Number.isNaN(Date.parse(n.until)) ? n.until : null,
      });
    }
    return feed;
  }

  /**
   * The one thing the bar shows: a newer version first, then the first notice that has not expired
   * and has not been dismissed. Dismissing hides that item only, so the next one waits for the next start.
   */
  function pickNotice(feed, { version, dismissed, now }) {
    if (!feed) return null;
    const gone = new Set(dismissed || []);
    if (feed.latest && compareVersions(feed.latest, version) > 0 && !gone.has("update-" + feed.latest)) {
      return {
        id: "update-" + feed.latest,
        text: "Spotter " + feed.latest + " is available" + (feed.notes ? ": " + feed.notes : "."),
        label: "Download",
        url: feed.url,
      };
    }
    for (const n of feed.notices || []) {
      if (gone.has(n.id)) continue;
      if (n.until && now > Date.parse(n.until) + 86400000) continue;
      return { id: n.id, text: n.text, label: n.label, url: n.url };
    }
    return null;
  }

  /** -1, 0 or 1, comparing dotted versions numerically: 1.10.0 is after 1.9.2. */
  function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d !== 0) return d < 0 ? -1 : 1;
    }
    return 0;
  }

  /**
   * The bins a file is imported into: the section's bins, then each folder
   * between the section's folder and the file. "D:/Music/Wedding/Upbeat/a.wav"
   * under the Music folder "D:/Music" goes to Music › Wedding › Upbeat.
   */
  function binPathFor(section, rootPath, filePath) {
    const rootParts = splitPath(rootPath);
    const fileParts = splitPath(filePath).slice(0, -1);
    const inside = fileParts.length >= rootParts.length &&
      rootParts.every((part, i) => part.toLowerCase() === fileParts[i].toLowerCase());
    return [...SECTION_BINS[section], ...(inside ? fileParts.slice(rootParts.length) : [])];
  }

  /** Every word of the query must appear in the file's name or folder. */
  function matches(file, query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return true;
    const hay = (file.name + " " + (file.folder || "")).toLowerCase();
    return words.every((w) => hay.includes(w));
  }

  function displayName(name) {
    const ext = extensionOf(name);
    return ext ? name.slice(0, -ext.length) : name;
  }

  /** 0:07, 3:45, 1:02:09. An unknown duration reads as –:––. */
  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "–:––";
    const s = Math.round(seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, "0");
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  }

  function formatCount(n) {
    return n.toLocaleString("en-US");
  }

  /** The label on a file's format pill. */
  function formatLabel(ext) {
    return ext.replace(".", "").toUpperCase().replace("AIFF", "AIF");
  }

  /**
   * Moves a selection index through a grid of `columns` by an arrow key.
   * Returns the new index, clamped to the list.
   */
  function stepSelection(index, key, columns, length) {
    if (length === 0) return -1;
    if (index < 0) return 0;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[key] || 0;
    return Math.max(0, Math.min(length - 1, index + delta));
  }

  /**
   * Peaks for a waveform: the loudest sample in each of `count` equal slices,
   * across every channel, scaled to 0-255.
   */
  function peaksFrom(channels, count) {
    const length = channels[0] ? channels[0].length : 0;
    const out = new Uint8Array(count);
    if (length === 0) return out;
    const slice = length / count;
    let loudest = 0;
    const raw = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const start = Math.floor(i * slice);
      const end = Math.max(start + 1, Math.floor((i + 1) * slice));
      // A long slice is sampled, not read in full: 2,000 reads find the peak shape at any length.
      const stride = Math.max(1, Math.floor((end - start) / 2000));
      let peak = 0;
      for (const data of channels) {
        for (let j = start; j < end; j += stride) {
          const v = Math.abs(data[j]);
          if (v > peak) peak = v;
        }
      }
      raw[i] = peak;
      if (peak > loudest) loudest = peak;
    }
    // Normalised, so a quiet file still shows its shape.
    const scale = loudest > 0 ? 255 / loudest : 0;
    for (let i = 0; i < count; i++) out[i] = Math.round(raw[i] * scale);
    return out;
  }

  const api = {
    AUDIO_EXTENSIONS, PLAYABLE_EXTENSIONS, SECTIONS, SECTION_LABELS, SECTION_BINS,
    VERSION, UPDATES_URL, NOTICE_HOSTS, compareVersions, isInside, readFeed, pickNotice,
    extensionOf, isHidden, isAudio, isPlayable, scanFolder, collectFiles, findFolder, samePath,
    binPathFor, matches, displayName, formatDuration, formatCount, formatLabel, stepSelection, peaksFrom,
  };
  root.SpotterCore = api;
  if (typeof module === "object" && module && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
