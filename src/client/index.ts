/**
 * dsh-quick-replies — Client half (installed package bundle entry).
 *
 * Registers ONE entry on `conversation.input.dock` (id `quick-replies`,
 * order 30): the quick-reply bar above the composer. All DSH service access
 * is concentrated here in small guarded readers (the bar itself only talks to
 * plugin-owned stores); the send path goes exclusively through the session
 * face's public `prompt` RPC (see send/sender.ts). Styles ride one
 * plugin-owned `<style data-plugin-css>` tag injected at materialization and
 * removed on teardown.
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
import { binderOf, scopeOf, type SettingsScopeBinderFace, type SettingsScopeLike } from './settings/scopeFaces.ts'
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

  // Optional settings surface: bind the Host-served `quick-replies` namespace
  // when the settings scope composes. Without it the library stays
  // unavailable (read-only, honest) and the bar shows the unavailable note.
  const attachSettings = (binder: SettingsScopeBinderFace): void => {
    try {
      const bound = scopeOf(binder.bind({ namespace: QR_NAMESPACE }))
      if (bound === undefined) return
      disposers.push(library.attach(bound))
    } catch {
      // Unreadable settings seam: the library stays unavailable.
    }
  }
  try {
    ctx.inject(['settingsScope'], (raw: never) => {
      const binder = binderOf(raw)
      if (binder !== undefined) attachSettings(binder)
    })
  } catch {
    // No settingsScope seam on this host: nothing to bind.
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

  // The single dock entry. The host hides the whole composer area on takeover
  // (approval/plan/question) — that is correct behavior, never bypassed with
  // a floating surface.
  ctx.slots.inject('conversation.input.dock', () => {
    return ctx.slots.register(
      { name: 'conversation.input.dock', id: 'quick-replies', order: 30 },
      (props) => {
        const sessionId = typeof props.sessionId === 'string' && props.sessionId !== '' ? props.sessionId : undefined
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
