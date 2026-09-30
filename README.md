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
> **✅ Supports DSH `0.2.0-rc.2` — the latest release candidate.** Verified against it and still compatible with `0.2.0-rc.1` and the whole `0.1.7` line; see [Compatibility](#compatibility). On `0.2.0-rc.2` use plugin `0.1.8` or newer — plugin `0.1.7` is skipped by the profile peer gate.

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
- Verified DSH version: `0.2.0-rc.2`, plus `0.2.0-rc.1` and the whole `0.1.7` line (`0.1.7-rc.2`, `0.1.7-rc.1`, `0.1.7-alpha.2`) — plugin `0.1.8`

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

Current release: plugin **`0.1.8`** is verified against DeepSeek Harness **`0.2.0-rc.2`** (released 2026-09-30), and against `0.2.0-rc.1` plus the whole `0.1.7` line (`0.1.7-rc.2`, `0.1.7-rc.1`, `0.1.7-alpha.2`).

| Plugin | Verified DeepSeek Harness | Notes |
| --- | --- | --- |
| `0.1.0`–`0.1.1` | `0.1.2-rc.1` | published |
| `0.1.2` | `0.1.5-rc.1` | published |
| `0.1.3` | `0.1.5-rc.1` | published; LAN/non-loopback fallback |
| `0.1.4` | `0.1.7-alpha.2` | published; first release on the 0.1.7 line |
| `0.1.5` | `0.1.7-rc.1`, `0.1.7-alpha.2` | published; first release candidate on the 0.1.7 line |
| `0.1.6` | `0.1.7-rc.2` (latest 0.1.7 RC), `0.1.7-rc.1`, `0.1.7-alpha.2` | published; loads on `0.2.0-rc.2` only through the gate's lenient prerelease rule — prefer `0.1.8` |
| `0.1.7` | `0.2.0-rc.1`, the whole `0.1.7` line | published; **the peer gate skips it on `0.2.0-rc.2`** — upgrade to `0.1.8` |
| **`0.1.8`** | **`0.2.0-rc.2`** (latest), `0.2.0-rc.1`, the whole `0.1.7` line | **Supports DSH 0.2.0-rc.2.** Same code and storage model as `0.1.5`+; upgrading needs no data migration. |

**`0.1.8` supports DSH `0.2.0-rc.2`.** Nothing this plugin consumes changed incompatibly between `0.2.0-rc.1` and `0.2.0-rc.2`: the `conversation.input.dock` slot contract directory is byte-identical, so the `quick-replies` occupant (`kind: "list"`, `scope: "session"`, owner `InputZone`) still registers with its props contract untouched; the client static module table (`packages/client/web/src/seed.ts`) has zero diff and still matches this plugin's nine platform modules one for one, with the `window.__ModuleLoader__` registration protocol unchanged; `ctx.configForms` is still the official settings channel and `ui-settings`' source is unchanged (`ctx.settingsScope` is still gone); `@deepseek-ai/dsh-settings` still exposes `describe` / `update` / `replace` / `mutate` and still has **no** runtime `register` (this repo's typecheck now runs directly against the `0.2.0-rc.2` package); `settings/document-updated` is still emitted for the LAN fallback; and the session `prompt(content, mode, signal, requestId)` signature is unchanged. The only substantive platform-baseline change is in `ui-primitives` (`Input` converted to `forwardRef`, a new `MenuGroup`, one icon path tweak); this plugin's client half never imports those modules — it only uses the injected platform `require` — and a `forwardRef` conversion stays backward compatible for existing callers.

**Why `0.1.7` breaks on `0.2.0-rc.2` — and why the older pin seems fine.** `0.1.7`'s upper bound `<0.2.0-0` was written to keep the untested `0.2.0-rc.2` out; once `rc.2` shipped, that bound became a refusal, because `0.2.0-rc.2` is neither equal to `0.2.0-rc.1` nor less than `0.2.0-0`. The whole bundle is then skipped by the profile gate and the bar disappears. Meanwhile a profile still pinned to `0.1.6` (range `>=0.1.7-alpha.2 <0.2.0`) *does* load — but only because the gate compares with `semver.satisfies(..., { includePrerelease: true })`, and under that rule `<0.2.0` admits `0.2.0-rc.2`; node-semver's default rule rejects it too. So the broken artifact is npm's `latest`, and anyone running `pnpm update` or installing fresh on `0.2.0-rc.2` loses the plugin. Measured with the gate function DSH itself ships (`evaluatePluginCompatibility` from `@deepseek-ai/dsh-app-boot`): the `0.1.8` manifest passes, the `0.1.7` manifest is judged incompatible. **Upgrading from `0.1.7` (or `0.1.6` / `0.1.5`) needs no data migration and no config change.** On an older DSH — including `0.1.6-alpha.2` — stay on plugin **`0.1.3`**. Newer DSH releases are not auto-declared compatible. If incompatible, disable or uninstall the plugin — do not patch DSH core.

Two declarations make that work, and a test keeps them honest:

- `dsh.engines.dsh` and `peerDependencies['@deepseek-ai/dsh-settings']` both declare `>=0.1.7-alpha.2 <0.2.0-0 || 0.2.0-rc.1 || 0.2.0-rc.2 || >=0.2.0 <0.3.0`. The first alternative admits `0.1.7-alpha.2`, `0.1.7-rc.1` and `0.1.7-rc.2` (a prerelease is admitted when some comparator names the same `major.minor.patch`); the lower bound names the alpha on purpose — under node-semver's default prerelease rule a range like `>=0.1.6-0 <0.2.0` would admit **none** of them. The two middle terms name the verified `0.2.0-rc.1` and `0.2.0-rc.2` explicitly, so **the admission table is identical under node-semver's default rule and under the gate's `includePrerelease: true` rule** — the declaration states what is actually true no matter which rule reads it. (This is the substantive fix over `0.1.6`, which admitted `rc.2` only under the lenient rule, and over `0.1.7`, which admitted it under neither.) The upper bound uses `-0` so other `0.2.0` prereleases (e.g. `0.2.0-rc.3`) stay out until verified, while future `0.2.x` stable releases are admitted.
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

Pushing a `v*` tag runs GitHub Actions: a version/notes gate, tests, pack, npm trusted publishing (OIDC — no `NPM_TOKEN`), and a GitHub Release built from `docs/releases/<tag>.md`.

MIT. See [LICENSE](LICENSE).
