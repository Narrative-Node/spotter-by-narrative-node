// Spotter's logic without the panel: node --test spotter/test
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../extension/js/core.js");

/** A pretend file system: a nested object of folders, arrays of file names. */
function fakeEnv(tree) {
  const lookup = (p) => p.split("/").filter(Boolean).reduce((node, part) => (node && !Array.isArray(node) ? node[part] : undefined), tree);
  return {
    basename: (p) => p.split("/").filter(Boolean).pop(),
    join: (a, b) => `${a}/${b}`,
    async listDir(p) {
      const node = lookup(p);
      if (node === undefined) throw Object.assign(new Error("gone"), { code: "ENOENT" });
      if (Array.isArray(node)) return node.map((name) => (typeof name === "string" ? { name, isDir: false, size: 10, mtimeMs: 1 } : { name: name.dir, isDir: true }));
      return Object.keys(node).map((name) => ({ name, isDir: true }));
    },
  };
}

test("scans audio only, skips hidden files and empty folders, counts everything below", async () => {
  const env = fakeEnv({ lib: { Music: { Calm: ["b.wav", "a.mp3", "._a.mp3", "notes.txt"], Empty: [], Loud: ["x.aif"] } } });
  const tree = await C.scanFolder(env, "/lib/Music");
  assert.equal(tree.count, 3);
  assert.deepEqual(tree.folders.map((f) => f.name), ["Calm", "Loud"]);
  assert.deepEqual(tree.folders[0].files.map((f) => f.name), ["a.mp3", "b.wav"]);
});

test("a folder that is gone is marked, not thrown", async () => {
  const tree = await C.scanFolder(fakeEnv({}), "/nowhere");
  assert.equal(tree.error, "missing");
  assert.equal(tree.count, 0);
});

test("numbers sort as numbers", async () => {
  const env = fakeEnv({ s: ["Hit 10.wav", "Hit 2.wav", "Hit 1.wav"] });
  const tree = await C.scanFolder(env, "/s");
  assert.deepEqual(tree.files.map((f) => f.name), ["Hit 1.wav", "Hit 2.wav", "Hit 10.wav"]);
});

test("imports mirror the folders under the section's bins", () => {
  assert.deepEqual(C.binPathFor("music", "D:\\Music", "D:\\Music\\Wedding\\Upbeat\\song.wav"), ["Music", "Wedding", "Upbeat"]);
  assert.deepEqual(C.binPathFor("sfx", "/Volumes/SFX", "/Volumes/SFX/Whoosh.wav"), ["Assets", "SFX"]);
  assert.deepEqual(C.binPathFor("sfx", "E:/sfx", "E:\\SFX\\Foley\\step.wav"), ["Assets", "SFX", "Foley"], "case and slashes do not matter");
  assert.deepEqual(C.binPathFor("music", "D:\\Music", "C:\\Elsewhere\\song.wav"), ["Music"], "a file outside the folder goes to the section's bin");
});

test("collected files carry the folder they sit in", async () => {
  const env = fakeEnv({ m: { A: { B: ["x.wav"] }, C: ["y.wav"] } });
  const files = C.collectFiles(await C.scanFolder(env, "/m"));
  assert.deepEqual(files.map((f) => [f.name, f.folder]), [["x.wav", "A › B"], ["y.wav", "C"]]);
});

test("search needs every word, in the name or the folder", () => {
  const file = { name: "Whoosh Air Fast.wav", folder: "Transitions" };
  assert.ok(C.matches(file, "air whoosh"));
  assert.ok(C.matches(file, "transit fast"));
  assert.ok(!C.matches(file, "whoosh slow"));
  assert.ok(C.matches(file, "  "));
});

test("durations read like a timeline", () => {
  assert.equal(C.formatDuration(7.4), "0:07");
  assert.equal(C.formatDuration(225), "3:45");
  assert.equal(C.formatDuration(3729), "1:02:09");
  assert.equal(C.formatDuration(NaN), "–:––");
});

test("arrow keys move through the grid and stop at its edges", () => {
  assert.equal(C.stepSelection(-1, "ArrowRight", 3, 10), 0);
  assert.equal(C.stepSelection(4, "ArrowDown", 3, 10), 7);
  assert.equal(C.stepSelection(8, "ArrowDown", 3, 10), 9);
  assert.equal(C.stepSelection(1, "ArrowUp", 3, 10), 0);
  assert.equal(C.stepSelection(0, "ArrowLeft", 3, 10), 0);
  assert.equal(C.stepSelection(0, "ArrowDown", 3, 0), -1);
});

