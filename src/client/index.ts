/**
 * dsh-quick-replies — Client half (installed package bundle entry).
 *
 * Registers ONE entry on `conversation.input.dock` (id `quick-replies`,
 * order 30): the quick-reply bar above the composer. The dock owner share is an
 * `InputZone` (`session` + `input`); session identity also arrives through
 * session-standard props (`sessionId`). All other DSH service access is
 * concentrated here in small guarded readers (the bar itself only talks to
 * plugin-owned stores); the send path goes exclusively through the session
 * face's public `prompt` RPC (see send/sender.ts). Styles ride one
 * plugin-owned `<style data-plugin-css>` tag injected at materialization and
 * removed on teardown.
 *
 * Library storage is the Host-side `dsh-quick-replies` settings entry. Two
 * client channels can serve it: the official `ctx.configForms` form (the DSH
 * 0.1.7 successor of the removed `settingsScope` service) and — on the
 * non-loopback pages where that form is deliberately inert — a direct Host
 * channel over `remote.settings`. See settingsChannel.ts.
 *
 * This module is the body of the package's `./client` bundle: tsdown bundles
 * it (external `react`/platform modules, supplied by the browser module table
 * via the injected `require`) into the web boot handoff
 * (`window.__ModuleLoader__.load({ id, factory })`).
 */
import { createElement } from 'react'
import type { ConnectionState, InputPhase, SendEnvironment, SessionRuntime, SessionSendFace } from './send/faces.ts'
import { DEFAULT_ADMISSION_TIMEOUT_MS, DEFAULT_DEBOUNCE_MS, QuickReplySender } from './send/sender.ts'
import { QR_NAMESPACE } from '../shared/limits.ts'
import { createLibraryStore, type LibraryStore } from './settings/libraryStore.ts'
import { createHostDirectScope, settingsInvalidationsOf, settingsRemoteFace, settingsRemoteOf, type SettingsRemoteLike } from './settings/hostDirectScope.ts'
import { createSettingsChannel } from './settings/settingsChannel.ts'
import { configFormScope, configFormsOf } from './settings/configFormScope.ts'
import { createManageController, type ManageController } from './manage/controller.ts'
import { createFoldPrefsStore, type FoldPrefsStore } from './prefsStore.ts'
import { QR_CSS } from './ui/styles.ts'
import { QuickRepliesDock, type DockHandles } from './ui/QuickRepliesDock.tsx'

declare const module: { exports: Record<string, unknown> }

const PLUGIN_ID = 'dsh-quick-replies'
const CSS_TAG_ID = `${PLUGIN_ID}/styles`

/**
 * Minimal structural view of the client plugin context. The runtime object is
 * built by the harness; only the members below are read, each behind guards.
 */
interface ClientCtx {
  slots: {
    inject(name: string, callback: () => unknown): unknown
    register(registration: {
      name: string
      id: string
      order?: number
      locale?: string
    }, component: (props: { sessionId?: string } & Record<string, unknown>) => unknown): unknown
  }
  sessions: {
    binding(sessionId: string): { session: unknown } | undefined
    scope(sessionId: string): { get(name: string): unknown } | undefined
  }
  conversation: {
    input: { for(actx: unknown): { state?: { getSnapshot?(): { phase?: string } } } | undefined }
    blocks: { storeFor(sessionId: string): { getSnapshot(): { reason?: string } | undefined } | undefined }
  }
  get(name: string): unknown
  inject(names: string[], callback: (raw: never) => void): unknown
  effect(setup: () => (() => void) | void, label?: string): unknown
  /** Optional lifecycle event seam (Cordis contexts expose it; guarded here). */
  on?(name: string, listener: () => void): unknown
}

/** Inject the plugin stylesheet exactly once; returns its disposer. */
function installStyles(): () => void {
  const existing = document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`)
  if (existing !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.dataset.pluginCss = CSS_TAG_ID
  tag.textContent = QR_CSS
  document.head.appendChild(tag)
  return () => {
    const live = document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`)
    if (live !== null && live.parentNode !== null) live.parentNode.removeChild(live)
  }
}

