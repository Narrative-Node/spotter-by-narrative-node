#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { bumpVersion } from "./bump-version.mjs";

function runGit(args, options = {}) {
  return execFileSync("git", args, { stdio: "inherit", encoding: "utf8", ...options });
}

function captureGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

try {
  const branch = captureGit(["branch", "--show-current"]);
  if (branch !== "dev") {
    console.warn(`⚠️  Notice: Current branch is '${branch}'. Pushing to origin/${branch}.`);
  }

  // Parse arguments:
  // Usage:
  //   npm run push:dev
  //   npm run push:dev -- patch
  //   npm run push:dev -- minor
  //   npm run push:dev -- major
  //   npm run push:dev -- 1.0.3
  //   npm run push:dev -- "feat: message"
  //   npm run push:dev -- minor "feat: message"
  const args = process.argv.slice(2);
  let bumpType = "patch";
  let customMsg = "";

  if (args.length > 0) {
    if (["patch", "minor", "major"].includes(args[0]) || /^\d+\.\d+\.\d+$/.test(args[0])) {
      bumpType = args[0];
      customMsg = args.slice(1).join(" ").trim();
    } else {
      customMsg = args.join(" ").trim();
    }
  }

  console.log(`\n📦 Bumping version (${bumpType})...`);
  const newVersion = bumpVersion(bumpType);
  const tag = `v${newVersion}`;

  const commitMsg = customMsg || `chore: bump version to ${tag}`;

  console.log(`\n📝 Staging files and committing: "${commitMsg}"...`);
  runGit(["add", "-A"]);

  const status = captureGit(["status", "--porcelain"]);
  if (status) {
    runGit(["commit", "-m", commitMsg]);
  } else {
    console.log("No changes to commit.");
  }

  console.log(`\n🏷️  Creating tag ${tag}...`);
  try {
    captureGit(["rev-parse", "-q", "--verify", `refs/tags/${tag}`]);
    console.log(`Tag ${tag} already exists locally. Updating tag to current commit...`);
    runGit(["tag", "-f", "-a", tag, "-m", commitMsg]);
  } catch {
    runGit(["tag", "-a", tag, "-m", commitMsg]);
  }

  console.log(`\n🚀 Pushing branch '${branch}' and tag '${tag}' to origin...`);
  runGit(["push", "origin", branch]);
  runGit(["push", "origin", tag]);

  console.log(`\n✅ Successfully bumped to ${tag} and pushed to origin/${branch}!`);
} catch (err) {
  console.error(`\n❌ Error:`, err.message || err);
  process.exit(1);
}
