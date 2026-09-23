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
  <a href="#quick-start">Quick start</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#uninstall">Uninstall</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

> DSH Quick Replies is a DeepSeek Harness community plugin. It mounts above the current session composer and does not modify DSH source.
>
> **✅ Supports DSH `0.1.7-rc.1` — the latest `0.1.7` release candidate.** Verified on the running release candidate as well as on `0.1.7-alpha.2`; see [Compatibility](#compatibility).

A row of stored text chips sits above the input. A tap sends them as an ordinary user message: `queue` while idle, `steer` when the top-level session is running (handled at the next safe boundary). The plugin never rewrites the draft, never cancels, and never stops work.

The reply library lives in the DSH Host settings entry `dsh-quick-replies` (the plugin's own loader entry, persisted in the active profile's patch), shared across browsers and devices on the same Host. Fold preferences are remembered per browser.

<p align="center">
  <img src="./assets/ui.png" width="100%" alt="DeepSeek Harness composer with the Quick Replies bar: chips such as continue, plus and manage buttons, and the message input">
</p>

## What it does

- **One tap to send**: store short phrases (for example “continue”) as chips and send them as plain text.
- **Queue when idle, steer when running**: it never claims to interrupt a running turn; timing is decided by DSH.
- **Draft stays intact**: send goes through the public session `prompt` API. Draft text, citations, images, and the cursor are left alone.
- **Manageable**: add, edit, delete, enable/disable, reorder, and import/export JSON.
- **Folds on narrow layouts**: narrow containers collapse to one row; expanded height is capped and long lists scroll inside the bar.
- **Blank-session guard**: sending is refused in a brand-new session with no history, so a resume chip cannot accidentally create an empty conversation.

## Quick start

Requirements:

- DeepSeek Harness with a Web profile
- Node.js 20 or newer
- Verified DSH version: `0.1.7-rc.1` (the latest release candidate) and `0.1.7-alpha.2` — plugin `0.1.5`

If the `dsh` command is already installed:

```sh
dsh plugin --profile web add dsh-quick-replies@latest
```

From DeepSeek Harness source:

```sh
corepack enable; pnpm install
pnpm dsh plugin --profile web add dsh-quick-replies@latest
```

Or install via the plugin market (optional):

```sh
dsh plugin --profile web add dshmarket
```

Restart DSH, then search for dsh-quick-replies under **Settings → Plugin market**.

Local development (link this repo):

```sh
pnpm install
pnpm run build
dsh plugin --profile web add "link:$(pwd)"
```

Refresh the web UI after install. The host half declares the reply library as its `Config` — on DSH 0.1.7 that `Config` **is** the `dsh-quick-replies` settings form, because a form namespace is the loader entry id — and the client mounts the bar on `conversation.input.dock`. The library is stored as that entry's `config` in the active profile's `cordis.patch.yml` (`~/.dsh/profiles/<profile>/cordis.patch.yml`), not in the plugin install directory.

## Usage

1. Open an existing session (do not tap resume-style chips on a blank new chat).
2. The bar appears above the composer. Narrow layouts collapse by default; tap the title or chevron to expand.
3. Tap a chip to send. Idle sessions show “submitted (queue)”; running sessions show that it will be handled at the next boundary.
4. Tap **＋** to add a reply: fill in the label and body, save, and the chip appears on the bar immediately.
5. Tap **⚙** to manage replies: edit, delete, reorder, import, or export JSON.

Four defaults ship with the plugin and can all be deleted; they are not recreated automatically: continue, continue after interrupt, what should I do next?, continue after restart.

### LAN / non-loopback pages

DSH keeps Host settings persistence disabled for any page whose origin is not a loopback authority (the official `dsh-client-ui-settings` README states it plainly: *Non-loopback pages get no durable settings*). Every entry-addressed settings form (`ctx.configForms.get(id)`, the DSH 0.1.7 successor of the removed `settingsScope`) is then pinned to `memory`, answers `unavailable`, and never sends `settings.describe`, so every settings-backed surface goes inert — this bar showed “Reply library unavailable” when the Web UI was reached from another machine through a LAN bridge such as `dsh-lan-proxy`, `dsh-bridge`, or `dsh-mobile`.

The plugin falls back to the SAME public Remote the official settings client speaks (`settings.describe` / `settings.mutate`) and therefore keeps reading and writing the one shared Host `dsh-quick-replies` entry. Reads, edits, import/export and the revision fence behave exactly as they do on a loopback page; a refused write surfaces as a conflict instead of a silent overwrite. A loopback page keeps the official form — one shared describe mirror, the official write queue — and pays no extra wire read.

If you want DSH's stock policy instead (a non-loopback page never persists settings), stay on `0.1.2`, or let the bridge declare itself the Host: inject `window.__DSH_TRANSPORT__ = { fetch: (input, init) => window.fetch(input, init), ownsHost: true }` into the served HTML before `__DSH_BOOT__`. DSH's loopback detection then reads true and every settings-backed surface — including the Settings pages — comes back. The `dsh-mobile` gateway already does this.

## Compatibility

Current release: plugin **`0.1.5`** is verified against DeepSeek Harness **`0.1.7-rc.1`** — the latest `0.1.7` release candidate — and against `0.1.7-alpha.2`.

| Plugin | Verified DeepSeek Harness | Notes |
| --- | --- | --- |
| `0.1.0`–`0.1.1` | `0.1.2-rc.1` | published |
| `0.1.2` | `0.1.5-rc.1` | published |
| `0.1.3` | `0.1.5-rc.1` | published; LAN/non-loopback fallback |
| `0.1.4` | `0.1.7-alpha.2` | published; first release on the 0.1.7 line |
| **`0.1.5`** | **`0.1.7-rc.1`** (latest RC), `0.1.7-alpha.2` | **Supports the newest `0.1.7` release candidate.** No new storage model over `0.1.4`; upgrading needs no data migration. |

**`0.1.5` supports DSH `0.1.7-rc.1`, the latest release candidate.** The `0.1.7` line removed the runtime `ctx.settings.register(...)` API and the `ctx.settingsScope` service this plugin was built on, and **`0.1.4` already adapted to that** — `0.1.5` confirms the same code runs unchanged on the RC and clears the small things left behind (a dead Host validation helper, and two user-visible error prefixes that still named the pre-0.1.7 `quick-replies` namespace). **Upgrading from `0.1.4` needs no data migration and no config change.** On an older DSH — including `0.1.6-alpha.2` — stay on plugin **`0.1.3`**. Newer DSH releases are not auto-declared compatible. If incompatible, disable or uninstall the plugin — do not patch DSH core.

Two declarations make that work, and a test keeps them honest:

- `dsh.engines.dsh` and `peerDependencies['@deepseek-ai/dsh-settings']` both declare `>=0.1.7-alpha.2 <0.2.0`, which admits both `0.1.7-alpha.2` and `0.1.7-rc.1` (a prerelease is admitted when some comparator names the same `major.minor.patch`). The lower bound names the alpha on purpose — under node-semver's default prerelease rule a range like `>=0.1.6-0 <0.2.0` would admit **neither**.
- `@deepseek-ai/schemastery` is a **peer**, not a plain dependency: DSH 0.1.7 resolves only a linked plugin's peer dependencies from the running installation, so a `link:` install of this directory would otherwise fail to import the Host half.

## Uninstall

```sh
dsh plugin --profile web remove dsh-quick-replies
```

Uninstall does not delete the settings library. To wipe it, export JSON from Manage first, then remove the `dsh-quick-replies` entry's `config` from the active profile's `cordis.patch.yml`.

## Development

```sh
pnpm install
pnpm run test
pnpm run build
```

`pnpm run test` runs `tsc --noEmit` plus the vitest projects: shared/host logic, client logic and jsdom UI specs, and a built-artifact lane that loads `lib/index.js` and `lib/client.js` the way the harness does. Run `pnpm run build` before the artifact lane has something to exercise.

Pushing a `v*` tag runs GitHub Actions: tests, pack, optional npm publish when `NPM_TOKEN` is set, and a GitHub Release.

MIT. See [LICENSE](LICENSE).