/**
 * Resolve the dock's session identity from the session-standard props
 * (`sessionId`, still delivered by 0.1.7) or the InputZone owner share
 * (`session.sessionId`). Older shells that only passed a bare sessionId still
 * work through the first arm.
 */
function sessionIdOf(props: { sessionId?: unknown; session?: unknown } & Record<string, unknown>): string | undefined {
  if (typeof props.sessionId === 'string' && props.sessionId !== '') return props.sessionId
  const session = props.session
  if (session !== null && typeof session === 'object') {
    const id = (session as { sessionId?: unknown }).sessionId
    if (typeof id === 'string' && id !== '') return id
  }
  return undefined
}

function makeContextReaders(ctx: ClientCtx) {
  /** The outward session face behind one session id (undefined when not bound). */
  function resolveRuntime(sessionId: string): SessionRuntime | undefined {
    try {
      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined) return undefined
      const face = binding.session as SessionSendFace
      if (typeof face.prompt !== 'function' || typeof face.getSnapshot !== 'function') return undefined
      return { face }
    } catch {
      return undefined
    }
  }

  function connectionState(): ConnectionState | undefined {
    try {
      const connection = ctx.get('connection') as { state?: { getSnapshot?(): string } } | undefined
      const value = connection?.state?.getSnapshot?.()
      return value === 'connected' || value === 'disconnected' || value === 'connecting' ? value : undefined
    } catch {
      return undefined
    }
  }

  function composerBlockOf(sessionId: string): { reason?: string } | undefined {
    try {
      return ctx.conversation.blocks.storeFor(sessionId)?.getSnapshot()
    } catch {
      return undefined
    }
  }

  function inputPhaseOf(sessionId: string): InputPhase | undefined {
    try {
      const actx = ctx.sessions.scope(sessionId)
      if (actx === undefined) return undefined
      const conversation = actx.get('conversation') as { input?: { for?(ax: unknown): unknown } } | undefined
      const facade = conversation?.input?.for?.(actx) as { state?: { getSnapshot?(): { phase?: string } } } | undefined
      const phase = facade?.state?.getSnapshot?.().phase
      return phase === 'plain' || phase === 'adjudicating' || phase === 'claimed' || phase === 'submitting'
        ? phase
        : undefined
    } catch {
      return undefined
    }
  }

  return { resolveRuntime, connectionState, composerBlockOf, inputPhaseOf }
}

