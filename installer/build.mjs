// Spotter by Narrative Node: builds the installers.
// Copyright (C) 2026 Narrative Node. GPL-3.0-or-later; see LICENSE.
//
//   node installer/build.mjs      Windows → release/Spotter-Setup-<v>.exe
//                                 macOS   → release/Spotter-<v>.pkg
//                                 both    → release/Spotter-<v>.zxp (for ZXP installers)
//
// The extension is ZXP-signed first. CEP loads a signed extension without the
// PlayerDebugMode setting, and a self-signed certificate is enough for that;
// one is made on the fly unless SPOTTER_P12 and SPOTTER_P12_PASSWORD name your
// own. Adobe advises signing on the platform the package is for, which this
// does by building each installer on its own platform.
//
// Optional installer signing, as in Navigator: WINDOWS_SIGN_ARGS (signtool
// arguments) on Windows; MAC_INSTALLER_IDENTITY and MAC_NOTARY_PROFILE on macOS.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, "build");
const release = join(root, "release");
const windows = process.platform === "win32";
const mac = process.platform === "darwin";
if (!windows && !mac) throw new Error("Build the installers on Windows or macOS.");

const ID = "com.narrativenode.spotter";
const manifest = readFileSync(join(root, "extension/CSXS/manifest.xml"), "utf8");
const version = /ExtensionBundleVersion="([^"]+)"/.exec(manifest)[1];

// Adobe's signing tool, fetched once and checked, never committed.
const SIGNER = windows
  ? { url: "https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/ZXPSignCMD/4.1.3/x64/ZXPSignCmd.exe", sha256: "ffc2223167225ce61d024eb463fc5ad1a1be16133f99ef334a646f7311916c98", file: "ZXPSignCmd.exe" }
  : { url: "https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/ZXPSignCMD/4.1.3/macOS/ZXPSignCmd", sha256: "bc773fae0b97416fc7a462e7dadcc00270428a9913480c9b78b5606ff1cfb095", file: "ZXPSignCmd" };

rmSync(join(build, "stage"), { recursive: true, force: true });
rmSync(join(build, "signed"), { recursive: true, force: true });
mkdirSync(release, { recursive: true });

const stage = join(build, "stage", ID);
const signed = join(build, "signed", ID);
const zxp = join(release, `Spotter-${version}.zxp`);

step("copy the extension", () => {
  // Development-only files stay behind: .debug opens a debug port.
  cpSync(join(root, "extension"), stage, { recursive: true, filter: (src) => !/[\\/]\.debug$|\.DS_Store$/.test(src) });
  // GPL-3.0 travels with every copy.
  copyFileSync(join(root, "LICENSE"), join(stage, "LICENSE.txt"));
});

const signer = await stepAsync("ZXP signing tool", ensureSigner);

step("sign the extension (.zxp)", () => {
  let p12 = process.env.SPOTTER_P12;
  let password = process.env.SPOTTER_P12_PASSWORD;
  if (!p12) {
    p12 = join(build, "self-signed.p12");
    password = randomBytes(12).toString("hex");
    rmSync(p12, { force: true });
    run(signer, ["-selfSignedCert", "LK", "Western", "Narrative Node", "Spotter by Narrative Node", password, p12, "-validityDays", "3650"]);
  }
  rmSync(zxp, { force: true });
  run(signer, ["-sign", stage, zxp, p12, password, "-tsa", "http://timestamp.digicert.com"]);
  run(signer, ["-verify", zxp]);
});

