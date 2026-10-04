/*
 * Spotter by Narrative Node: what the panel needs from CEP, Node and Premiere.
 * Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
 *
 * Everything outside the page goes through this one object, `SpotterEnv`, so the
 * panel can run in a plain browser with a stand-in (spotter/dev/preview.html).
 * Defined only inside CEP, where Node's `require` exists (--mixed-context).
 */
(function (root) {
  "use strict";
  if (root.SpotterEnv || typeof require !== "function" || !root.__adobe_cep__) return;

  const fs = require("fs");
  const path = require("path");
  const url = require("url");
  const childProcess = require("child_process");
  const cep = root.__adobe_cep__;
  const isMac = process.platform === "darwin";

  /** CSInterface's getSystemPath, without CSInterface: a file URL turned back into a path. */
  function systemPath(kind) {
    let p = decodeURI(cep.getSystemPath(kind));
    p = isMac ? p.replace(/^file:\/\//, "") : p.replace(/^file:\/\/\//, "");
    return p;
  }

  const dataDir = path.join(systemPath("userData"), "Narrative Node", "Spotter");

  /**
   * The keys the panel uses while it has focus. CEP passes every other key to
   * Premiere, so Space, J/K/L and Ctrl/Cmd+S keep working with the panel active.
   * Key codes are the platform's own: Windows virtual keys, macOS key codes.
   */
  const KEYS = isMac
    ? [{ keyCode: 123 }, { keyCode: 124 }, { keyCode: 125 }, { keyCode: 126 }, { keyCode: 36 }, { keyCode: 76 }]
    : [{ keyCode: 37 }, { keyCode: 38 }, { keyCode: 39 }, { keyCode: 40 }, { keyCode: 13 }];

  let decoder = null;

  root.SpotterEnv = {
    platform: isMac ? "mac" : "win",
    basename: (p) => path.basename(p),
    join: (...parts) => path.join(...parts),

    /** One level of a folder: { name, isDir, size, mtimeMs }. Sizes only for audio files. */
    async listDir(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      return Promise.all(entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        let isDir = entry.isDirectory();
        let size = 0;
        let mtimeMs = 0;
        if (entry.isSymbolicLink() || (!isDir && root.SpotterCore.isAudio(entry.name))) {
          try {
            const st = await fs.promises.stat(full);
            isDir = st.isDirectory();
            size = st.size;
            mtimeMs = st.mtimeMs;
          } catch (e) { /* a broken link reads as a plain file and is skipped */ }
        }
        return { name: entry.name, isDir, size, mtimeMs };
      }));
    },

    async readFile(p) {
      const b = await fs.promises.readFile(p);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },

    fileUrl: (p) => url.pathToFileURL(p).href,

    /** Decodes a file for its waveform. Large files are left alone: reading 300 MB to draw 240 bars is not worth it. */
    async decode(file, count) {
      if (file.size > 200 * 1024 * 1024) return { peaks: null, duration: NaN, tooLarge: true };
      decoder = decoder || new AudioContext();
      const audio = await decoder.decodeAudioData(await this.readFile(file.path));
      const channels = [];
      for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
      return { peaks: root.SpotterCore.peaksFrom(channels, count), duration: audio.duration };
    },

    /** Reads only a file's header for its length: what the cards without waveforms need. */
    probeDuration(file) {
      return new Promise((resolve) => {
        const audio = new Audio();
        const done = (value) => {
          clearTimeout(timer);
          audio.removeAttribute("src");
          audio.load();
          resolve(value);
        };
        const timer = setTimeout(() => done(NaN), 10000);
        audio.preload = "metadata";
        audio.addEventListener("loadedmetadata", () => done(audio.duration), { once: true });
        audio.addEventListener("error", () => done(NaN), { once: true });
        audio.src = url.pathToFileURL(file.path).href;
      });
    },

    /** The folder picker can answer with forward slashes on Windows; normalised, it matches Node's own paths. */
    pickFolder(title) {
      const result = root.cep.fs.showOpenDialogEx(false, true, title, "");
      return result && result.err === 0 && result.data && result.data[0] ? path.normalize(result.data[0]) : null;
    },

    /** A small JSON file over https, or null. The update bar's only network request. */
    async fetchJson(url) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
      });
      return res.ok ? res.json() : null;
    },

    /** Calls a host.jsx function. Arguments go over as JSON, which ExtendScript reads as literals. */
    host(fn, ...args) {
      return new Promise((resolve) => {
        cep.evalScript(`${fn}(${args.map((a) => JSON.stringify(a)).join(",")})`, (result) => resolve(String(result)));
      });
    },

    openUrl(link) {
      root.cep.util.openURLInDefaultBrowser(link);
    },

    reveal(p) {
      if (isMac) childProcess.spawn("open", ["-R", p], { detached: true });
      else childProcess.spawn("explorer.exe", [`/select,"${p}"`], { detached: true, windowsVerbatimArguments: true });
    },

    revealLabel: isMac ? "Show in Finder" : "Show in Explorer",

    async loadJson(name, fallback) {
      try {
        return JSON.parse(await fs.promises.readFile(path.join(dataDir, name), "utf8"));
      } catch (e) {
        return fallback;
      }
    },

    /** Written to a temporary file and renamed, so a crash mid-write never leaves half a file. */
    async saveJson(name, value) {
      await fs.promises.mkdir(dataDir, { recursive: true });
      const target = path.join(dataDir, name);
      const temp = `${target}.${process.pid}.tmp`;
      await fs.promises.writeFile(temp, JSON.stringify(value));
      await fs.promises.rename(temp, target);
    },

    registerKeys() {
      try { cep.registerKeyEventsInterest(JSON.stringify(KEYS)); } catch (e) { /* older CEP: keys still reach the panel */ }
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
