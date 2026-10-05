# Branches and versions

## Branches

| Branch | What it holds | Who writes to it |
|:--|:--|:--|
| `main` | Released code only. Each release is a tag on `main`. | Pull requests from `dev`, and hotfixes. Nobody commits to it directly. |
| `dev` | Finished work that waits for the next release. | Pull requests from feature branches. |
| `feature/<name>` | One new feature. | You. Start it from `dev`. |
| `fix/<name>` | One bug fix. | You. Start it from `dev`. |
| `hotfix/<name>` | An urgent fix for a released version. | You. Start it from `main`. |

The first push of any new work goes to `dev` or to a branch that comes from `dev`. It never goes to `main`.

## Daily work

```sh
git switch dev
git pull
git switch -c feature/short-name      # one branch for each feature
# ...work, then commit...
git push                              # the first push creates the branch on GitHub
```

Open a pull request from your branch into `dev`. Delete the branch after the merge.

Start each commit message with a short type: `feat:` a new feature, `fix:` a bug fix, `docs:` text only, `chore:` upkeep, `release:` a version change.

## Versions & Tags on every push to dev

Use `major.minor.patch`. Every push to `dev` increments the version number and pushes a matching tag:

```sh
npm run push:dev                     # bumps patch (e.g. 1.0.2 → 1.0.3), commits, tags, and pushes
npm run push:dev -- minor            # bumps minor, commits, tags, and pushes
npm run push:dev -- major            # bumps major, commits, tags, and pushes
npm run push:dev -- "feat: message"  # bumps patch with custom commit message
```

Or manually in steps:
```sh
npm run bump                         # or: node tools/bump-version.mjs [patch|minor|major|<x.y.z>]
git commit -am "chore: bump version to $(node -p "require('./package.json').version")"
git tag v$(node -p "require('./package.json').version")
git push origin dev --tags
```

`node tools/bump-version.mjs` automatically increments the version and updates:
- `package.json`
- `extension/CSXS/manifest.xml` (both `ExtensionBundleVersion` and Extension `Version`)
- `extension/js/core.js`

*(Note: `website/src/site.ts` is intentionally NOT touched during dev bumps; the website quotes only published release versions on `main`).*

The tag starts the GitHub Actions release workflow. The workflow stops if the tag and `extension/CSXS/manifest.xml` disagree. After the release is public, set `latest` in `spotter.json` of the updates repository.

## Releasing to main & updating the website

When ready to publish a release to customers:

### Option A: Local release command (one step)
```sh
npm run release:main
```
This merges `dev` into `main`, pushes `main` to GitHub, and automatically updates `website/src/site.ts` with the new Spotter version and pushes it.

### Option B: GitHub PR merge
1. Merge the pull request from `dev` into `main` on GitHub.
2. In the `website` directory, sync the website's product versions:
```sh
cd ../website
npm run sync:versions -- --push
```

After a hotfix on `main`, merge `main` back into `dev`.

## One-time GitHub settings

1. Open the repository, then **Settings › Branches**.
2. Add a rule for `main`: require a pull request before merge, and do not allow direct pushes.
3. Set `dev` as the default branch, so new pull requests aim at `dev`.
