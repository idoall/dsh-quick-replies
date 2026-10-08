<h1 align="center">DSH Quick Replies</h1>

<p align="center">Manageable one-tap replies in the DeepSeek Harness session composer.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-quick-replies"><img src="https://img.shields.io/npm/v/dsh-quick-replies?label=npm&color=CB3837" alt="npm version"></a>
  <a href="https://github.com/idoall/dsh-quick-replies/actions/workflows/ci.yml"><img src="https://github.com/idoall/dsh-quick-replies/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0F172A" alt="MIT"></a>
</p>

<p align="center">English | <a href="README.zh.md">中文</a></p>

<p align="center">
  <a href="#what-it-does">What it does</a> ·
  <a href="#install">Install</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#compatibility">Compatibility</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

> A DeepSeek Harness community plugin. It mounts above the session composer and never modifies DSH source.
>
> **Supports DSH `0.2.1-alpha.1`.** Verified against it and still compatible with `0.2.0-rc.2`, `0.2.0-rc.1` and the `0.1.7` line — plugin `0.1.9`.

A row of stored text chips sits above the input. Tapping one sends it as an ordinary user message: queued while the session is idle, steered at the next safe boundary while it runs. The plugin never rewrites your draft, never cancels anything, and never stops work.

The reply library is one Host settings entry (`dsh-quick-replies`), so every browser and device on the same Host sees the same chips. Folding is remembered per browser.

<p align="center">
  <img src="./assets/ui.png" width="100%" alt="DeepSeek Harness composer with the Quick Replies bar: chips such as continue, plus and manage buttons, and the message input">
</p>

## What it does

- **One tap to send.** Store short phrases (like “continue”) as chips and send them as plain text.
- **Queue when idle, steer when running.** It never claims to interrupt a turn; DSH decides the timing.
- **Your draft stays put.** Sending goes through the session's public `prompt` API. Text, references, images and cursor are untouched.
- **Manageable.** Add, edit, delete, enable/disable, reorder, import and export JSON.
- **Folds when space is tight.** Narrow layouts collapse to one row; long lists scroll inside the bar.
- **Blank-session guard.** A session with no history refuses to send, so a “continue” chip cannot create an empty conversation by accident.

## Install

You need DeepSeek Harness with a Web profile and Node.js 20 or newer.

```sh
dsh plugin --profile web add dsh-quick-replies@latest
```

Working from DSH source instead:

```sh
corepack enable; pnpm install
pnpm dsh plugin --profile web add dsh-quick-replies@latest
```

Or from the plugin market:

```sh
dsh plugin --profile web add dshmarket
```

Restart DSH, then look for dsh-quick-replies under **Settings → Plugin market**.

Local development links this repo instead:

```sh
pnpm install
pnpm run build
dsh plugin --profile web add "link:$(pwd)"
```

Refresh the web UI after installing. The reply library is stored as that entry's `config` in the profile's `cordis.patch.yml` (`~/.dsh/profiles/<profile>/cordis.patch.yml`), not in the plugin directory — so reinstalling or upgrading the plugin leaves your chips alone.

## Usage

1. Open a session that already has messages.
2. The bar appears above the composer. Narrow layouts start folded; tap the title or chevron to expand.
3. Tap a chip to send. An idle session reports it as queued; a running one says it will be handled at the next boundary.
4. Tap **＋** to add a reply — label and body, save, and it appears on the bar.
5. Tap **⚙** to manage: edit, delete, reorder, import or export JSON.

Four defaults ship with the plugin and stay deleted if you delete them: continue, continue after interrupt, what should I do next?, continue after restart.

### LAN pages

DSH disables durable Host settings on any page whose origin is not loopback, so settings-backed surfaces go inert — over a LAN bridge (`dsh-lan-proxy`, `dsh-bridge`, `dsh-mobile`) this bar shows “Reply library unavailable”.

The plugin falls back to the same public Remote the official settings client talks to, so reads, edits and import/export keep working against the one shared Host entry, and a refused write shows a conflict rather than silently overwriting. Loopback pages keep using the official settings form.

If you would rather have DSH's stock policy — a non-loopback page never persists settings — stay on plugin `0.1.2`, or let the bridge declare itself the Host by injecting this into the served HTML before `__DSH_BOOT__`:

```js
window.__DSH_TRANSPORT__ = { fetch: (input, init) => window.fetch(input, init), ownsHost: true }
```

DSH's loopback check then reads true and every settings-backed surface comes back. The `dsh-mobile` gateway already does this.

## Compatibility

Current release `0.1.9` is verified against DSH `0.2.1-alpha.1`, and stays compatible with `0.2.0-rc.2`, `0.2.0-rc.1` and the `0.1.7` line (`0.1.7-rc.2`, `0.1.7-rc.1`, `0.1.7-alpha.2`).

| Plugin | DSH | Notes |
| --- | --- | --- |
| `0.1.0`–`0.1.1` | `0.1.2-rc.1` | |
| `0.1.2` | `0.1.5-rc.1` | |
| `0.1.3` | `0.1.5-rc.1` | Use this one on DSH older than `0.1.7-alpha.2` |
| `0.1.4` | `0.1.7-alpha.2` | |
| `0.1.5` | `0.1.7-rc.1` | |
| `0.1.6` | `0.1.7-rc.2` | |
| `0.1.7` | `0.2.0-rc.1` | DSH skips it on `0.2.0-rc.2`; upgrade to `0.1.8`+ |
| `0.1.8` | `0.2.0-rc.2` | |
| **`0.1.9`** | **`0.2.1-alpha.1`** | Current release |

Upgrading from any earlier `0.1.x` needs no data migration and no config change. DSH releases newer than the ones listed are not declared compatible until they are tested; if the plugin is incompatible, disable or uninstall it rather than patching DSH core.

## Uninstall

```sh
dsh plugin --profile web remove dsh-quick-replies
```

Uninstalling keeps your reply library. To wipe it too, export the JSON from Manage first, then delete the `dsh-quick-replies` entry's `config` from the profile's `cordis.patch.yml`.

## Development

```sh
pnpm install
pnpm run test
pnpm run build
```

`pnpm run test` runs `tsc --noEmit` and the vitest projects — shared and Host logic, client logic, jsdom UI specs, and an artifact lane that loads `lib/` the way the harness does. Build first so the artifact lane has something to load.

Pushing a `v*` tag runs GitHub Actions: a version and release-notes gate, tests, pack, npm trusted publishing over OIDC (no `NPM_TOKEN`), and a GitHub Release built from `docs/releases/<tag>.md`.

MIT. See [LICENSE](LICENSE).