test("peaks follow the loudness and fill the range", () => {
  const ramp = new Float32Array(1000).map((_, i) => (i / 1000) * 0.5);
  const peaks = C.peaksFrom([ramp], 10);
  assert.equal(peaks.length, 10);
  assert.equal(peaks[9], 255, "normalised to the loudest slice");
  for (let i = 1; i < 10; i++) assert.ok(peaks[i] >= peaks[i - 1], "rising signal, rising peaks");
  assert.deepEqual([...C.peaksFrom([new Float32Array(0)], 4)], [0, 0, 0, 0]);
});

test("AIFF imports but does not preview", () => {
  assert.ok(C.isAudio("Take 1.aiff"));
  assert.ok(!C.isPlayable("Take 1.aiff"));
  assert.ok(C.isPlayable("Take 1.WAV"));
  assert.equal(C.formatLabel(".aiff"), "AIF");
});

test("folders match by parts, whatever the slashes", () => {
  assert.ok(C.isInside("D:/Sounds/SFX", "D:\\Sounds\\SFX\\Animals"), "picker slashes against Node's");
  assert.ok(C.isInside("D:\\Sounds\\SFX\\", "d:/sounds/sfx"));
  assert.ok(!C.isInside("D:/Sounds/SFX", "D:/Sounds/SFX Extra/a.wav"), "a longer name is not inside");
  assert.ok(!C.isInside("D:/Sounds/SFX/Animals", "D:/Sounds/SFX"));
});

test("versions compare as numbers", () => {
  assert.equal(C.compareVersions("1.10.0", "1.9.2"), 1);
  assert.equal(C.compareVersions("v1.0.0", "1.0"), 0);
  assert.equal(C.compareVersions("1.0.0", "1.0.1"), -1);
});

test("the version the update check uses is the manifest's", () => {
  const manifest = require("node:fs").readFileSync(require("node:path").join(__dirname, "../extension/CSXS/manifest.xml"), "utf8");
  assert.equal(/ExtensionBundleVersion="([^"]+)"/.exec(manifest)[1], C.VERSION);
});

test("the update feed keeps only well-formed, allowed items", () => {
  const feed = C.readFeed({
    latest: "1.2.0",
    url: "https://evil.example/download",
    notes: "  Faster\n waveforms  ",
    notices: [
      { id: "navigator", text: "Browse your footage too", label: "Try Navigator", url: "https://www.narrativenode.app/navigator" },
      { id: "bad id!", text: "dropped: the id has a space" },
      { id: "no-text", text: "   " },
      { id: "phish", text: "Link is off the list", url: "https://narrativenode.app.evil.example/x" },
    ],
  });
  assert.equal(feed.latest, "1.2.0");
  assert.equal(feed.url, "https://www.narrativenode.app/spotter", "an off-list link falls back to the Spotter page");
  assert.equal(feed.notes, "Faster waveforms");
  assert.deepEqual(feed.notices.map((n) => n.id), ["navigator", "phish"]);
  assert.equal(feed.notices[1].url, null, "a notice with an off-list link keeps its text and loses the button");
  assert.equal(C.readFeed(null).latest, null);
  assert.equal(C.readFeed({ latest: "banana" }).latest, null);
});

test("the bar shows a newer version first, then the first live notice, and dismissing hides only that item", () => {
  const feed = C.readFeed({
    latest: "1.1.0",
    notes: "Card size slider",
    notices: [
      { id: "old", text: "Ended", until: "2026-01-01" },
      { id: "navigator", text: "Try Navigator", url: "https://www.narrativenode.app/navigator" },
      { id: "next", text: "A new plugin is coming" },
    ],
  });
  const now = Date.parse("2026-10-05");
  const pick = (dismissed, version = "1.0.0") => C.pickNotice(feed, { version, dismissed, now });
  assert.equal(pick([]).id, "update-1.1.0");
  assert.equal(pick([]).text, "Spotter 1.1.0 is available: Card size slider");
  assert.equal(pick(["update-1.1.0"]).id, "navigator", "the expired notice is skipped");
  assert.equal(pick(["update-1.1.0", "navigator"]).id, "next");
  assert.equal(pick(["update-1.1.0", "navigator", "next"]), null);
  assert.equal(pick([], "1.1.0").id, "navigator", "no update bar once you are current");
  assert.equal(C.pickNotice(null, { version: "1.0.0", dismissed: [], now }), null);
});
