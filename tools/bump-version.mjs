// Sets Spotter's version everywhere it is written, so a release is one command and one commit.
//   node tools/bump-version.mjs 1.0.3
// Then: git commit -am "release: v1.0.3" && git tag -a v1.0.3 -m "Spotter 1.0.3" && git push origin v1.0.3
// The release workflow stops if the tag and extension/CSXS/manifest.xml disagree.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("Usage: node tools/bump-version.mjs <major.minor.patch>   e.g. 1.0.3");
  process.exit(1);
}

/** Replaces every match of `pattern` in a file, and fails loudly when there is none. */
function replace(file, pattern, replacement, { base = root } = {}) {
  const path = join(base, file);
  const before = readFileSync(path, "utf8");
  if (!pattern.test(before)) throw new Error(`${file}: version not found, update tools/bump-version.mjs`);
  writeFileSync(path, before.replace(pattern, replacement));
  console.log(`  ${file}`);
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
