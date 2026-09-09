/**
 * dsh-quick-replies — the quick-send adapter.
 *
 * This module is the whole "send a specified text without touching the draft"
 * contract. It is DOM-free and testable with a fake clock and fake session
 * runtime. Hard rules implemented here (see docs/REQUIREMENTS.md FR-03):
 *
 * 1. The ONLY session member invoked is the public `prompt` RPC with the
 *    captured text as one `{type:'text'}` block and an explicit mode. The
 *    session face type has no draft/edit/cancel member at all, so the adapter
 *    cannot read a draft, cannot replace a draft, cannot submit an editor, and
 *    cannot cancel anything.
 * 2. Click-time capture: session id, item id, body, and lifecycle facts are
 *    read synchronously before any await; nothing after the click re-reads the
 *    "current" session.
 * 3. Mode decision: not running → `queue`; running → `steer`. The host keeps
 *    its own right to downgrade steer; the plugin never cancels/stops and
 *    never claims "interrupted".
 * 4. One valid click ⇒ at most one request: a synchronous per-session lock is
 *    taken before the first await (fast double-taps are refused `busy`), and a
 *    600 ms same-session/same-item window swallows reflexive re-clicks after a
 *    settled send. No automatic retry and no automatic queue fallback ever
 *    runs; an unknown outcome stays unknown until the user deliberately
 *    re-sends after checking the session.
 */
import type {
  BeginAnswer,
  PromptResult,
  Refusal,
  RequestMode,
  SendEnvironment,
  SendResult,
  SendableItem,
  SessionSendFace,
  SessionSendStatus,
  SessionSnapshotLike,
  SessionStatusStore,
} from './faces.ts'

export const DEFAULT_DEBOUNCE_MS = 600
export const DEFAULT_ADMISSION_TIMEOUT_MS = 15_000

/**
 * Remote failure codes that are a DEFINITE business refusal (the prompt was
 * not admitted, the answer is authoritative). Everything else — carrier,
 * dispatch, or unclassified failures — is outcome-UNKNOWN: the plugin must
 * not pretend the message did or did not land.
 */
const BUSINESS_REFUSAL_CODES = new Set([
  'gateway/bad-request',
  'session/not-found',
  'session/agent-busy',
  'session/model-unavailable',
  'session/conflict',
  'session/steer-unavailable',
  'session/invalid-time-zone',
  'session/attachment-invalid',
])

function refused(code: Refusal['code']): { readonly kind: 'refused'; readonly refusal: Refusal } {
  return { kind: 'refused', refusal: { code } }
}

interface SessionState {
  busy: boolean
  /** Monotonic attempt counter — a late settlement of an older attempt never clobbers a newer one. */
  seq: number
  last: SendResult | null
  lastSubmittedAt: number
  lastSubmittedItemId: string | null
  /** Reference-stable published view (useSyncExternalStore-safe). */
  view: SessionSendStatus
}

export class QuickReplySender implements SessionStatusStore {
  private readonly sessions = new Map<string, SessionState>()
  private readonly listeners = new Map<string, Set<() => void>>()

  /** @internal test seam: number of prompt calls issued (specs assert this). */
  promptCalls = 0

  private ensure(sessionId: string): SessionState {
    let state = this.sessions.get(sessionId)
    if (state === undefined) {
      state = {
        busy: false,
        seq: 0,
        last: null,
        lastSubmittedAt: 0,
        lastSubmittedItemId: null,
        view: { busy: false, last: null },
      }
      this.sessions.set(sessionId, state)
    }
    return state
  }

  private notify(sessionId: string): void {
    const set = this.listeners.get(sessionId)
    if (set === undefined) return
    for (const listener of [...set]) {
      try {
        listener()
      } catch {
        // A broken listener must never break the sender.
      }
    }
  }

  /** Rebuild the published view from state and fan out (one publish site). */
  private publish(sessionId: string, state: SessionState): void {
    state.view = { busy: state.busy, last: state.last }
    this.notify(sessionId)
  }

  get(sessionId: string): SessionSendStatus {
    const state = this.ensure(sessionId)
    return state.view
  }

