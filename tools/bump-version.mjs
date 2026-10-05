// Sets Spotter's version everywhere it is written, so a release is one command and one commit.
//   node tools/bump-version.mjs [patch|minor|major|<x.y.z>]
// Then: git commit -am "release: v1.0.3" && git tag -a v1.0.3 -m "Spotter 1.0.3" && git push origin dev --tags
// The release workflow stops if the tag and extension/CSXS/manifest.xml disagree.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Replaces every match of `pattern` in a file, and fails loudly when there is none. */
function replace(file, pattern, replacement, { base = root } = {}) {
  const path = join(base, file);
  const before = readFileSync(path, "utf8");
  if (!pattern.test(before)) throw new Error(`${file}: version not found, update tools/bump-version.mjs`);
  writeFileSync(path, before.replace(pattern, replacement));
  console.log(`  ${file}`);
}

export function bumpVersion(target = "patch") {
  let version = target;
  const currentVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

  if (!version || version === "patch" || version === "minor" || version === "major") {
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    if (version === "major") version = `${major + 1}.0.0`;
    else if (version === "minor") version = `${major}.${minor + 1}.0`;
    else version = `${major}.${minor}.${patch + 1}`;
  }

  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
    throw new Error(`Usage: node tools/bump-version.mjs [patch|minor|major|<x.y.z>]. Received: ${target}`);
  }

  console.log(`Spotter → ${version}`);
  replace("extension/CSXS/manifest.xml", /(ExtensionBundleVersion=")[^"]+(")/, `$1${version}$2`);
  replace("extension/CSXS/manifest.xml", /(<Extension Id="com\.narrativenode\.spotter\.panel" Version=")[^"]+(")/, `$1${version}$2`);
  replace("extension/js/core.js", /(const VERSION = ")[^"]+(")/, `$1${version}$2`);
  replace("package.json", /("version":\s*")[^"]+(")/, `$1${version}$2`);

  // The website is its own repository beside this one; its docs quote Spotter's version.
  const website = join(root, "..", "website");
  if (existsSync(join(website, "src/site.ts"))) {
    replace("src/site.ts", /(spotter: \{\s*version: ")[^"]+(")/, `$1${version}$2`, { base: website });
    console.log("  (the website is its own repository: commit that change there)");
  }
  console.log('Also set "latest" in spotter.json of the updates repository once the release is published.');

  return version;
}

// Run directly from command line if invoked as script
const isMain = process.argv[1] && join(root, "tools/bump-version.mjs") === join(process.argv[1]);
if (isMain) {
  try {
    bumpVersion(process.argv[2] || "patch");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
