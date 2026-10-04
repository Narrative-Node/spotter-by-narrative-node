/*
 * Spotter by Narrative Node: real waveforms and lengths, read from the files.
 * Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
 *
 * Two kinds of reading, both done a few at a time and kept on disk
 * (waveforms.json in Spotter's data folder) keyed by path, size and date:
 * - peaks: the whole file decoded once, for the views that draw waveforms;
 * - length only: just the header, for the cards without waveforms, which is
 *   far cheaper on a big library.
 */
(function (root) {
  "use strict";

  const PEAK_COUNT = 240;
  const DECODE_AT_ONCE = 2;
  const PROBE_AT_ONCE = 4;

  function encode(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function decode(text) {
    const s = atob(text);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  /** A small work queue: `soon` items jump ahead, and work for items no longer wanted can be dropped. */
  class Queue {
    constructor(limit, work) {
      this.limit = limit;
      this.work = work;
      this.items = [];
      this.keys = new Set();
      this.running = 0;
    }

    add(key, item, soon) {
      if (this.keys.has(key)) {
        if (soon) {
          const at = this.items.findIndex((x) => x.key === key);
          if (at > 0) this.items.unshift(this.items.splice(at, 1)[0]);
        }
        return;
      }
      this.keys.add(key);
      if (soon) this.items.unshift({ key, item });
      else this.items.push({ key, item });
      this.pump();
    }

    keepOnly(wanted) {
      this.items = this.items.filter((x) => {
        const keep = wanted.has(x.key);
        if (!keep) this.keys.delete(x.key);
        return keep;
      });
    }

    pump() {
      while (this.running < this.limit && this.items.length > 0) {
        const { key, item } = this.items.shift();
        this.running++;
        Promise.resolve(this.work(item)).finally(() => {
          this.keys.delete(key);
          this.running--;
          this.pump();
        });
      }
    }
  }

  class Waveforms {
    constructor(env, onReady) {
      this.env = env;
      this.onReady = onReady;
      this.entries = new Map(); // key -> { peaks, duration, failed, lengthOnly }
      this.decodes = new Queue(DECODE_AT_ONCE, (file) => this.read(file));
      this.probes = new Queue(PROBE_AT_ONCE, (file) => this.probe(file));
      this.saveTimer = 0;
    }

    async load() {
      const stored = await this.env.loadJson("waveforms.json", {});
      for (const [key, v] of Object.entries(stored)) {
        this.entries.set(key, { peaks: v.p ? decode(v.p) : null, duration: v.d, failed: !!v.f, lengthOnly: !!v.l });
      }
    }

    key(file) {
      return `${file.path}|${file.size}|${Math.round(file.mtimeMs)}`;
    }

    get(file) {
      return this.entries.get(this.key(file));
    }

    /** Asks for a file's peaks (and length). `soon` puts it at the front: it is on screen or about to play. */
    request(file, soon) {
      const key = this.key(file);
      const have = this.entries.get(key);
      if (have && !have.lengthOnly) return;
      if (!root.SpotterCore.isPlayable(file.name)) {
        this.entries.set(key, { peaks: null, duration: NaN, failed: true, unplayable: true });
        return;
      }
      this.decodes.add(key, file, soon);
    }

    /** Asks only for a file's length. */
    requestLength(file) {
      const key = this.key(file);
      if (this.entries.has(key) || !root.SpotterCore.isPlayable(file.name)) return;
      this.probes.add(key, file, true);
    }

    /** Drops queued work for files no longer on screen, keeping what is. */
    keepOnly(files) {
      const wanted = new Set(files.map((f) => this.key(f)));
      this.decodes.keepOnly(wanted);
      this.probes.keepOnly(wanted);
    }

    async read(file) {
      const key = this.key(file);
      let entry;
      try {
        const result = await this.env.decode(file, PEAK_COUNT);
        entry = { peaks: result.peaks, duration: result.duration, failed: !result.peaks };
      } catch (e) {
        entry = { peaks: null, duration: NaN, failed: true };
      }
      this.entries.set(key, entry);
      this.scheduleSave();
      this.onReady(file);
    }

    async probe(file) {
      const key = this.key(file);
      let duration = NaN;
      try { duration = await this.env.probeDuration(file); } catch (e) { /* stays unknown */ }
      if (!this.entries.has(key)) this.entries.set(key, { peaks: null, duration, failed: false, lengthOnly: true });
      this.scheduleSave();
      this.onReady(file);
    }

    scheduleSave() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        const out = {};
        for (const [key, e] of this.entries) {
          if (e.unplayable) continue;
          if (e.peaks) out[key] = { p: encode(e.peaks), d: e.duration };
          else if (e.lengthOnly) out[key] = { l: 1, d: e.duration };
          else out[key] = { f: 1, d: e.duration };
        }
        this.env.saveJson("waveforms.json", out).catch(() => {});
      }, 2000);
    }
  }

  function bar(g, x, y, w, h, round) {
    if (round && h > w && g.roundRect) {
      g.beginPath();
      g.roundRect(x, y, w, h, w / 2);
      g.fill();
    } else g.fillRect(x, y, w, h);
  }

  function fallbackPeaks(seed, count) {
    let hash = 0;
    const str = String(seed || "spotter");
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const norm = (i - (count - 1) / 2) / Math.max(1, (count - 1) / 2); // -1 to 1
      const env = Math.max(0.18, 1 - Math.pow(norm, 2)); // bell shape like screenshot
      const noise = Math.abs(Math.sin((hash + i * 19.7) * 0.45));
      out[i] = Math.floor((0.35 + 0.65 * noise) * env * 225);
    }
    return out;
  }

  /**
   * Draws peaks as bars mirrored about the middle: `played` up to `progress`
   * (0 to 1), `ahead` after. Options for the player: `round` caps, `hover` (0 to
   * 1, where the pointer is) lightens the bars it would skip to, `playhead`
   * draws the line, `baseline` a hairline through the middle.
   * In card view (`card: true`): centers a stylized cluster of rounded bars,
   * uses fallbackPeaks if not decoded, and animates when playing (`animated: true`).
   */
  function drawWave(canvas, peaks, progress, opts) {
    const o = Object.assign({
      bar: 2, gap: 1, played: "#29757d", ahead: "#5c5c5c", empty: "#3a3a3a",
      minBar: 2, round: false, hover: null, hoverColor: "#a9c8cb", playhead: false,
      baseline: false, card: false, seed: "", animated: false, animTime: 0,
    }, opts || {});
    const ratio = root.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    const g = canvas.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    const mid = height / 2;

    const step = o.bar + o.gap;
    let bars;
    let startX = 0;
    if (o.card) {
      const maxBars = 22;
      bars = Math.min(maxBars, Math.max(12, Math.floor((width - 24) / step)));
      const clusterW = bars * step - o.gap;
      startX = Math.max(0, Math.round((width - clusterW) / 2));
    } else {
      bars = Math.max(1, Math.floor((width + o.gap) / step));
    }

    const data = peaks || (o.card ? fallbackPeaks(o.seed, bars) : null);
    if (!data) {
      g.fillStyle = o.empty;
      g.fillRect(0, Math.round(mid) - 0.5, width, 1);
      return;
    }

    if (o.baseline) {
      g.fillStyle = "#2e2e2e";
      g.fillRect(0, Math.round(mid) - 0.5, width, 1);
    }

    const playedUpTo = progress * width;
    const hoverAt = o.hover === null ? null : o.hover * width;
    const anim = o.animated ? o.animTime || 0 : 0;

    for (let i = 0; i < bars; i++) {
      const from = Math.floor((i / bars) * data.length);
      const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * data.length));
      let peak = 0;
      for (let j = from; j < to; j++) if (data[j] > peak) peak = data[j];

      let h = Math.max(o.minBar, (peak / 255) * (height - 4) * (o.card ? 0.5 : 1)); // card waveforms are drawn at half height
      if (o.animated) {
        // Equalizer wave bounce
        const wave = Math.sin(anim * 7 + i * 0.48) * 0.38 + Math.cos(anim * 11 + i * 0.85) * 0.22;
        const mod = Math.max(0.25, Math.min(1.5, 1 + wave));
        h = Math.max(o.minBar, h * mod);
      }

      const x = startX + i * step;
      const centre = x + o.bar / 2;
      let color;
      if (o.card) {
        color = (o.animated || centre <= playedUpTo) ? o.played : o.ahead;
      } else {
        color = centre <= playedUpTo ? o.played : o.ahead;
        if (hoverAt !== null && centre > playedUpTo && centre <= hoverAt) color = o.hoverColor;
      }

      g.fillStyle = color;
      bar(g, x, mid - h / 2, o.bar, h, o.round);
    }

    if (o.playhead && progress > 0) {
      g.fillStyle = "#f0f7fa";
      g.fillRect(Math.min(width - 2, Math.round(playedUpTo)), 0, 2, height);
    }
  }

  root.SpotterWave = { Waveforms, drawWave, PEAK_COUNT };
})(typeof globalThis !== "undefined" ? globalThis : this);