  subscribe(sessionId: string, listener: () => void): () => void {
    let set = this.listeners.get(sessionId)
    if (set === undefined) {
      set = new Set()
      this.listeners.set(sessionId, set)
    }
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(sessionId)
    }
  }

  /** Forget per-session state (bar teardown; settled feedback is already recorded). */
  dispose(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.listeners.delete(sessionId)
  }

  /**
   * Synchronously attempt one send. Every guard runs before any await; when the
   * answer is `accepted`, the per-session lock is already held and `settled`
   * resolves when the admission round-trip settles (or expires).
   */
  begin(
    env: SendEnvironment,
    sessionId: string,
    item: SendableItem,
  ): BeginAnswer & { settled?: Promise<SendResult> } {
    const state = this.ensure(sessionId)
    // The lock is synchronous: two clicks in the same tick both observe busy.
    if (state.busy) return { kind: 'busy' }

    let runtime
    try {
      runtime = env.resolveSession(sessionId)
    } catch {
      return refused('no-session-face')
    }
    if (runtime === undefined) return refused('no-session')

    let snapshot: SessionSnapshotLike
    try {
      snapshot = runtime.face.getSnapshot()
    } catch {
      return refused('no-session-face')
    }

    const guard = this.guard(env, sessionId, item, snapshot)
    if (guard !== null) return refused(guard)

    const mode: RequestMode = snapshot.running === true ? 'steer' : 'queue'

    // Same-session/same-item debounce AFTER a settled submission: absorbs a
    // reflexive re-click, never swallows an intentional re-send.
    const now = env.now()
    const withinDebounce = state.lastSubmittedItemId === item.id
      && state.lastSubmittedAt !== 0
      && now - state.lastSubmittedAt < env.debounceMs()
    if (withinDebounce) return { kind: 'duplicate-window' }

    // Take the lock and notify (buttons lock synchronously).
    const seq = state.seq + 1
    state.seq = seq
    state.busy = true
    state.last = null
    this.publish(sessionId, state)

    const text = item.content
    const face = runtime.face
    const settled = this.runAdmission(env, sessionId, face, item.id, text, mode, seq, now)
    return { kind: 'accepted', mode, settled }
  }

  /** Pre-flight checks; a non-null return refuses the send. */
  private guard(
    env: SendEnvironment,
    sessionId: string,
    item: SendableItem,
    snapshot: SessionSnapshotLike,
  ): Refusal['code'] | null {
    if (!item.enabled) return 'item-disabled'
    if (snapshot.removed === true) return 'session-removed'
    if (snapshot.subagent !== null && snapshot.subagent !== undefined) return 'subagent-session'
    if (snapshot.openState !== undefined
      && snapshot.openState !== 'open' && snapshot.openState !== 'cold' && snapshot.openState !== 'loading') {
      return 'session-not-open'
    }
    if (snapshot.openError !== undefined && snapshot.openError !== null) return 'session-not-open'
    // A blank session has no history yet: sending a reply (especially a resume
    // phrase like 继续) would materialize a brand-new conversation with no
    // context. Refuse instead of silently creating one.
    if (snapshot.blank === true) return 'session-blank'
    try {
      if (env.connectionState() === 'disconnected') return 'disconnected'
    } catch {
      // Capability absent → proceed; the RPC failure path stays truthful.
    }
    try {
      if (env.composerBlockOf(sessionId) !== undefined) return 'composer-blocked'
    } catch {
      // Block unobservable → proceed (documented residual; see AGENTS.md).
    }
    try {
      if (env.inputPhase() !== undefined && env.inputPhase() !== 'plain') return 'input-busy'
    } catch {
      // Phase unobservable → proceed; admission still cannot be double-started.
    }
    return null
  }

  private async runAdmission(
    env: SendEnvironment,
    sessionId: string,
    face: SessionSendFace,
    itemId: string,
    text: string,
    mode: RequestMode,
    seq: number,
    startedAt: number,
  ): Promise<SendResult> {
    this.promptCalls += 1
    let settled: SendResult
    try {
      const admission = face.prompt([{ type: 'text', text }], mode)
      settled = await this.raceAdmission(env, admission, mode)
    } catch {
      // Assembly fault / hostile transport: never retried, definitely not sent.
      settled = { kind: 'failure', tone: 'cancelled' }
    }

    const state = this.sessions.get(sessionId)
    if (state !== undefined && state.seq === seq) {
      state.busy = false
      if (settled.kind === 'submitted') {
        state.lastSubmittedAt = startedAt
        state.lastSubmittedItemId = itemId
      }
      state.last = settled
      this.publish(sessionId, state)
    }
    return settled
  }

  /**
   * Bound the admission round-trip. On expiry the outcome is UNKNOWN and this
   * attempt's lock is released; the underlying promise is deliberately NOT
   * aborted and NOT re-sent. If it settles later it can only update this same
   * attempt (never a newer one — `seq` guards every write).
   */
  private async raceAdmission(
    env: SendEnvironment,
    admission: Promise<PromptResult>,
    mode: RequestMode,
  ): Promise<SendResult> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const expiry = new Promise<'expired'>((resolve) => {
      timer = setTimeout(() => resolve('expired'), env.admissionTimeoutMs())
    })
    try {
      const outcome = await Promise.race([admission, expiry])
      if (outcome === 'expired') return { kind: 'failure', tone: 'unknown' }
      return this.classify(outcome, mode)
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  private classify(result: PromptResult, mode: RequestMode): SendResult {
    if (result.ok && result.value.accepted === true) {
      return { kind: 'submitted', mode }
    }
    const error = (result as { ok: false; error: { code?: string; message?: string } }).error
    const code = error?.code
    const detail = error?.message
    if (code !== undefined && BUSINESS_REFUSAL_CODES.has(code)) {
      return { kind: 'failure', tone: 'business', code, detail }
    }
    if (code === 'gateway/cancelled') {
      return { kind: 'failure', tone: 'cancelled', code, detail }
    }
    // Carrier / dispatch / unclassified → outcome UNKNOWN, never a retry.
    return { kind: 'failure', tone: 'unknown', code, detail }
  }
}

/** Per-plugin singleton sender shared across every mounted bar. */
export function createSender(): QuickReplySender {
  return new QuickReplySender()
}
