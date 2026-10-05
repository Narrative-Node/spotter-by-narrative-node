#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: root, stdio: "inherit", encoding: "utf8", ...options });
}

function capture(args, cwd = root) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

try {
  const status = capture(["status", "--porcelain"]);
  if (status) {
    console.error("❌ Working directory has uncommitted changes. Please commit or stash before releasing to main.");
    process.exit(1);
  }

  const currentVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  console.log(`\n🚀 Releasing Spotter v${currentVersion} to main...`);

  // 1. Fetch latest
  git(["fetch", "origin"]);

  // 2. Switch to main and merge dev
  git(["switch", "main"]);
  git(["pull", "origin", "main"]);
  git(["merge", "dev", "-m", `release: v${currentVersion}`]);

  // 3. Push main
  git(["push", "origin", "main"]);
  console.log(`✔ Pushed Spotter v${currentVersion} to origin/main`);

  // 4. Switch back to dev
  git(["switch", "dev"]);

  // 5. Update website if present
  const websitePath = join(root, "../website/src/site.ts");
  if (existsSync(websitePath)) {
    let site = readFileSync(websitePath, "utf8");
    const pattern = /(spotter: \{\s*version: ")[^"]+(")/;
    if (pattern.test(site)) {
      writeFileSync(websitePath, site.replace(pattern, `$1${currentVersion}$2`), "utf8");
      console.log(`✔ Updated Spotter version to ${currentVersion} in website/src/site.ts`);

      try {
        const webDir = join(root, "../website");
        git(["add", "src/site.ts"], { cwd: webDir });
        git(["commit", "-m", `chore: update Spotter version to ${currentVersion}`], { cwd: webDir });
        const webBranch = capture(["branch", "--show-current"], webDir);
        git(["push", "origin", webBranch], { cwd: webDir });
        console.log(`✔ Committed and pushed to website origin/${webBranch}`);
      } catch (e) {
        console.log("Notice: website changes staged or already committed:", e.message);
      }
    }
  }

  console.log(`\n🎉 Spotter v${currentVersion} released to main successfully!`);
} catch (err) {
  console.error("❌ Error releasing to main:", err.message || err);
  process.exit(1);
}