function apply(ctx: ClientCtx): void {
  const disposeStyles = installStyles()
  const disposers: Array<() => void> = [disposeStyles]

  const library: LibraryStore = createLibraryStore()
  const manage: ManageController = createManageController(library)
  const prefs: FoldPrefsStore = createFoldPrefsStore()
  const sender = new QuickReplySender()
  const readers = makeContextReaders(ctx)

  // The library's ONE source of truth is the Host `dsh-quick-replies` settings
  // entry, but two client channels can serve it: the official
  // `ctx.configForms.get(entryId)` form (loopback pages) and — only when that
  // form reports the documented non-loopback degradation — a direct Host
  // channel over the same public Remote. The LAN page a phone uses is exactly
  // that non-loopback case; without the direct channel every chip disappears
  // there. See settingsChannel.ts.
  let remoteSettings: SettingsRemoteLike | undefined
  /** Resolve the direct channel's Remote face; `ctx.get` covers a payload we could not read. */
  const directRemote = (): SettingsRemoteLike | undefined => {
    if (remoteSettings !== undefined) return remoteSettings
    try {
      remoteSettings = settingsRemoteFace(ctx.get('remote.settings'))
    } catch {
      // The dotted service key is not readable on this context.
    }
    return remoteSettings
  }
  const channel = createSettingsChannel({
    openDirect: () => {
      const remote = directRemote()
      return remote === undefined ? undefined : createHostDirectScope(remote, QR_NAMESPACE)
    },
  })
  disposers.push(library.attach(channel), () => channel.dispose())

  // Official seam first: it stays authoritative whenever it is not `unavailable`,
  // so a loopback page keeps the official semantics (one shared describe mirror,
  // the official write queue) and pays no extra wire read. DSH 0.1.7 replaced
  // the per-namespace `settingsScope` service with these entry-addressed forms,
  // keyed by the Loader entry id the Host Config half owns (QR_NAMESPACE).
  try {
    ctx.inject(['configForms'], (raw: never) => {
      try {
        const forms = configFormsOf(raw)
        if (forms === undefined) return
        channel.setOfficial(configFormScope(forms.get<unknown>(QR_NAMESPACE)))
      } catch {
        // Unreadable settings seam: the library stays unavailable.
      }
    })
  } catch {
    // No configForms seam on this host: the direct channel is the only hope.
  }

  // Direct Host channel. The Remote service can arrive before or after the
  // official scope, so `refresh()` re-evaluates the selection either way; the
  // document invalidation keeps a phone's copy in step with edits made on
  // another device, and a reconnect retries a read that was refused.
  //
  // Every read here is contained: the injected payload intentionally refuses the
  // dotted PARENT (`payload.remote` throws "cannot get property … without
  // inject"), so one unreadable member must never abort the whole wiring.
  try {
    ctx.inject(['remote.settings'], (raw: never) => {
      try {
        remoteSettings = settingsRemoteOf(raw) ?? remoteSettings
        channel.refresh()
        const invalidations = settingsInvalidationsOf(ctx.get('remote'))
        if (invalidations !== undefined) {
          disposers.push(invalidations(() => channel.reload()))
        }
      } catch {
        // No usable Remote seam: the direct channel stays closed and the official
        // scope keeps its verdict.
      }
    })
  } catch {
    // No Remote seam: non-loopback pages keep the honest unavailable state.
  }
  if (typeof ctx.on === 'function') {
    try {
      const off = ctx.on('connection/reset', () => channel.reload())
      if (typeof off === 'function') disposers.push(off as () => void)
    } catch {
      // No lifecycle event seam on this host.
    }
  }

  const handles: DockHandles = {
    library,
    sender,
    manage,
    prefs,
    makeEnv(sessionId: string): SendEnvironment {
      return {
        resolveSession: readers.resolveRuntime,
        connectionState: readers.connectionState,
        composerBlockOf: readers.composerBlockOf,
        inputPhase: () => readers.inputPhaseOf(sessionId),
        now: () => Date.now(),
        admissionTimeoutMs: () => DEFAULT_ADMISSION_TIMEOUT_MS,
        debounceMs: () => DEFAULT_DEBOUNCE_MS,
      }
    },
  }

  // The single dock entry. Owner share is InputZone ({ session, input });
  // session-standard props still supply sessionId. The host hides the whole
  // composer area on takeover (approval/plan/question) — that is correct
  // behavior, never bypassed with a floating surface.
  ctx.slots.inject('conversation.input.dock', () => {
    return ctx.slots.register(
      { name: 'conversation.input.dock', id: 'quick-replies', order: 30 },
      (props) => {
        const sessionId = sessionIdOf(props)
        return createElement(QuickRepliesDock, { sessionId, handles })
      },
    )
  })

  const dispose = (): void => {
    for (const disposer of disposers.splice(0)) {
      try { disposer() } catch { /* contained */ }
    }
  }
  try {
    // Register the teardown with the plugin fiber: the callback RUNS now and
    // must RETURN the disposer that fires when the plugin stops/reloads.
    ctx.effect(() => dispose, 'dsh-quick-replies: cleanup')
  } catch {
    // Very old ctx without effect: keep styles for the page lifetime.
  }
}

module.exports = {
  name: PLUGIN_ID,
  inject: ['slots', 'conversation', 'sessions'],
  apply,
}
