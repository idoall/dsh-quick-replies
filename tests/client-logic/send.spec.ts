/**
 * dsh-quick-replies — send-adapter contract specs (client logic, plain node).
 *
 * These are the "prove the sending adapter never touches the draft" tests:
 * the session runtime handed to the adapter exposes ONLY `prompt` and
 * `getSnapshot` (a hostile Proxy throws on any other member access), and every
 * spec asserts the adapter issues exactly one prompt per valid click, never
 * retries or falls back, and routes feedback back to the session captured at
 * click time.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ADMISSION_TIMEOUT_MS,
  DEFAULT_DEBOUNCE_MS,
  QuickReplySender,
} from '../../src/client/send/sender.ts'
import type {
  InputPhase,
  PromptResult,
  RequestMode,
  SendEnvironment,
  SessionSendFace,
  SessionSnapshotLike,
} from '../../src/client/send/faces.ts'

interface FakeClock { now: number; advance(ms: number): void }
function makeClock(start = 1000): FakeClock {
  return { now: start, advance(ms) { this.now += ms } }
}

function snapshotOf(overrides: Partial<SessionSnapshotLike> = {}): SessionSnapshotLike {
  return {
    running: false,
    removed: false,
    blank: false,
    subagent: null,
    openState: 'open',
    openError: null,
    ...overrides,
  }
}

interface PromptSpy {
  calls: Array<{ content: readonly { type: string; text: string }[]; mode: RequestMode }>
  queue: Array<PromptResult | (() => PromptResult)>
  pending: Array<{ resolve(result: PromptResult): void }>
}

/** Face with only `prompt` + `getSnapshot`; reading ANY other member throws. */
function hostileFace(spy: PromptSpy, read: () => SessionSnapshotLike): SessionSendFace {
  const inner = {
    prompt(content: readonly { type: string; text: string }[], mode: RequestMode): Promise<PromptResult> {
      spy.calls.push({ content, mode })
      const next = spy.queue.shift()
      if (next !== undefined) {
        return Promise.resolve(typeof next === 'function' ? next() : next)
      }
      return new Promise<PromptResult>((resolve) => { spy.pending.push({ resolve }) })
    },
    getSnapshot(): SessionSnapshotLike {
      return read()
    },
  }
  const allowed = new Set(['prompt', 'getSnapshot'])
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && !allowed.has(prop)) {
        throw new Error(`hostile face: adapter touched forbidden member "${String(prop)}"`)
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}

interface Harness {
  clock: FakeClock
  env: SendEnvironment
  sessions: Map<string, SessionSendFace>
  readSnapshots: Map<string, () => SessionSnapshotLike>
  sender: QuickReplySender
  register(sessionId: string, snapshot: SessionSnapshotLike, spy: PromptSpy): SessionSendFace
}

interface EnvOverrides {
  connection?: 'connected' | 'disconnected' | 'connecting'
  blockReason?: string
  phase?: InputPhase
  timeoutMs?: number
  debounceMs?: number
}

function makeHarness(overrides: EnvOverrides = {}, clock = makeClock()): Harness {
  const sessions = new Map<string, SessionSendFace>()
  const readSnapshots = new Map<string, () => SessionSnapshotLike>()
  const env: SendEnvironment = {
    resolveSession(sessionId) {
      const face = sessions.get(sessionId)
      return face === undefined ? undefined : { face }
    },
    connectionState: () => overrides.connection ?? 'connected',
    composerBlockOf: () => (overrides.blockReason === undefined ? undefined : { reason: overrides.blockReason }),
    inputPhase: () => overrides.phase ?? 'plain',
    now: () => clock.now,
    admissionTimeoutMs: () => overrides.timeoutMs ?? DEFAULT_ADMISSION_TIMEOUT_MS,
    debounceMs: () => overrides.debounceMs ?? DEFAULT_DEBOUNCE_MS,
  }
  const harness: Harness = {
    clock,
    env,
    sessions,
    readSnapshots,
    sender: new QuickReplySender(),
    register(sessionId, snapshot, spy) {
      const read = () => readSnapshots.get(sessionId)!()
      readSnapshots.set(sessionId, () => snapshot)
      const face = hostileFace(spy, read)
      sessions.set(sessionId, face)
      return face
    },
  }
  return harness
}