step("unpack the signed extension", () => {
  // A .zxp is a zip; the installers copy its contents, signature and all.
  mkdirSync(signed, { recursive: true });
  run(windows ? join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe") : "tar", ["-xf", zxp, "-C", signed]);
});

if (windows) step("Windows installer", buildWindows);
else step("macOS package", buildMac);

/* ------------------------------------------------------------------ steps */

async function ensureSigner() {
  const path = join(build, "tools", SIGNER.file);
  if (!existsSync(path) || sha256(path) !== SIGNER.sha256) {
    mkdirSync(dirname(path), { recursive: true });
    const res = await fetch(SIGNER.url);
    if (!res.ok) throw new Error(`Could not download ZXPSignCmd (HTTP ${res.status}).`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    if (sha256(path) !== SIGNER.sha256) throw new Error("The downloaded ZXPSignCmd does not match its checksum; not using it.");
    if (!windows) chmodSync(path, 0o755);
  }
  return path;
}

function systemTar() {
  return windows ? join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe") : "tar";
}

function buildWindows() {
  const iscc = findIscc();
  if (!iscc) throw new Error("Inno Setup 6 is not installed (winget install JRSoftware.InnoSetup).");
  const defines = [`/DVersion=${version}`, `/DSource=${signed}`, `/DOutDir=${release}`];
  const signArgs = process.env.WINDOWS_SIGN_ARGS;
  const signtool = findSigntool();
  if (signArgs && signtool) {
    // Inno splits its sign command at spaces, so the real command goes in a one-line script.
    const wrapper = join(tmpdir(), "spotter-sign.cmd");
    writeFileSync(wrapper, `@echo off\r\n"${signtool}" sign ${signArgs} %1\r\n`);
    defines.push("/DSIGN", `/Ssigntool=${wrapper} $f`);
  }
  run(iscc, [...defines, join(root, "installer/windows/spotter.iss")]);
  const exeName = `Spotter-Setup-${version}.exe`;
  const zipName = `Spotter-Setup-${version}-windows.zip`;
  const exePath = join(release, exeName);
  const zipPath = join(release, zipName);
  rmSync(zipPath, { force: true });
  run(systemTar(), ["-a", "-cf", zipPath, "-C", release, exeName]);
  console.log(`\n  → ${exePath}${signArgs ? "" : "  (installer not code-signed)"}`);
  console.log(`  → ${zipPath}`);
  console.log(`  → ${zxp}`);
}

function buildMac() {
  const payload = join(build, "payload");
  rmSync(payload, { recursive: true, force: true });
  const target = join(payload, "Library/Application Support/Adobe/CEP/extensions", ID);
  cpSync(signed, target, { recursive: true });
  const macDir = join(root, "installer/macos");
  const scripts = join(macDir, "scripts");
  for (const name of readdirSync(scripts)) chmodSync(join(scripts, name), 0o755);
  const component = join(build, "component.pkg");
  run("pkgbuild", ["--root", payload, "--scripts", scripts, "--identifier", ID, "--version", version, "--install-location", "/", component]);
  const pkg = join(release, `Spotter-${version}.pkg`);
  const identity = process.env.MAC_INSTALLER_IDENTITY;
  const distFile = join(macDir, "distribution.xml");
  if (existsSync(distFile)) {
    const distribution = join(build, "distribution.xml");
    writeFileSync(distribution, readFileSync(distFile, "utf8").replaceAll("{{VERSION}}", version));
    run("productbuild", ["--distribution", distribution, "--resources", join(macDir, "resources"), "--package-path", build, ...(identity ? ["--sign", identity] : []), pkg]);
  } else {
    run("productbuild", ["--package", component, ...(identity ? ["--sign", identity] : []), pkg]);
  }
  if (identity && process.env.MAC_NOTARY_PROFILE) {
    run("xcrun", ["notarytool", "submit", pkg, "--keychain-profile", process.env.MAC_NOTARY_PROFILE, "--wait"]);
    run("xcrun", ["stapler", "staple", pkg]);
  }
  console.log(`\n  → ${pkg}${identity ? "" : "  (not signed or notarised: Gatekeeper will ask before opening it)"}`);
  console.log(`  → ${zxp}`);
}

/* ---------------------------------------------------------------- helpers */

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function findIscc() {
  const candidates = [
    join(process.env["ProgramFiles(x86)"] ?? "C:/Program Files (x86)", "Inno Setup 6/ISCC.exe"),
    join(process.env.ProgramFiles ?? "C:/Program Files", "Inno Setup 6/ISCC.exe"),
    join(process.env.LOCALAPPDATA ?? "", "Programs/Inno Setup 6/ISCC.exe"),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

function findSigntool() {
  const kits = "C:/Program Files (x86)/Windows Kits/10/bin";
  if (existsSync(kits)) {
    const versions = readdirSync(kits).filter((v) => /^10\./.test(v)).sort().reverse();
    const found = versions.map((v) => join(kits, v, "x64", "signtool.exe")).find((path) => existsSync(path));
    if (found) return found;
  }
  try {
    const where = execFileSync("where.exe", ["signtool.exe"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    if (where && existsSync(where)) return where;
  } catch {}
  return null;
}

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

function step(name, fn) {
  console.log(`\n▸ ${name}`);
  return fn();
}

async function stepAsync(name, fn) {
  console.log(`\n▸ ${name}`);
  return fn();
}
