/*
 * A stand-in for CEP, so the panel runs in an ordinary browser for design work
 * and screenshots: open dev/preview.html. Not shipped.
 *
 * The library below is SYNTHETIC: invented folder and file names with made-up
 * waveforms. Every sound plays the same short generated tone.
 *
 * ?state= picks a starting point: tiles (default), cards, list, empty, missing, update, notice.
 */
(function (root) {
  "use strict";

  const LIBRARY = {
    "D:\\Library\\Music": {
      Cinematic: ["Northern Lights Swell.wav", "Last Light Piano.wav", "Glass Horizon (Underscore).wav", "Ascent 120bpm.wav", "Slow Tide Strings.wav", "Paper Planes Ambient.wav", "Reverie No. 4.wav", "Harbour at Dawn.mp3"],
      "Lo-Fi": ["Rain on Tin.mp3", "Sunday Tapes.mp3", "Late Bus Home.mp3", "Kettle Steam Beat.mp3"],
      Wedding: { Upbeat: ["First Dance Pop.wav", "Confetti Clap Groove.wav"], Ceremony: ["Aisle Strings in D.wav", "Vows Underscore.aiff"] },
    },
    "E:\\SFX Library": {
      Whooshes: ["Whoosh Air Fast 01.wav", "Whoosh Air Fast 02.wav", "Whoosh Low Rumble.wav", "Swish Cloth.wav", "Transition Riser 4s.wav", "Reverse Cymbal Swell.wav"],
      Impacts: ["Impact Deep Boom.wav", "Hit Metal Clang.wav", "Door Slam Wood.wav", "Punch Body Thud.wav"],
      Foley: { Footsteps: ["Steps Gravel Walk.wav", "Steps Wood Floor.wav", "Steps Snow Crunch.wav"], Paper: ["Page Turn Book.wav", "Paper Crumple.wav"] },
      Ambience: ["Room Tone Office.wav", "City Street Night.wav", "Forest Birds Morning.m4a"],
    },
  };
  const MISSING = "F:\\Archive SFX";

  function lookup(path) {
    for (const [rootPath, tree] of Object.entries(LIBRARY)) {
      if (path === rootPath) return tree;
      if (path.startsWith(rootPath + "\\")) {
        let node = tree;
        for (const part of path.slice(rootPath.length + 1).split("\\")) node = node && !Array.isArray(node) ? node[part] : undefined;
        return node;
      }
    }
    return undefined;
  }

  function hash(text) {
    let x = 2166136261;
    for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 16777619);
    return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) ^ Math.imul(x ^ (x >>> 13), 3266489909)) >>> 0) / 4294967296;
  }

  /** Made-up peaks shaped like the name suggests: hits decay, swells rise, music breathes. */
  function syntheticPeaks(file, count) {
    const rand = hash(file.path);
    const n = file.name.toLowerCase();
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let env;
      if (/impact|hit|slam|punch|thud|clang/.test(n)) env = Math.exp(-t * 7) * 0.95 + 0.02;
      else if (/whoosh|swish|riser|swell|reverse/.test(n)) env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 2;
      else if (/step|page|paper|crumple|clap/.test(n)) env = (Math.sin(t * 38) > 0.55 ? 0.85 : 0.12);
      else if (/room|street|forest|rain/.test(n)) env = 0.35 + 0.1 * Math.sin(t * 9);
      else env = 0.45 + 0.35 * Math.sin(t * 6.3 + rand() * 0.4) * Math.sin(t * 2.1) + (t < 0.04 ? -0.3 : 0);
      out[i] = Math.max(4, Math.min(255, Math.round((env * (0.7 + rand() * 0.3)) * 255)));
    }
    return out;
  }

  function durationOf(file) {
    const rand = hash(file.name);
    const n = file.name.toLowerCase();
    if (/impact|hit|slam|punch|thud|clang|whoosh|swish|page|crumple/.test(n)) return 0.6 + rand() * 2.4;
    if (/room|street|forest|step/.test(n)) return 30 + rand() * 90;
    return 95 + rand() * 160;
  }

  /** A soft tone as long as the card says the sound is, so the player and the card's fill stay in step. */
  function toneWav(seconds) {
    const rate = 8000;
    const samples = Math.max(1, Math.round(rate * seconds));
    const buf = new ArrayBuffer(44 + samples * 2);
    const v = new DataView(buf);
    const text = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    text(0, "RIFF"); v.setUint32(4, 36 + samples * 2, true); text(8, "WAVEfmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, "data"); v.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) v.setInt16(44 + i * 2, Math.sin(i / rate * 2 * Math.PI * 330) * 4000 * Math.exp(-i / samples * 2), true);
    return buf;
  }
  const tones = new Map();
  function toneFor(path) {
    if (!tones.has(path)) {
      const data = toneWav(durationOf({ name: path.split("\\").pop() }));
      tones.set(path, { data, url: URL.createObjectURL(new Blob([data], { type: "audio/wav" })) });
    }
    return tones.get(path);
  }

  // Seed the panel's settings for the requested starting point.
  const params = new URLSearchParams(location.search);
  const start = params.get("state") || "tiles";
  localStorage.clear();
  const set = (k, v) => localStorage.setItem(`spotter.${k}`, JSON.stringify(v));
  if (start !== "empty") {
    set("folders", { music: ["D:\\Library\\Music"], sfx: ["E:\\SFX Library", MISSING] });
    set("expanded", ["D:\\Library\\Music", "E:\\SFX Library", "E:\\SFX Library\\Foley"]);
    set("target", start === "missing" ? { section: "sfx", path: MISSING } : start === "list" ? { section: "sfx", path: "E:\\SFX Library" } : { section: "music", path: null });
    if (start === "list" || start === "cards") set("layout", start);
    set("autoplay", true);
  }

  let picks = 0;
  root.SpotterEnv = {
    platform: "win",
    basename: (p) => p.split(/[\\/]/).filter(Boolean).pop() || p,
    join: (...parts) => parts.join("\\"),
    async listDir(path) {
      if (path === MISSING) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      const node = lookup(path);
      if (node === undefined) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      const list = Array.isArray(node) ? node.map((name) => ({ name, isDir: false })) : Object.keys(node).map((name) => ({ name, isDir: true }));
      return list.map((e) => Object.assign(e, { size: 4_000_000, mtimeMs: 1_700_000_000_000 }));
    },
    async readFile(path) { return toneFor(path).data.slice(0); },
    fileUrl: (path) => toneFor(path).url,
    async probeDuration(file) {
      await new Promise((r) => setTimeout(r, 10));
      return durationOf(file);
    },
    async fetchJson() {
      // ?state=update shows a newer version; ?state=notice shows a promo notice.
      const notices = [{ id: "navigator", text: "Browse and scrub your video footage inside Premiere Pro.", label: "Try Navigator", url: "https://www.narrativenode.app/navigator" }];
      if (start === "update") return { latest: "1.1.0", notes: "Card size slider and a faster player", url: "https://www.narrativenode.app/spotter", notices };
      if (start === "notice") return { latest: "1.0.2", notices };
      return null;
    },
    async decode(file, count) {
      await new Promise((r) => setTimeout(r, 30));
      return { peaks: syntheticPeaks(file, count), duration: durationOf(file) };
    },
    pickFolder() { return ++picks % 2 ? "D:\\Library\\Music" : null; },
    async host(fn) {
      await new Promise((r) => setTimeout(r, 120));
      if (fn === "spotterIsTimelinePlaying") return "false";
      return fn === "spotterInsert" ? "error: Open a sequence first." : "ok";
    },
    openUrl(link) { console.log("open", link); },
    reveal(p) { console.log("reveal", p); },
    revealLabel: "Show in Explorer",
    async loadJson(name, fallback) { return fallback; },
    async saveJson() {},
    registerKeys() {},
  };
})(window);
