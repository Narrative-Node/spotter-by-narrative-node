# Spotter by Narrative Node

A free panel for Adobe Premiere Pro that browses the music and sound-effect folders you already have. Add your Music and SFX folders, see every file's waveform, listen, and put a sound in your project or straight on the timeline without leaving Premiere.

Spotter is free and open source under the [GPL-3.0](LICENSE). It is made by [Narrative Node](https://www.narrativenode.app), who also make [Navigator](https://www.narrativenode.app/navigator), a footage browser for Premiere Pro.

## Install

Download the installer for your computer from the [download page](https://store.narrativenode.app/checkout/buy/c077ad41-3cda-4fd7-9400-7030639ffdf5), close Premiere Pro, and run it.

| | File | Installs to |
|:--|:--|:--|
| Windows (64-bit) | `Spotter-Setup-<version>.exe` | `%APPDATA%\Adobe\CEP\extensions\com.narrativenode.spotter` (your user only, no admin prompt) |
| macOS (Apple silicon and Intel) | `Spotter-<version>.pkg` | `/Library/Application Support/Adobe/CEP/extensions/com.narrativenode.spotter` |
| Either, with a ZXP installer | `Spotter-<version>.zxp` | wherever your ZXP installer puts extensions |

Then open Premiere Pro and choose **Window › Extensions › Spotter by Narrative Node**.

The installers are not code-signed yet. Windows may show "Windows protected your PC": choose **More info › Run anyway**. On a Mac, right-click the `.pkg` and choose **Open**. The extension inside is ZXP-signed, so Premiere loads it without any debug setting.

To remove Spotter: on Windows use **Settings › Apps**; on a Mac delete the `com.narrativenode.spotter` folder above.

## Use

- **Add folders.** Use the **+** beside Music or SFX. Add as many as you like; subfolders appear in the sidebar. Spotter only reads them: nothing is copied, moved or changed.
- **Listen.** Click a sound to select it, then press Play or Enter. Turn on **Auto-Play** to hear each sound as soon as you select it.
- **Import.** Double-click a sound, or use **Import** in the player. It goes into a bin named after its folder: music under **Music**, sound effects under **Assets › SFX**, with the subfolders mirrored.
- **Place it.** Drag a sound onto the timeline or the Project panel, or use **Insert at playhead** to put it on the first audio track that is free at the playhead.
- **Find it.** Search matches every word you type against names and folders. Switch between cards and a list with the buttons beside the search box.
- Right-click a sound for **Show in Explorer/Finder** and **Copy file path**.

Spotter claims only the arrow keys and Enter while it has focus. Every other key, including Space, J/K/L and Ctrl/Cmd+S, still goes to Premiere.

It lists WAV, MP3, AIFF, M4A and AAC files. AIFF files import into Premiere but can't be previewed in the panel.

## Build it yourself

You need [Node.js](https://nodejs.org) 20 or later. On Windows you also need [Inno Setup 6](https://jrsoftware.org/isinfo.php) (`winget install JRSoftware.InnoSetup`).

```sh
npm test                        # the logic, without Premiere
node installer/build.mjs        # Windows → release/Spotter-Setup-<v>.exe; macOS → release/Spotter-<v>.pkg; both → release/Spotter-<v>.zxp
```

The build downloads Adobe's `ZXPSignCmd` from [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources) and checks its SHA-256 before using it. It signs the extension with a fresh self-signed certificate unless `SPOTTER_P12` and `SPOTTER_P12_PASSWORD` point at your own. To code-sign the installers, set `WINDOWS_SIGN_ARGS` (signtool arguments) on Windows, or `MAC_INSTALLER_IDENTITY` and `MAC_NOTARY_PROFILE` on macOS.

To work on the panel without Premiere, open `dev/preview.html` in a browser. It runs the real panel against a made-up library.

To run your working copy inside Premiere, turn on CEP's debug mode for your Premiere's CEP version (CSXS.12 for Premiere Pro 2025 and later, CSXS.11 before): the string value `PlayerDebugMode` = `1` under `HKEY_CURRENT_USER\Software\Adobe\CSXS.12` on Windows, or `defaults write com.adobe.CSXS.12 PlayerDebugMode 1` on a Mac, link or copy `extension/` into the CEP extensions folder as `com.narrativenode.spotter`, and open `http://localhost:8099` in Chrome to debug it.

## Releasing

`.github/workflows/release.yml` builds everything on GitHub and publishes it. To release:

1. Bump the version in `extension/CSXS/manifest.xml` (both fields), `extension/js/core.js` and `package.json`.
2. Commit, then `git tag v1.0.2 && git push origin v1.0.2`.

The workflow runs the tests, builds the Windows installer and the `.zxp` on Windows and the `.pkg` on a Mac runner, and publishes a release named after the tag with the three files and `SHA256SUMS.txt`. The tag must match the manifest version or the build stops. A tag with a hyphen (`v1.1.0-beta.1`) is published as a pre-release. **Run workflow** on the Actions tab builds without publishing.

To sign every `.zxp` with the same certificate, make one with `ZXPSignCmd -selfSignedCert` and add the repository secrets `SPOTTER_P12_BASE64` (the `.p12` as one line of base64) and `SPOTTER_P12_PASSWORD`. Without them each build makes its own.

## How it is put together

| Path | What |
|:--|:--|
| `extension/` | The CEP extension: `index.html`, `css/`, `js/` and `jsx/host.jsx` |
| `extension/js/core.js` | Scanning, bin paths, search and formatting: plain functions, tested in `test/` |
| `extension/js/env-cep.js` | Everything outside the page: Node's file system, CEP, ExtendScript |
| `extension/js/waveform.js` | Decodes each file once and keeps its peaks in Spotter's data folder |
| `extension/jsx/host.jsx` | Import, insert at the playhead, and tidying a dropped clip into its bin |
| `installer/` | `build.mjs`, the Inno Setup script, the Mac package scripts, and the installer art |
| `dev/` | A preview of the panel with a stand-in for CEP |

Fonts: [Inter](https://rsms.me/inter/) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), both under the SIL Open Font License (`extension/fonts/`).
