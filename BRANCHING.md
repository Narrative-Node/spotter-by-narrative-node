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

## Versions

Use `major.minor.patch`. Add 1 to the patch for fixes, to the minor for new features that do not break anything, and to the major for a change that breaks something.

One command changes the version in every file that holds it:

```sh
node tools/bump-version.mjs 1.0.3
```

It changes `extension/CSXS/manifest.xml` (both fields), `extension/js/core.js` and `package.json`. It also changes `src/site.ts` in the website repository when that folder is next to this one. Commit that change in the website repository.

A release is a tag. The tag name is `v` and the version, for example `v1.0.2`. GitHub shows each tag in the list of tags and releases, and `git describe` shows the nearest tag in any commit.

## Release

1. `git switch dev && git pull`
2. `node tools/bump-version.mjs 1.0.3`
3. `git commit -am "release: v1.0.3"` and push. Open a pull request from `dev` into `main` and merge it.
4. `git switch main && git pull`
5. `git tag -a v1.0.3 -m "Spotter 1.0.3" && git push origin v1.0.3`

The tag starts the release workflow. It stops when the tag and `extension/CSXS/manifest.xml` disagree. After the release is public, set `latest` in `spotter.json` of the updates repository.

After a hotfix on `main`, merge `main` back into `dev`.

## One-time GitHub settings

1. Open the repository, then **Settings › Branches**.
2. Add a rule for `main`: require a pull request before merge, and do not allow direct pushes.
3. Set `dev` as the default branch, so new pull requests aim at `dev`.