function freshSpy(): PromptSpy {
  return { calls: [], queue: [], pending: [] }
}

const item = (overrides: Partial<{ id: string; content: string; enabled: boolean }> = {}) => ({
  id: 'qr_1',
  content: '继续',
  enabled: true,
  ...overrides,
})

async function settledOf(begin: { settled?: Promise<unknown> }): Promise<unknown> {
  return begin.settled
}

describe('QuickReplySender — specified-text sending', () => {
  it('idle session ⇒ one prompt with mode queue and the exact text block', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: true, value: { accepted: true } })

    const begin = h.sender.begin(h.env, 'A', item())
    expect(begin.kind).toBe('accepted')
    if (begin.kind !== 'accepted') return
    expect(begin.mode).toBe('queue')
    await settledOf(begin)

    expect(spy.calls).toHaveLength(1)
    expect(spy.calls[0]!.content).toEqual([{ type: 'text', text: '继续' }])
    expect(spy.calls[0]!.mode).toBe('queue')
    expect(h.sender.promptCalls).toBe(1)
    expect(h.sender.get('A')).toEqual({ busy: false, last: { kind: 'submitted', mode: 'queue' } })
  })

  it('running top-level session ⇒ steer', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf({ running: true }), spy)
    spy.queue.push({ ok: true, value: { accepted: true } })

    const begin = h.sender.begin(h.env, 'A', item())
    expect(begin.kind).toBe('accepted')
    if (begin.kind !== 'accepted') return
    expect(begin.mode).toBe('steer')
    await settledOf(begin)
    expect(spy.calls).toHaveLength(1)
    expect(spy.calls[0]!.mode).toBe('steer')
  })

  it('never touches any other member of the session face (hostile proxy)', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: true, value: { accepted: true } })
    const begin = h.sender.begin(h.env, 'A', item())
    expect(begin.kind).toBe('accepted')
    if (begin.kind !== 'accepted') return
    await settledOf(begin)
    expect(h.sender.get('A').last?.kind).toBe('submitted')
  })

  it('double-tap in the same tick ⇒ exactly one request (synchronous lock)', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: true, value: { accepted: true } })

    const first = h.sender.begin(h.env, 'A', item())
    const second = h.sender.begin(h.env, 'A', item())
    expect(first.kind).toBe('accepted')
    expect(second.kind).toBe('busy')
    expect(h.sender.get('A').busy).toBe(true)
    await settledOf(first)
    expect(h.sender.promptCalls).toBe(1)
  })

  it('600ms same-session/same-item debounce swallows a reflexive re-click, then allows an intentional re-send', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: true, value: { accepted: true } })

    const first = h.sender.begin(h.env, 'A', item())
    expect(first.kind).toBe('accepted')
    await settledOf(first)
    expect(h.sender.promptCalls).toBe(1)

    h.clock.advance(200)
    const dup = h.sender.begin(h.env, 'A', item())
    expect(dup.kind).toBe('duplicate-window')
    expect(h.sender.promptCalls).toBe(1)

    h.clock.advance(500)
    spy.queue.push({ ok: true, value: { accepted: true } })
    const resend = h.sender.begin(h.env, 'A', item())
    expect(resend.kind).toBe('accepted')
    await settledOf(resend)
    expect(h.sender.promptCalls).toBe(2)
  })

  it('debounce never swallows a different item or another session', async () => {
    const h = makeHarness()
    const spyA = freshSpy()
    const spyB = freshSpy()
    h.register('A', snapshotOf(), spyA)
    spyA.queue.push({ ok: true, value: { accepted: true } })
    const first = h.sender.begin(h.env, 'A', item())
    await settledOf(first)

    h.clock.advance(100)
    spyA.queue.push({ ok: true, value: { accepted: true } })
    const otherItem = h.sender.begin(h.env, 'A', item({ id: 'qr_2', content: '下一步该做什么？' }))
    expect(otherItem.kind).toBe('accepted')
    await settledOf(otherItem)

    h.register('B', snapshotOf(), spyB)
    spyB.queue.push({ ok: true, value: { accepted: true } })
    const onB = h.sender.begin(h.env, 'B', item())
    expect(onB.kind).toBe('accepted')
    await settledOf(onB)
    expect(h.sender.promptCalls).toBe(3)
    expect(spyB.calls).toHaveLength(1)
  })

  it('guard refusals never issue a request and never lock the bar', async () => {
    const cases: Array<{
      name: string
      snapshot?: Partial<SessionSnapshotLike>
      env?: EnvOverrides
      itemOverrides?: Partial<{ id: string; content: string; enabled: boolean }>
      expected: string
    }> = [
      { name: 'removed', snapshot: { removed: true }, expected: 'session-removed' },
      { name: 'subagent', snapshot: { subagent: { address: {} } }, expected: 'subagent-session' },
      { name: 'not-open', snapshot: { openState: 'error', openError: { code: 'x' } }, expected: 'session-not-open' },
      { name: 'blank', snapshot: { blank: true }, expected: 'session-blank' },
      { name: 'blank-even-when-open', snapshot: { blank: true, openState: 'open' }, expected: 'session-blank' },
      { name: 'disconnected', env: { connection: 'disconnected' }, expected: 'disconnected' },
      { name: 'blocked', env: { blockReason: 'model locked' }, expected: 'composer-blocked' },
      { name: 'input-busy', env: { phase: 'submitting' }, expected: 'input-busy' },
      { name: 'disabled', itemOverrides: { enabled: false }, expected: 'item-disabled' },
    ]

    for (const c of cases) {
      const h = makeHarness(c.env)
      const spy = freshSpy()
      h.register(`S-${c.name}`, snapshotOf(c.snapshot), spy)
      const answer = h.sender.begin(h.env, `S-${c.name}`, item(c.itemOverrides))
      expect(answer.kind, c.name).toBe('refused')
      if (answer.kind === 'refused') expect(answer.refusal.code).toBe(c.expected)
      expect(spy.calls).toHaveLength(0)
      expect(h.sender.get(`S-${c.name}`).busy).toBe(false)
    }
  })

  it('missing session refuses cleanly', () => {
    const h = makeHarness()
    const answer = h.sender.begin(h.env, 'ghost', item())
    expect(answer.kind).toBe('refused')
    if (answer.kind === 'refused') expect(answer.refusal.code).toBe('no-session')
    expect(h.sender.promptCalls).toBe(0)
  })

  it('business refusal surfaces as a definite failure with no retry and no queue fallback', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: false, error: { code: 'session/agent-busy', message: 'busy' } })

    const begin = h.sender.begin(h.env, 'A', item())
    const result = await settledOf(begin)
    expect(result).toEqual({ kind: 'failure', tone: 'business', code: 'session/agent-busy', detail: 'busy' })
    expect(h.sender.promptCalls).toBe(1)
    expect(h.sender.get('A').busy).toBe(false)
    // No automatic second request appeared after the failure.
    expect(spy.calls).toHaveLength(1)
  })

  it('carrier/unclassified failures are outcome-UNKNOWN — never reported as sent', async () => {
    for (const failure of [
      { ok: false, error: { code: 'gateway/internal', message: 'dispatch failed' } },
      { ok: false, error: { message: 'weird' } },
    ] as Array<PromptResult>) {
      const h = makeHarness()
      const spy = freshSpy()
      h.register('A', snapshotOf(), spy)
      spy.queue.push(failure)
      const begin = h.sender.begin(h.env, 'A', item())
      expect(begin.kind).toBe('accepted')
      const result = await settledOf(begin)
      expect(result).toEqual(expect.objectContaining({ kind: 'failure', tone: 'unknown' }))
      expect(h.sender.promptCalls).toBe(1)
    }
  })

  it('admission timeout ⇒ unknown result and no automatic resend; late settlement never touches a newer attempt', async () => {
    const h = makeHarness({ timeoutMs: 30 })
    const snap = snapshotOf()
    const read = () => snap
    const firstPending: Array<{ resolve(result: PromptResult): void }> = []
    h.sessions.set('A', {
      prompt(): Promise<PromptResult> {
        return new Promise((resolve) => { firstPending.push({ resolve }) })
      },
      getSnapshot: () => read(),
    })

    const begin = h.sender.begin(h.env, 'A', item())
    expect(begin.kind).toBe('accepted')
    const unknown = await settledOf(begin)
    expect(unknown).toEqual({ kind: 'failure', tone: 'unknown' })
    expect(h.sender.get('A').busy).toBe(false)
    expect(h.sender.promptCalls).toBe(1)

    // Deliberate re-send while the first admission is still open.
    const secondPending: Array<{ resolve(result: PromptResult): void }> = []
    h.sessions.set('A', {
      prompt(): Promise<PromptResult> {
        return new Promise((resolve) => { secondPending.push({ resolve }) })
      },
      getSnapshot: () => read(),
    })
    const second = h.sender.begin(h.env, 'A', item())
    expect(second.kind).toBe('accepted')
    secondPending[0]!.resolve({ ok: true, value: { accepted: true } })
    const secondResult = await settledOf(second)
    expect(secondResult).toEqual({ kind: 'submitted', mode: 'queue' })

    // The first admission finally lands — it is ignored (seq guard).
    firstPending[0]!.resolve({ ok: true, value: { accepted: true } })
    await Promise.resolve()
    await Promise.resolve()
    expect(h.sender.get('A').last).toEqual({ kind: 'submitted', mode: 'queue' })
  })

  it('gateway/cancelled is reported as cancelled (not sent), never retried', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    h.register('A', snapshotOf(), spy)
    spy.queue.push({ ok: false, error: { code: 'gateway/cancelled', message: 'cancelled' } })
    const begin = h.sender.begin(h.env, 'A', item())
    const result = await settledOf(begin)
    expect(result).toEqual(expect.objectContaining({ kind: 'failure', tone: 'cancelled' }))
    expect(h.sender.promptCalls).toBe(1)
  })

  it('mode is captured at click time (a later running-state change cannot change it)', async () => {
    const h = makeHarness()
    const spy = freshSpy()
    const snap = snapshotOf({ running: true })
    h.register('A', snap, spy)
    spy.queue.push({ ok: true, value: { accepted: true } })

    const begin = h.sender.begin(h.env, 'A', item())
    const kind = (begin as { kind: string }).kind
    expect(kind).toBe('accepted')
    ;(snap as { running: boolean }).running = false // session state mutates after the click capture
    await settledOf(begin)
    expect(spy.calls[0]!.mode).toBe('steer')
  })

  it('busy state and feedback stay with the captured session; a sibling session is never polluted', async () => {
    const h = makeHarness()
    const spyA = freshSpy()
    const spyB = freshSpy()
    h.register('A', snapshotOf(), spyA)
    spyA.queue.push({ ok: true, value: { accepted: true } })

    const beginA = h.sender.begin(h.env, 'A', item())
    expect(h.sender.get('B').busy).toBe(false)
    await settledOf(beginA)
    expect(h.sender.get('A').last?.kind).toBe('submitted')
    expect(h.sender.get('B').last).toBeNull()

    h.register('B', snapshotOf(), spyB)
    spyB.queue.push({ ok: true, value: { accepted: true } })
    const beginB = h.sender.begin(h.env, 'B', item({ id: 'qr_b', content: '你好' }))
    await settledOf(beginB)
    expect(spyB.calls[0]!.content[0]!.text).toBe('你好')
    expect(spyA.calls).toHaveLength(1)
  })
})
