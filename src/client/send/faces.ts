/**
 * dsh-quick-replies — client-side harness boundary faces.
 *
 * Structural, defensively-typed views of the DSH browser services this plugin
 * consumes. The runtime objects come from the user's harness; the plugin never
 * imports a harness package at runtime (the build purity gate enforces that),
 * so every consumed member is spelled here and re-proved at the boundary. The
 * interfaces are deliberately MINIMAL: a session runtime exposes exactly the
 * two members the sender needs (`prompt`, `getSnapshot`) — there is no draft,
 * editor, submit, cancel, or command member on the sending path, which is the
 * structural guarantee behind "the adapter cannot touch the draft".
 */
import type { QuickReply } from '../../shared/types.ts'

/** One text block of a prompt content payload. */
export interface PromptTextPart {
  readonly type: 'text'
  readonly text: string
}

/** Delivery intent: queue appends a turn; steer asks the next safe boundary. */
export type RequestMode = 'queue' | 'steer'

/** Remote admission result (the RemoteResult envelope of the harness). */
export type PromptResult =
  | { readonly ok: true; readonly value: { readonly accepted: true } }
  | { readonly ok: false; readonly error: RemoteFailureLike }

/** Minimal remote failure view (code + human message). */
export interface RemoteFailureLike {
  readonly code?: string
  readonly message?: string
}

/** Session lifecycle facts the sender's guards read at click time. */
export interface SessionSnapshotLike {
  readonly running: boolean
  readonly removed: boolean
  readonly blank: boolean
  /** Non-null on addressed subagent sessions — V1 never sends to those. */
  readonly subagent: unknown | null
  readonly openState?: string
  readonly openError?: unknown
  readonly queue?: readonly unknown[]
  readonly pendingSubmissions?: readonly unknown[]
}

/**
 * The whole outward sending face of one session, as consumed here. A session
 * that satisfies this type has NO draft-mutation capability: no setDraft, no
 * submit, no cancel, no editor, no command — the adapter physically cannot
 * touch an unsent draft, chips, attachments, selection, or undo history.
 */
export interface SessionSendFace {
  prompt(
    content: readonly PromptTextPart[],
    mode: RequestMode,
    signal?: AbortSignal,
    requestId?: string,
  ): Promise<PromptResult>
  /** Synchronous lifecycle read used for the click-time capture. */
  getSnapshot(): SessionSnapshotLike
}

/** Runtime resolution the sender uses once, synchronously, at click time. */
export interface SessionRuntime {
  readonly face: SessionSendFace
}

/** Host composer block (a plugin may make this session's input inert). */
export interface ComposerBlockLike {
  readonly reason?: string
}

/** Input admission phase published by the session input machine. */
export type InputPhase = 'plain' | 'adjudicating' | 'claimed' | 'submitting'

/** Connection lifecycle state of the browser wire. */
export type ConnectionState = 'connected' | 'disconnected' | 'connecting'

/** What the send coordinator needs from the bar at click time. */
export interface SendEnvironment {
  /** Resolve the session runtime; undefined = session not bound/listable. */
  resolveSession(sessionId: string): SessionRuntime | undefined
  /** Current connection lifecycle state; undefined = capability absent. */
  connectionState(): ConnectionState | undefined
  /** Current host composer block for the session, when one is raised. */
  composerBlockOf(sessionId: string): ComposerBlockLike | undefined
  /** Current input-machine phase (undefined when not observable). */
  inputPhase(): InputPhase | undefined
  /** Clock for debounce/expiry decisions. */
  now(): number
  /** Admission round-trip bound; on expiry the outcome is UNKNOWN (no resend). */
  admissionTimeoutMs(): number
  /** Same-session same-item post-settlement debounce window. */
  debounceMs(): number
}

/** Guard refusals — each maps to an actionable, truthful UI message. */
export type Refusal =
  | { readonly code: 'no-session' }
  | { readonly code: 'session-removed' }
  | { readonly code: 'session-not-open' }
  | { readonly code: 'session-blank' }
  | { readonly code: 'subagent-session' }
  | { readonly code: 'disconnected' }
  | { readonly code: 'composer-blocked' }
  | { readonly code: 'input-busy' }
  | { readonly code: 'item-disabled' }
  | { readonly code: 'no-session-face' }

/** Failure tones: business refusal vs outcome-unknown vs definitely not sent. */
export type FailureTone = 'business' | 'unknown' | 'cancelled'

/** Final result of one accepted send. */
export type SendResult =
  | { readonly kind: 'submitted'; readonly mode: RequestMode }
  | {
      readonly kind: 'failure'
      readonly tone: FailureTone
      /** Original remote code, when the failure carried one. */
      readonly code?: string
      readonly detail?: string
    }

/** Synchronous answer of `begin`: the lock was taken, or a refusal/dup. */
export type BeginAnswer =
  | { readonly kind: 'accepted'; readonly mode: RequestMode }
  | { readonly kind: 'refused'; readonly refusal: Refusal }
  | { readonly kind: 'busy' }
  | { readonly kind: 'duplicate-window' }

/** Latest user-facing send status of one session, stored per session. */
export interface SessionSendStatus {
  /** Admission in flight → every button of this session's bar is locked. */
  readonly busy: boolean
  /** Latest settled outcome for THIS session (messages never cross sessions). */
  readonly last: SendResult | null
}

/** Stable per-session state source the bar renders through. */
export interface SessionStatusStore {
  /** Current status for one session. */
  get(sessionId: string): SessionSendStatus
  /** Observe status changes for one session; returns the disposer. */
  subscribe(sessionId: string, listener: () => void): () => void
}

/** One library entry as the sender sees it (only what sending needs). */
export type SendableItem = Pick<QuickReply, 'id' | 'content' | 'enabled'>
