/*
 * Spotter by Narrative Node: the panel.
 * Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
 *
 * Music and SFX folders in a sidebar, their sounds as cards (with or without
 * waveforms) or a list, a player along the bottom. Selecting a sound loads it; Auto-Play decides whether it
 * starts. Double-click imports, dragging places it, and imports land in bins
 * that mirror the folders. Nothing reaches the project until the editor asks.
 */
(function (root) {
  "use strict";

  const C = root.SpotterCore;
  const W = root.SpotterWave;
  const env = root.SpotterEnv;
  const $ = (id) => document.getElementById(id);

  const el = {
    tree: $("tree"), autoplay: $("autoplay"), rescan: $("rescan"), promo: $("promo"),
    title: $("title"), count: $("count"), search: $("search"), viewTiles: $("view-tiles"), viewCards: $("view-cards"), viewList: $("view-list"),
    update: $("update"), updateText: $("update-text"), updateGet: $("update-get"), updateClose: $("update-close"),
    results: $("results"), sizer: $("sizer"), empty: $("empty"), status: $("status"),
    play: $("play"), nowName: $("now-name"), nowMeta: $("now-meta"), wave: $("player-wave"), time: $("time"),
    volume: $("volume"), mute: $("mute"), size: $("size"), menu: $("menu"), audio: $("audio"),
  };

  const ICON = {
    play: '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5v9l7-4.5z"/></svg><svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5h2v9H5zM9 3.5h2v9H9z"/></svg>',
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
    cross: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    caret: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5"/></svg>',
  };

  /* ------------------------------------------------------------ settings */

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(`spotter.${key}`);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(`spotter.${key}`, JSON.stringify(value)); } catch (e) { /* settings are a convenience */ }
    },
  };

  const state = {
    folders: Object.assign({ music: [], sfx: [] }, store.get("folders", {})),
    trees: { music: [], sfx: [] },
    expanded: new Set(store.get("expanded", [])),
    target: store.get("target", null), // { section, path } — path null means the whole section
    // "cards" (with waveforms, the default), "tiles" (compact) or "list".
    view: store.get("layout", "cards"),
    size: store.get("size", 30), // card size, 0 to 100, one slider for every view
    autoplay: store.get("autoplay", false),
    volume: store.get("volume", 0.8),
    query: "",
    scanning: false,
    all: [],
    files: [],
    selected: -1,
    loaded: null,
    playing: false,
    wantPlay: false,
    triedBlob: false,
    hover: null, // where the pointer is over the player's waveform, 0 to 1
  };

  const waves = new W.Waveforms(env, onWaveReady);

  /* ------------------------------------------------------------ folders */

  /** "a Music folder", "an SFX folder" (said ess-eff-ex). */
  function aFolder(section) {
    return section === "sfx" ? "an SFX folder" : "a Music folder";
  }

  async function scanAll() {
    state.scanning = true;
    el.rescan.classList.add("is-busy");
    el.rescan.querySelector("span").textContent = "Reading folders…";
    renderHeading();
    for (const section of C.SECTIONS) {
      state.trees[section] = await Promise.all(state.folders[section].map((p) => C.scanFolder(env, p)));
    }
    state.scanning = false;
    el.rescan.classList.remove("is-busy");
    el.rescan.querySelector("span").textContent = "Rescan folders";
    if (!validTarget(state.target)) state.target = firstTarget();
    renderTree();
    refreshListing();
  }

  async function addFolder(section) {
    const label = C.SECTION_LABELS[section];
    const picked = env.pickFolder(`Choose ${aFolder(section)}`);
    if (!picked) return;
    if (state.folders[section].some((p) => C.samePath(p, picked))) {
      setTarget({ section, path: picked });
      return showStatus(`${env.basename(picked)} is already in ${label}.`);
    }
    state.folders[section].push(picked);
    store.set("folders", state.folders);
    state.trees[section].push(await C.scanFolder(env, picked));
    state.expanded.add(picked);
    store.set("expanded", [...state.expanded]);
    setTarget({ section, path: picked });
  }

  function removeFolder(section, path) {
    const i = state.folders[section].findIndex((p) => C.samePath(p, path));
    if (i < 0) return;
    state.folders[section].splice(i, 1);
    state.trees[section].splice(i, 1);
    store.set("folders", state.folders);
    if (state.target && state.target.section === section && state.target.path && C.isInside(path, state.target.path)) {
      state.target = { section, path: null };
    }
    if (!validTarget(state.target)) state.target = firstTarget();
    renderTree();
    refreshListing();
    showStatus(`Removed ${env.basename(path)} from Spotter. The folder itself is untouched.`);
  }

  function rootFor(section, path) {
    return state.trees[section].find((t) => C.isInside(t.path, path)) || null;
  }

  function validTarget(t) {
    if (!t || !C.SECTIONS.includes(t.section)) return false;
    if (!t.path) return true;
    const tree = rootFor(t.section, t.path);
    return !!tree && (tree.error || !!C.findFolder(tree, t.path));
  }

  function firstTarget() {
    const section = C.SECTIONS.find((s) => state.folders[s].length > 0) || "music";
    return { section, path: null };
  }

  function setTarget(target) {
    state.target = target;
    store.set("target", target);
    renderTree();
    refreshListing();
  }

  /* ------------------------------------------------------------ sidebar */

  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children || []) if (child) node.appendChild(child);
    return node;
  }

  function renderTree() {
    const frag = document.createDocumentFragment();
    for (const section of C.SECTIONS) {
      const label = C.SECTION_LABELS[section];
      const trees = state.trees[section];
      const total = trees.reduce((sum, t) => sum + t.count, 0);
      const selected = state.target && state.target.section === section && !state.target.path;
      const box = h("div", { class: `section${selected ? " is-selected" : ""}` }, [
        h("div", { class: "section-head" }, [
          h("button", { class: "section-title", type: "button", text: label, title: `Every sound in ${label}`, onclick: () => setTarget({ section, path: null }) }),
          trees.length ? h("span", { class: "pill", text: C.formatCount(total) }) : null,
          trees.length ? h("button", { class: "icon-btn", type: "button", html: ICON.plus, title: `Add ${aFolder(section)}`, "aria-label": `Add ${aFolder(section)}`, onclick: () => addFolder(section) }) : null,
        ]),
      ]);
      if (trees.length === 0) {
        box.appendChild(h("button", { class: "add-line", type: "button", html: `${ICON.plus}<span>Add ${aFolder(section)}</span>`, onclick: () => addFolder(section) }));
      } else {
        const list = h("ul", { class: "tree", role: "tree" });
        for (const tree of trees) list.appendChild(folderRow(section, tree, 0, true));
        box.appendChild(list);
      }
      frag.appendChild(box);
    }
    el.tree.replaceChildren(frag);
  }

  function folderRow(section, node, depth, isRoot) {
    const open = state.expanded.has(node.path);
    const selected = state.target && state.target.section === section && state.target.path && C.samePath(state.target.path, node.path);
    const leaf = node.folders.length === 0;
    const row = h("div", {
      class: `row${selected ? " is-selected" : ""}${node.error ? " is-missing" : ""}`,
      style: `--depth:${depth}`,
      title: node.path,
      onclick: () => setTarget({ section, path: node.path }),
    }, [
      h("button", {
        class: `twisty${leaf ? " is-leaf" : ""}`, type: "button", html: ICON.caret, "aria-label": open ? "Collapse" : "Expand", "aria-expanded": String(open),
        onclick: (e) => {
          e.stopPropagation();
          if (open) state.expanded.delete(node.path);
          else state.expanded.add(node.path);
          store.set("expanded", [...state.expanded]);
          renderTree();
        },
      }),
      h("span", { class: "row-name", text: node.name }),
      node.error ? h("span", { class: "row-note", text: "Not found" }) : h("span", { class: "pill", text: C.formatCount(node.count) }),
      isRoot ? h("button", {
        class: "icon-btn remove", type: "button", html: ICON.cross, title: "Remove from Spotter (the folder is not deleted)", "aria-label": `Remove ${node.name} from Spotter`,
        onclick: (e) => { e.stopPropagation(); removeFolder(section, node.path); },
      }) : null,
    ]);
    const item = h("li", { role: "treeitem", "aria-expanded": leaf ? null : String(open), "aria-selected": String(!!selected) }, [row]);
    if (open && !leaf) {
      const children = h("ul", { class: "tree", role: "group" });
      for (const sub of node.folders) children.appendChild(folderRow(section, sub, depth + 1, false));
      item.appendChild(children);
    }
    return item;
  }

  /* ------------------------------------------------------------ listing */

  function currentListing() {
    const t = state.target;
    if (!t) return [];
    const tag = (files, tree) => files.map((f) => Object.assign(f, { section: t.section, root: tree.path }));
    if (!t.path) {
      const trees = state.trees[t.section];
      // With one folder in the section its name says nothing; with several it says which one.
      const prefix = (tree, f) => (trees.length === 1 ? f.folder : f.folder ? `${tree.name} › ${f.folder}` : tree.name);
      return trees.flatMap((tree) => tag(C.collectFiles(tree, tree.path).map((f) => Object.assign(f, { folder: prefix(tree, f) })), tree));
    }
    const tree = rootFor(t.section, t.path);
    const node = tree && C.findFolder(tree, t.path);
    return node ? tag(C.collectFiles(node, node.path), tree) : [];
  }

  function refreshListing() {
    state.all = currentListing();
    applyFilter(true);
  }

  function applyFilter(reset) {
    const keep = state.selected >= 0 ? state.files[state.selected] : null;
    state.files = state.query ? state.all.filter((f) => C.matches(f, state.query)) : state.all;
    state.selected = keep ? state.files.findIndex((f) => f.path === keep.path) : -1;
    if (reset) el.results.scrollTop = 0;
    clearItems();
    layout();
    paint();
    renderHeading();
    renderEmpty();
  }

  function targetName() {
    const t = state.target;
    if (!t) return "Spotter";
    if (!t.path) return C.SECTION_LABELS[t.section];
    return env.basename(t.path);
  }

  function renderHeading() {
    const hasAny = C.SECTIONS.some((s) => state.folders[s].length > 0);
    const nothing = !state.target || noFolder();
    el.title.textContent = hasAny ? targetName() : "Spotter";
    el.search.disabled = nothing && !state.scanning;
    el.viewTiles.disabled = el.viewCards.disabled = el.viewList.disabled = el.size.disabled = nothing;
    el.rescan.disabled = !hasAny;
    if (state.scanning) el.count.textContent = "Reading folders…";
    else if (!state.target || noFolder()) el.count.textContent = "";
    else if (state.query) el.count.textContent = `${C.formatCount(state.files.length)} of ${C.formatCount(state.all.length)}`;
    else el.count.textContent = `${C.formatCount(state.all.length)} ${state.all.length === 1 ? "sound" : "sounds"}`;
  }

  /** The section has no folders, or the chosen folder's drive is gone. */
  function noFolder() {
    const t = state.target;
    if (state.folders[t.section].length === 0) return true;
    const tree = t.path && rootFor(t.section, t.path);
    return !!(tree && tree.error);
  }

  function renderEmpty() {
    const t = state.target;
    let content = null;
    const hasAny = C.SECTIONS.some((s) => state.folders[s].length > 0);
    const add = (section) => h("button", { class: "btn", type: "button", html: `${ICON.plus}<span>Add ${aFolder(section)}</span>`, onclick: () => addFolder(section) });
    if (state.scanning && state.all.length === 0) content = null;
    else if (!hasAny) {
      content = [
        h("h2", { text: "Add your music and sound effects" }),
        h("p", { text: "Spotter browses folders you already have. Nothing is copied or moved, and nothing goes into your project until you import it." }),
        h("div", { class: "actions" }, [add("music"), add("sfx")]),
      ];
    } else if (t && state.folders[t.section].length === 0) {
      const label = C.SECTION_LABELS[t.section];
      content = [h("h2", { text: `No ${label} folders yet` }), h("p", { text: `Add a folder and its sounds appear here, with their subfolders in the sidebar.` }), h("div", { class: "actions" }, [add(t.section)])];
    } else if (t && t.path && rootFor(t.section, t.path) && rootFor(t.section, t.path).error) {
      const tree = rootFor(t.section, t.path);
      content = [
        h("h2", { text: `${targetName()} isn’t available` }),
        h("p", { text: "The folder was moved or renamed, or its drive is disconnected. Reconnect it and rescan, or remove it from Spotter. The folder itself is never deleted." }),
        h("div", { class: "actions" }, [
          h("button", { class: "btn", type: "button", text: "Rescan folders", onclick: () => { if (!state.scanning) scanAll(); } }),
          h("button", { class: "btn", type: "button", text: "Remove from Spotter", onclick: () => removeFolder(t.section, tree.path) }),
        ]),
      ];
    } else if (state.query && state.files.length === 0) {
      content = [
        h("h2", { text: `Nothing matches “${state.query}”` }),
        h("p", { text: `Spotter searched the names and folders in ${targetName()}.` }),
        h("div", { class: "actions" }, [h("button", { class: "btn", type: "button", text: "Clear search", onclick: clearSearch })]),
      ];
    } else if (state.all.length === 0) {
      content = [h("h2", { text: `No audio in ${targetName()}` }), h("p", { text: "Spotter lists WAV, MP3, AIFF, M4A and AAC files, the audio Premiere imports." })];
    }
    el.empty.hidden = !content;
    el.results.hidden = !!content;
    el.empty.replaceChildren(...(content || []));
  }

  function clearSearch() {
    el.search.value = "";
    state.query = "";
    applyFilter(true);
    el.search.focus();
  }

  /* ------------------------------------------------------------ results grid */

  const grid = { cols: 1, cellW: 0, rowH: 32, pad: 0, gap: 0, items: new Map() };
  const BASE = { cards: { min: 160, height: 132, gap: 10 }, tiles: { min: 200, height: 58, gap: 8 }, list: { min: 0, height: 34, gap: 0 } };

  /** What the size slider's value (0 to 100) makes of a view: a card's least width and its height, or a row's height. */
  function sizes(view, value) {
    const base = BASE[view];
    const wide = 0.7 + value / 100;
    const tall = 0.8 + value / 150;
    return { min: Math.round(base.min * wide), height: Math.round(base.height * tall), gap: base.gap };
  }

  function layout() {
    const width = el.results.clientWidth;
    const size = sizes(state.view, state.size);
    el.results.style.setProperty("--item-h", `${size.height}px`);
    if (state.view !== "list") {
      grid.pad = 12;
      grid.gap = size.gap;
      const inner = width - grid.pad * 2;
      grid.cols = Math.max(1, Math.floor((inner + grid.gap) / (size.min + grid.gap)));
      grid.cellW = (inner - grid.gap * (grid.cols - 1)) / grid.cols;
      grid.rowH = size.height + grid.gap;
    } else {
      grid.pad = 0;
      grid.gap = 0;
      grid.cols = 1;
      grid.cellW = width;
      grid.rowH = size.height;
    }
    const rows = Math.ceil(state.files.length / grid.cols);
    el.sizer.style.height = `${rows ? rows * grid.rowH - grid.gap + grid.pad * 2 : 0}px`;
  }

  function clearItems() {
    for (const node of grid.items.values()) node.remove();
    grid.items.clear();
  }

  function paint() {
    const top = el.results.scrollTop;
    const height = el.results.clientHeight;
    const firstRow = Math.max(0, Math.floor((top - grid.pad) / grid.rowH) - 1);
    const lastRow = Math.ceil((top + height) / grid.rowH) + 1;
    const first = firstRow * grid.cols;
    const last = Math.min(state.files.length, (lastRow + 1) * grid.cols);
    for (const [i, node] of grid.items) {
      if (i < first || i >= last) { node.remove(); grid.items.delete(i); }
    }
    const visible = [];
    for (let i = first; i < last; i++) {
      const file = state.files[i];
      visible.push(file);
      if (!grid.items.has(i)) {
        const node = makeItem(i, file);
        grid.items.set(i, node);
        el.results.appendChild(node);
      }
      // The cards without waveforms only need each file's length, read from its header.
      if (state.view === "tiles") waves.requestLength(file);
      else waves.request(file, true);
    }
    waves.keepOnly(visible);
    for (const [i, node] of grid.items) drawItem(node, state.files[i]);
  }

  function place(node, i) {
    const row = Math.floor(i / grid.cols);
    const col = i % grid.cols;
    node.style.top = `${grid.pad + row * grid.rowH}px`;
    node.style.left = `${grid.pad + col * (grid.cellW + grid.gap)}px`;
    node.style.width = `${grid.cellW}px`;
  }

  function makeItem(i, file) {
    const cards = state.view === "cards";
    const tiles = state.view === "tiles";
    const node = h("div", { class: `item ${tiles ? "tile" : cards ? "card" : "row-item"}`, role: "option", draggable: "true", "data-index": String(i), title: file.path });
    const mute = C.isPlayable(file.name) ? "" : " is-mute";
    const button = h("button", { class: `mini-play${mute}`, type: "button", html: ICON.play, "aria-label": `Play ${C.displayName(file.name)}`, tabindex: "-1" });
    const name = h("span", { class: "name", text: C.displayName(file.name) });
    const duration = h("span", { class: "duration" });
    const folder = h("span", { class: "folder", text: file.folder || "" });
    const fmt = h("span", { class: "fmt", text: C.formatLabel(file.ext) });
    const canvas = h("canvas", { "aria-hidden": "true" });
    if (tiles) {
      node.append(button, name, h("span", { class: "meta" }, [duration, folder, fmt]), h("span", { class: "progress", "aria-hidden": "true" }));
    } else if (cards) {
      node.append(h("div", { class: "wave-box" }, [canvas]), h("div", { class: "info" }, [h("div", { class: "name-row" }, [button, name]), h("span", { class: "meta" }, [duration, folder, fmt])]));
    } else {
      // List view: name takes the full middle space, no empty folder column gap
      node.append(button, name, canvas, duration, fmt);
    }
    place(node, i);
    return node;
  }

  function progressOf(file) {
    if (!state.loaded || state.loaded.path !== file.path) return 0;
    const d = el.audio.duration;
    return Number.isFinite(d) && d > 0 ? el.audio.currentTime / d : 0;
  }

  function drawItem(node, file) {
    const entry = waves.get(file);
    const selected = state.files[state.selected] === file;
    const playing = state.playing && state.loaded && state.loaded.path === file.path;
    node.classList.toggle("is-selected", selected);
    node.classList.toggle("is-playing", !!playing);
    node.setAttribute("aria-selected", String(selected));
    node.querySelector(".duration").textContent = C.formatDuration(entry ? entry.duration : NaN);
    drawProgress(node, file, entry);
  }

  /** The card's own playback: its waveform animates, or on a card without one, a line along its foot. */
  function drawProgress(node, file, entry) {
    const progress = progressOf(file);
    const line = node.querySelector(".progress");
    const isPlaying = state.playing && state.loaded && state.loaded.path === file.path;
    if (line) line.style.width = `${(progress * 100).toFixed(2)}%`;
    const canvas = node.querySelector("canvas");
    if (canvas) {
      const isCard = node.classList.contains("card");
      W.drawWave(canvas, entry && entry.peaks, progress, {
        bar: isCard ? 3 : 2,
        gap: isCard ? 2 : 1,
        round: true,
        card: isCard,
        seed: file.name,
        minBar: 3,
        ahead: isCard ? "#363636" : "#4a4a4a",
        played: "#29757d",
        animated: isPlaying,
        animTime: performance.now() / 1000,
      });
    }
  }

  function itemNode(file) {
    for (const [i, node] of grid.items) if (state.files[i] === file) return node;
    return null;
  }

  function redrawItems() {
    for (const [i, node] of grid.items) drawItem(node, state.files[i]);
  }

  function onWaveReady(file) {
    for (const [i, node] of grid.items) if (state.files[i].path === file.path) drawItem(node, state.files[i]);
    if (state.loaded && state.loaded.path === file.path) { drawPlayer(); renderTime(); }
  }

  function scrollIntoView(i) {
    const row = Math.floor(i / grid.cols);
    const top = grid.pad + row * grid.rowH;
    const bottom = top + grid.rowH - grid.gap;
    const view = el.results;
    if (top < view.scrollTop) view.scrollTop = top - grid.pad;
    else if (bottom > view.scrollTop + view.clientHeight) view.scrollTop = bottom - view.clientHeight + grid.pad;
  }

  /* ------------------------------------------------------------ selection and playback */

  function select(i, play) {
    if (i < 0 || i >= state.files.length) return;
    state.selected = i;
    scrollIntoView(i);
    paint();
    load(state.files[i], play === undefined ? state.autoplay : play);
  }

  function load(file, play) {
    if (state.loaded && state.loaded.path === file.path) {
      if (play) start();
      return;
    }
    el.audio.pause();
    state.loaded = file;
    state.playing = false;
    state.wantPlay = false;
    state.triedBlob = false;
    if (C.isPlayable(file.name)) el.audio.src = env.fileUrl(file.path);
    else el.audio.removeAttribute("src");
    el.nowName.textContent = C.displayName(file.name);
    el.nowName.title = file.path;
    el.nowMeta.textContent = [C.SECTION_LABELS[file.section], file.folder].filter(Boolean).join(" › ");
    el.play.disabled = false;
    waves.request(file, true);
    renderPlayButton();
    drawPlayer();
    renderTime();
    if (play) start();
  }

  function start() {
    const file = state.loaded;
    if (!file) return;
    if (!C.isPlayable(file.name)) {
      showStatus(`The panel can’t play ${C.formatLabel(file.ext)} files. Double-click to import it into Premiere and listen there.`);
      return;
    }
    state.wantPlay = true;
    el.audio.play().catch(() => { /* the error event reports it */ });
  }

  function togglePlay() {
    if (!state.loaded) {
      if (state.files.length) select(Math.max(0, state.selected), true);
      return;
    }
    if (state.playing) {
      state.wantPlay = false;
      el.audio.pause();
    } else start();
  }

  function playItem(i) {
    const file = state.files[i];
    if (state.loaded && state.loaded.path === file.path) {
      state.selected = i;
      paint();
      togglePlay();
    } else select(i, true);
  }

  el.audio.addEventListener("play", () => { state.playing = true; renderPlayButton(); redrawItems(); tick(); });
  el.audio.addEventListener("pause", () => { state.playing = false; renderPlayButton(); redrawItems(); drawPlayer(); renderTime(); });
  el.audio.addEventListener("ended", () => { state.playing = false; state.wantPlay = false; renderPlayButton(); redrawItems(); drawPlayer(); renderTime(); });
  el.audio.addEventListener("loadedmetadata", renderTime);
  el.audio.addEventListener("error", async () => {
    const file = state.loaded;
    if (!file || !el.audio.getAttribute("src")) return;
    // Some network shares refuse a file URL; reading the file ourselves works on all of them.
    if (!state.triedBlob) {
      state.triedBlob = true;
      try {
        const data = await env.readFile(file.path);
        if (state.loaded !== file) return;
        el.audio.src = URL.createObjectURL(new Blob([data]));
        if (state.wantPlay) el.audio.play().catch(() => {});
        return;
      } catch (e) { /* fall through to the message */ }
    }
    showStatus(`Couldn’t play ${file.name}. The file may be damaged, or it is a kind of ${C.formatLabel(file.ext)} the panel can’t read.`, true);
  });

  let lastTimelineCheck = 0;
  let checkingTimeline = false;

  /** Checks if Premiere Pro timeline playback is active; if so, pauses Spotter's audio. */
  function checkTimelinePlayback() {
    if (!state.playing || checkingTimeline || !env.host) return;
    const now = Date.now();
    if (now - lastTimelineCheck < 130) return;
    lastTimelineCheck = now;
    checkingTimeline = true;
    env.host("spotterIsTimelinePlaying").then((res) => {
      checkingTimeline = false;
      if (res === "true" && state.playing) {
        state.wantPlay = false;
        el.audio.pause();
      }
    }).catch(() => {
      checkingTimeline = false;
    });
  }

  /** While a sound plays, the player and its card redraw each frame. Nothing else moves. */
  function tick() {
    if (!state.playing) return;
    drawPlayer();
    renderTime();
    const node = state.loaded && itemNode(state.files.find((f) => f.path === state.loaded.path));
    if (node) drawProgress(node, state.loaded, waves.get(state.loaded));
    checkTimelinePlayback();
    requestAnimationFrame(tick);
  }

  function renderPlayButton() {
    el.play.classList.toggle("is-playing", state.playing);
    el.play.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  }

  /** The player's waveform: rounded bars, a playhead, and the stretch the pointer would skip to, lighter. */
  function drawPlayer() {
    const entry = state.loaded && waves.get(state.loaded);
    W.drawWave(el.wave, entry && entry.peaks, state.loaded ? progressOf(state.loaded) : 0, {
      bar: 3, gap: 1, round: true, minBar: 2, ahead: "#444444", played: "#29757d", hoverColor: "#a9c8cb",
      hover: state.hover, playhead: true, baseline: true,
    });
  }

  function renderTime() {
    if (!state.loaded) { el.time.textContent = "0:00 / 0:00"; return; }
    const entry = waves.get(state.loaded);
    const total = Number.isFinite(el.audio.duration) ? el.audio.duration : entry ? entry.duration : NaN;
    el.time.textContent = `${C.formatDuration(el.audio.currentTime || 0)} / ${C.formatDuration(total)}`;
  }

  el.wave.addEventListener("mousemove", (e) => {
    if (!state.loaded) return;
    const box = el.wave.getBoundingClientRect();
    state.hover = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
    if (!state.playing) drawPlayer();
  });
  el.wave.addEventListener("mouseleave", () => {
    state.hover = null;
    if (!state.playing) drawPlayer();
  });

  el.wave.addEventListener("click", (e) => {
    const d = el.audio.duration;
    if (!state.loaded || !Number.isFinite(d) || d <= 0) return;
    const box = el.wave.getBoundingClientRect();
    el.audio.currentTime = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width)) * d;
    drawPlayer();
    renderTime();
    redrawItems();
  });

  /* ------------------------------------------------------------ into Premiere */

  function hostMessage(result) {
    if (result.startsWith("error:")) return result.slice(6).trim();
    return "Premiere didn’t answer. Make sure a project is open, then try again.";
  }

  async function importFile(file) {
    const bins = C.binPathFor(file.section, file.root, file.path);
    const result = await env.host("spotterImport", file.path, bins);
    if (result === "ok") showStatus(`Imported ${C.displayName(file.name)} into ${bins.join(" › ")}.`);
    else showStatus(hostMessage(result), true);
  }

  async function insertFile(file) {
    const bins = C.binPathFor(file.section, file.root, file.path);
    const result = await env.host("spotterInsert", file.path, bins);
    if (result === "ok") showStatus(`Placed ${C.displayName(file.name)} at the playhead.`);
    else showStatus(hostMessage(result), true);
  }

  el.play.addEventListener("click", togglePlay);

  /* ------------------------------------------------------------ results events */

  function indexFrom(event) {
    const node = event.target.closest(".item");
    return node ? Number(node.dataset.index) : -1;
  }

  // Clicking the sound that is loaded plays or pauses it. That waits a moment, so the
  // first click of a double-click (import) does not stop the sound being imported.
  let clickTimer = 0;
  el.results.addEventListener("click", (e) => {
    const i = indexFrom(e);
    if (i < 0 || e.detail > 1) return;
    const file = state.files[i];
    if (e.target.closest(".mini-play")) playItem(i);
    else if (state.loaded && state.loaded.path === file.path) {
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => playItem(i), 250);
    } else select(i);
  });

  el.results.addEventListener("dblclick", (e) => {
    clearTimeout(clickTimer);
    const i = indexFrom(e);
    if (i >= 0 && !e.target.closest(".mini-play")) importFile(state.files[i]);
  });

  el.results.addEventListener("dragstart", (e) => {
    const i = indexFrom(e);
    if (i < 0) return;
    const file = state.files[i];
    // CEP hands this to Premiere, which imports the file where it is dropped. One file key
    // only: with "com.adobe.cep.dnd.file.0" as well, Premiere imported the file twice.
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("com.adobe.cep.dnd.file", file.path);
    e.dataTransfer.setData("text/plain", file.path);
    e.target.closest(".item")._dragFile = file;
  });

  el.results.addEventListener("dragend", (e) => {
    const node = e.target.closest(".item");
    const file = node && node._dragFile;
    if (!file) return;
    node._dragFile = null;
    // A drop lands in the project root. Once Premiere has it, it moves to its bin; twice, for a slow import.
    const bins = C.binPathFor(file.section, file.root, file.path);
    for (const wait of [700, 2500]) setTimeout(() => env.host("spotterTidyDrop", file.path, bins), wait);
  });

  el.results.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const i = indexFrom(e);
    if (i < 0) return;
    if (state.selected !== i) select(i, false);
    openMenu(e.clientX, e.clientY, state.files[i]);
  });

  let scrollFrame = 0;
  el.results.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(paint);
    closeMenu();
  });

  new ResizeObserver(() => {
    layout();
    for (const [i, node] of grid.items) place(node, i);
    paint();
    drawPlayer();
  }).observe(el.results);

  /* ------------------------------------------------------------ context menu */

  function openMenu(x, y, file) {
    const loaded = state.loaded && state.loaded.path === file.path;
    const item = (label, hint, action, disabled) => h("button", { type: "button", role: "menuitem", disabled, onclick: () => { closeMenu(); action(); } }, [
      h("span", { text: label }), hint ? h("span", { class: "hint", text: hint }) : null,
    ]);
    el.menu.replaceChildren(
      item(loaded && state.playing ? "Pause" : "Play", "Enter", () => (loaded ? togglePlay() : load(file, true)), !C.isPlayable(file.name)),
      item("Import into project", "Double-click", () => importFile(file)),
      item("Insert at playhead", "", () => insertFile(file)),
      h("hr"),
      item(env.revealLabel, "", () => env.reveal(file.path)),
      item("Copy file path", "", () => copyText(file.path)),
    );
    el.menu.hidden = false;
    const box = el.menu.getBoundingClientRect();
    el.menu.style.left = `${Math.min(x, window.innerWidth - box.width - 4)}px`;
    el.menu.style.top = `${Math.min(y, window.innerHeight - box.height - 4)}px`;
    el.menu.querySelector("button:not(:disabled)").focus();
  }

  function closeMenu() {
    el.menu.hidden = true;
  }

  document.addEventListener("mousedown", (e) => { if (!el.menu.hidden && !el.menu.contains(e.target)) closeMenu(); });
  window.addEventListener("blur", closeMenu);

  function copyText(text) {
    const done = () => showStatus("Copied the file path.");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    const area = h("textarea", { style: "position:fixed;opacity:0" });
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    done();
  }

  /* ------------------------------------------------------------ keyboard */

  // Only these keys are claimed (env.registerKeys); everything else still goes to Premiere.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.menu.hidden) { closeMenu(); return; }
    if (e.target === el.search) {
      if (e.key === "ArrowDown" && state.files.length) { e.preventDefault(); el.results.focus(); select(Math.max(0, state.selected)); }
      return;
    }
    if (!el.menu.hidden) return;
    if ((e.code === "Space" || e.key === " ") && state.playing) {
      state.wantPlay = false;
      el.audio.pause();
    }
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const next = C.stepSelection(state.selected, e.key, grid.cols, state.files.length);
      if (next !== state.selected) select(next);
    } else if (e.key === "Enter" && state.files.length) {
      e.preventDefault();
      if (state.selected >= 0 && (!state.loaded || state.loaded.path !== state.files[state.selected].path)) select(state.selected, true);
      else togglePlay();
    }
  });

  /* ------------------------------------------------------------ toolbar and footer */

  let searchTimer = 0;
  el.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = el.search.value.trim();
      applyFilter(true);
    }, 120);
  });

  function renderViewButtons() {
    el.viewTiles.setAttribute("aria-pressed", String(state.view === "tiles"));
    el.viewCards.setAttribute("aria-pressed", String(state.view === "cards"));
    el.viewList.setAttribute("aria-pressed", String(state.view === "list"));
  }

  function setView(view) {
    state.view = view;
    store.set("layout", view);
    renderViewButtons();
    const keep = state.selected;
    clearItems();
    layout();
    paint();
    if (keep >= 0) scrollIntoView(keep);
  }

  el.viewTiles.addEventListener("click", () => setView("tiles"));
  el.viewCards.addEventListener("click", () => setView("cards"));
  el.viewList.addEventListener("click", () => setView("list"));

  function setAutoplay(on) {
    state.autoplay = on;
    store.set("autoplay", on);
    el.autoplay.setAttribute("aria-checked", String(on));
    el.autoplay.title = on ? "Auto-Play is on: a sound plays as soon as you select it" : "Auto-Play is off: select a sound, then press Play or Enter";
  }

  function setSize(value, save) {
    state.size = Math.max(0, Math.min(100, Number(value) || 0));
    el.size.value = String(state.size);
    el.size.style.setProperty("--level", `${state.size}%`);
    if (save) store.set("size", state.size);
    layout();
    for (const [i, node] of grid.items) place(node, i);
    paint();
  }

  el.size.addEventListener("input", () => setSize(el.size.value, true));
  el.autoplay.addEventListener("click", () => setAutoplay(!state.autoplay));
  el.rescan.addEventListener("click", () => { if (!state.scanning) scanAll(); });

  function setVolume(v) {
    state.volume = v;
    el.audio.volume = v;
    el.volume.value = String(v);
    el.volume.style.setProperty("--level", `${Math.round(v * 100)}%`);
  }

  el.mute.addEventListener("click", () => {
    el.audio.muted = !el.audio.muted;
    el.mute.setAttribute("aria-pressed", String(el.audio.muted));
    el.mute.title = el.audio.muted ? "Unmute" : "Mute";
  });

  el.volume.addEventListener("input", () => {
    setVolume(Number(el.volume.value));
    store.set("volume", state.volume);
  });

  el.promo.addEventListener("click", (e) => {
    e.preventDefault();
    const url = el.promo.getAttribute("data-href") || el.promo.href || "https://www.narrativenode.app/navigator";
    env.openUrl(url);
  });

  let statusTimer = 0;
  function showStatus(text, isError) {
    clearTimeout(statusTimer);
    el.status.textContent = text;
    el.status.classList.toggle("is-error", !!isError);
    el.status.hidden = false;
    layout();
    paint();
    statusTimer = setTimeout(() => { el.status.hidden = true; layout(); paint(); }, isError ? 9000 : 5000);
  }

  /* ------------------------------------------------------------ updates */

  /**
   * The bar above the toolbar: a newer Spotter, or a short notice about Navigator or a plugin on
   * its way, read from spotter.json in the updates repository. Checked at most every six hours;
   * the last answer is kept, so the bar shows at once on the next start. A failed check shows
   * nothing and tries again later. The close button hides that item for good.
   */
  async function checkUpdates() {
    if (!C.UPDATES_URL || !env.fetchJson) return;
    showNotice(store.get("notice.feed", null));
    if (Date.now() - store.get("notice.checked", 0) < 6 * 3600 * 1000) return;
    try {
      const body = await env.fetchJson(C.UPDATES_URL);
      if (!body) return;
      const feed = C.readFeed(body);
      store.set("notice.checked", Date.now());
      store.set("notice.feed", feed);
      showNotice(feed);
    } catch (e) { /* offline: try again next start */ }
  }

  function showNotice(feed) {
    const pick = feed && C.pickNotice(feed, { version: C.VERSION, dismissed: store.get("notice.dismissed", []), now: Date.now() });
    el.update.hidden = !pick;
    if (!pick) return;
    el.updateText.textContent = pick.text;
    el.updateGet.hidden = !pick.url;
    el.updateGet.textContent = pick.label;
    el.updateGet.onclick = () => env.openUrl(pick.url);
    el.updateClose.onclick = () => {
      store.set("notice.dismissed", [...store.get("notice.dismissed", []), pick.id].slice(-50));
      el.update.hidden = true;
    };
  }

  /* ------------------------------------------------------------ start */

  async function startUp() {
    env.registerKeys();
    setAutoplay(state.autoplay);
    setVolume(state.volume);
    if (!["tiles", "cards", "list"].includes(state.view)) state.view = "tiles";
    setSize(state.size, false);
    renderViewButtons();
    renderTree();
    renderEmpty();
    checkUpdates();
    await waves.load();
    await scanAll();
  }

  startUp();
})(typeof globalThis !== "undefined" ? globalThis : this);
