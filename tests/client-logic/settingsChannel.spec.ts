/**
 * dsh-quick-replies — settings channel specs.
 *
 * Locks the LAN fix: on a non-loopback page DSH's official `settingsScope` is
 * deliberately `unavailable` (documented "Non-loopback pages get no durable
 * settings"), and the library must still reach its ONE source of truth — the
 * Host `quick-replies` namespace — through the direct channel.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  createHostDirectScope,
  settingsInvalidationsOf,
  settingsRemoteFace,
  settingsRemoteOf,
  SettingsWriteFailure,
  type SettingsNamespaceViewLike,
  type SettingsRemoteLike,
  type SettingsRemoteOutcome,
} from '../../src/client/settings/hostDirectScope.ts'
import { createSettingsChannel } from '../../src/client/settings/settingsChannel.ts'
import { createLibraryStore } from '../../src/client/settings/libraryStore.ts'
import type {
  SettingsPathOpLike,
  SettingsScopeLike,
  SettingsScopeSnapshotLike,
} from '../../src/client/settings/scopeFaces.ts'
import type { QuickReplySettings } from '../../src/shared/types.ts'

const NS = 'quick-replies'

interface Row {
  ns: string
  value: unknown
  base?: unknown
  user?: unknown
  revision: number
}

/** Let every pending microtask/timer hop of a wire round-trip settle. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const section = (items: unknown[]): QuickReplySettings => ({
  schemaVersion: 1,
  items: items as QuickReplySettings['items'],
})
const item = (id: string, label = id) => ({ id, label, content: label, enabled: true })

/** Fake `remote.settings` face with observable calls and injectable failures. */
function makeRemote(initial: { writable?: boolean; rows?: Row[] } = {}) {
  let writable = initial.writable ?? true
  let rows: Row[] = initial.rows ?? [{ ns: NS, value: section([]), revision: 1 }]
  let describeFailure: { message: string } | undefined
  let mutateFailure: { code: string; message?: string } | undefined
  const describeCalls: number[] = []
  const mutateCalls: Array<{ ns: string; ops: readonly SettingsPathOpLike[]; expectedRevision?: number }> = []

  const remote: SettingsRemoteLike = {
    async describe(): Promise<SettingsRemoteOutcome<{ writable: boolean; hasDocument: boolean; namespaces: Row[] }>> {
      describeCalls.push(describeCalls.length + 1)
      if (describeFailure !== undefined) return { ok: false, error: { ...describeFailure } }
      return {
        ok: true,
        value: { writable, hasDocument: true, namespaces: rows.map(row => ({ ...row })) },
      }
    },
    async mutate(
      ns: string,
      ops: readonly SettingsPathOpLike[],
      expectedRevision?: number,
    ): Promise<SettingsRemoteOutcome<SettingsNamespaceViewLike>> {
      mutateCalls.push(expectedRevision === undefined ? { ns, ops } : { ns, ops, expectedRevision })
      if (mutateFailure !== undefined) return { ok: false, error: { ...mutateFailure } }
      const row = rows.find(candidate => candidate.ns === ns)
      if (row === undefined) return { ok: false, error: { code: 'settings/unknown-namespace' } }
      if (expectedRevision !== undefined && expectedRevision !== row.revision) {
        return { ok: false, error: { code: 'settings/conflict', message: 'stale revision' } }
      }
      for (const op of ops) {
        if (op.op === 'set' && op.path[0] === 'items') row.value = section(op.value as unknown[])
      }
      row.revision += 1
      return { ok: true, value: { ...row } }
    },
  }

  return {
    remote,
    describeCalls,
    mutateCalls,
    setRows(next: Row[]) { rows = next },
    rows: () => rows,
    setWritable(next: boolean) { writable = next },
    failDescribe(message?: string) { describeFailure = { message: message ?? 'describe refused' } },
    healDescribe() { describeFailure = undefined },
    failMutate(code: string, message?: string) { mutateFailure = message === undefined ? { code } : { code, message } },
    healMutate() { mutateFailure = undefined },
  }
}

/** Fake official settings scope (the shape `settingsScope.bind()` answers with). */
function makeOfficial(initial: Partial<SettingsScopeSnapshotLike> = {}) {
  const snap: SettingsScopeSnapshotLike = {
    status: 'loading',
    value: undefined,
    base: undefined,
    user: undefined,
    revision: undefined,
    writable: false,
    mode: 'host',
    ...initial,
  }
  const listeners = new Set<() => void>()
  const mutations: Array<{ ops: readonly SettingsPathOpLike[]; expectedRevision?: number }> = []
  const scope: SettingsScopeLike = {
    getSnapshot: () => snap,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async mutate(ops, expectedRevision) {
      mutations.push(expectedRevision === undefined ? { ops } : { ops, expectedRevision })
    },
  }
  return {
    scope,
    snap,
    mutations,
    set(next: Partial<SettingsScopeSnapshotLike>) {
      Object.assign(snap, next)
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('hostDirectScope (non-loopback Host settings channel)', () => {
  it('derives the official per-namespace snapshot shape from the namespace row', async () => {
    const remote = makeRemote({
      rows: [{ ns: NS, value: section([item('a')]), base: { items: [] }, user: { items: [item('a')] }, revision: 7 }],
    })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    expect(scope.getSnapshot()).toEqual({
      status: 'ready',
      value: section([item('a')]),
      base: { items: [] },
      user: { items: [item('a')] },
      revision: 7,
      writable: true,
      mode: 'host',
    })
    expect(remote.describeCalls).toHaveLength(1)
  })

  it('is unavailable (with the document writability) when the Host serves no such namespace', async () => {
    const remote = makeRemote({ writable: false, rows: [{ ns: 'other', value: {}, revision: 3 }] })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    expect(scope.getSnapshot()).toMatchObject({ status: 'unavailable', value: undefined, writable: false, mode: 'host' })
  })

  it('a refused read publishes unavailable but NEVER discards a held document', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([item('a')]), revision: 2 }] })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    expect(scope.getSnapshot().status).toBe('ready')

    remote.failDescribe('boom')
    await scope.load()
    // Held document stays authoritative for sending…
    expect(scope.getSnapshot()).toMatchObject({ status: 'ready', revision: 2 })
    expect(scope.lastError()).toBe('boom')

    remote.healDescribe()
    await scope.load()
    expect(scope.lastError()).toBeUndefined()
  })

  it('reports unavailable when the very first read is refused (no fabricated state)', async () => {
    const remote = makeRemote()
    remote.failDescribe('offline')
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    expect(scope.getSnapshot()).toMatchObject({ status: 'unavailable', value: undefined })
    expect(scope.lastError()).toBe('offline')
  })

  it('mutate sends the namespace, ops and revision fence, and folds the answer without a second read', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([]), revision: 4 }] })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    const next = [item('a')]
    await scope.mutate([{ op: 'set', path: ['items'], value: next }], 4)
    expect(remote.mutateCalls).toEqual([{ ns: NS, ops: [{ op: 'set', path: ['items'], value: next }], expectedRevision: 4 }])
    expect(remote.describeCalls).toHaveLength(1) // folded, not re-read
    expect(scope.getSnapshot()).toMatchObject({ status: 'ready', revision: 5, writable: true })
    expect(scope.getSnapshot().value).toEqual(section(next))
  })

  it('a refused write REJECTS with the Host code and re-syncs the authoritative document', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([]), revision: 4 }] })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()

    // Another device moved the namespace ahead: the fence is refused.
    remote.setRows([{ ns: NS, value: section([item('other')]), revision: 9 }])
    const failure = await scope.mutate([{ op: 'set', path: ['items'], value: [item('mine')] }], 4)
      .then(() => undefined, (error: unknown) => error)
    expect(failure).toBeInstanceOf(SettingsWriteFailure)
    expect((failure as SettingsWriteFailure).code).toBe('settings/conflict')
    expect(remote.describeCalls).toHaveLength(2) // recovery read
    expect(scope.getSnapshot()).toMatchObject({ revision: 9 })
    expect(scope.getSnapshot().value).toEqual(section([item('other')]))
  })

  it('serializes queued writes in issue order', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([]), revision: 1 }] })
    const scope = createHostDirectScope(remote.remote, NS)
    await scope.load()
    let inFlight = 0
    let maxInFlight = 0
    const order: string[] = []
    const originalMutate = remote.remote.mutate.bind(remote.remote)
    remote.remote.mutate = async (ns, ops, revision) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      order.push(`start:${String((ops[0] as { value?: unknown }).value)}`)
      await new Promise(resolve => setTimeout(resolve, 5))
      const outcome = await originalMutate(ns, ops, revision)
      inFlight -= 1
      order.push(`end:${String((ops[0] as { value?: unknown }).value)}`)
      return outcome
    }
    await Promise.all([
      scope.mutate([{ op: 'set', path: ['items'], value: ['first'] }]),
      scope.mutate([{ op: 'set', path: ['items'], value: ['second'] }]),
    ])
    expect(maxInFlight).toBe(1)
    expect(order).toEqual(['start:first', 'end:first', 'start:second', 'end:second'])
  })

  it('stops notifying after dispose', async () => {
    const remote = makeRemote()
    const scope = createHostDirectScope(remote.remote, NS)
    const listener = vi.fn()
    scope.subscribe(listener)
    scope.dispose()
    await scope.load()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('settingsRemoteOf / settingsInvalidationsOf guards', () => {
  it('reads the LITERAL injected service key first and still accepts the nested payload shape', () => {
    const remote = makeRemote().remote
    expect(settingsRemoteOf({ 'remote.settings': remote })).toBe(remote)
    expect(settingsRemoteOf({ remote: { settings: remote } })).toBe(remote)
    expect(settingsRemoteFace(remote)).toBe(remote)
    expect(settingsRemoteOf({ remote: { settings: { describe: () => undefined } } })).toBeUndefined()
    expect(settingsRemoteOf({ remote: {} })).toBeUndefined()
    expect(settingsRemoteOf(undefined)).toBeUndefined()
    expect(settingsRemoteOf('remote.settings')).toBeUndefined()
    expect(settingsRemoteFace(undefined)).toBeUndefined()
    expect(settingsRemoteFace({ describe: () => undefined })).toBeUndefined()
  })

  it('never throws when the injected context REFUSES the dotted parent (LAN wiring regression)', () => {
    const remote = makeRemote().remote
    // What a real `ctx.inject(['remote.settings'], …)` payload does: the dotted
    // parent is not injected, so reading it throws.
    const payload = {
      'remote.settings': remote,
      get remote(): never {
        throw new Error('cannot get property "remote" without inject')
      },
    }
    expect(settingsRemoteOf(payload)).toBe(remote)

    const withoutLiteral = {
      get remote(): never {
        throw new Error('cannot get property "remote" without inject')
      },
    }
    expect(() => settingsRemoteOf(withoutLiteral)).not.toThrow()
    expect(settingsRemoteOf(withoutLiteral)).toBeUndefined()
  })

  it('subscribes to the Host settings invalidation on the Remote service and returns its disposer', () => {
    const dispose = vi.fn()
    const on = vi.fn(() => dispose)
    const subscribe = settingsInvalidationsOf({ $on: on })
    expect(typeof subscribe).toBe('function')
    const off = subscribe!(vi.fn())
    expect(on).toHaveBeenCalledWith('settings/document-updated', expect.any(Function))
    expect(off).toBe(dispose)
    expect(settingsInvalidationsOf({})).toBeUndefined()
    expect(settingsInvalidationsOf(undefined)).toBeUndefined()
  })
})

describe('settingsChannel (official scope vs direct Host channel)', () => {
  it('stays loading while no channel has answered', () => {
    const channel = createSettingsChannel({ openDirect: () => undefined })
    expect(channel.getSnapshot().status).toBe('loading')
  })

  it('keeps the official scope whenever it is not unavailable, and never opens the direct channel', () => {
    const official = makeOfficial({ status: 'ready', value: section([item('a')]), writable: true, revision: 3 })
    const openDirect = vi.fn(() => {
      throw new Error('the direct channel must not open on a loopback page')
    })
    const channel = createSettingsChannel({ openDirect })
    channel.setOfficial(official.scope)
    expect(channel.getSnapshot()).toMatchObject({ status: 'ready', revision: 3 })
    expect(openDirect).not.toHaveBeenCalled()

    official.set({ revision: 4 })
    expect(channel.getSnapshot().revision).toBe(4)
  })

  it('falls back to the direct Host channel when the official scope reports unavailable (the LAN page)', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([item('lan')]), revision: 11 }] })
    const official = makeOfficial({ status: 'unavailable', writable: false, mode: 'memory' })
    const channel = createSettingsChannel({ openDirect: () => createHostDirectScope(remote.remote, NS) })
    channel.setOfficial(official.scope)
    // The direct channel is opened lazily and answers asynchronously.
    expect(channel.getSnapshot().status).toBe('loading')
    await flush()
    expect(channel.getSnapshot()).toMatchObject({ status: 'ready', revision: 11, mode: 'host', writable: true })
  })

  it('opens the direct channel when it appears after the official scope (injection order)', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([item('late')]), revision: 2 }] })
    const official = makeOfficial({ status: 'unavailable', mode: 'memory' })
    let available = false
    const channel = createSettingsChannel({ openDirect: () => (available ? createHostDirectScope(remote.remote, NS) : undefined) })
    channel.setOfficial(official.scope)
    expect(channel.getSnapshot().status).toBe('unavailable')

    available = true
    channel.refresh()
    await flush()
    expect(channel.getSnapshot()).toMatchObject({ status: 'ready', mode: 'host' })
  })

  it('hands authority back to the official scope once it stops being unavailable', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([item('direct')]), revision: 5 }] })
    const official = makeOfficial({ status: 'unavailable', mode: 'memory' })
    const channel = createSettingsChannel({ openDirect: () => createHostDirectScope(remote.remote, NS) })
    channel.setOfficial(official.scope)
    await flush()
    expect(channel.getSnapshot().revision).toBe(5)

    official.set({ status: 'ready', value: section([item('official')]), writable: true, revision: 6 })
    expect(channel.getSnapshot()).toMatchObject({ revision: 6 })
    expect((channel.getSnapshot().value as { items: Array<{ id: string }> }).items[0]!.id).toBe('official')
  })

  it('routes writes to the active channel and refuses with no channel at all', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([]), revision: 1 }] })
    const official = makeOfficial({ status: 'unavailable', mode: 'memory' })
    const channel = createSettingsChannel({ openDirect: () => createHostDirectScope(remote.remote, NS) })
    channel.setOfficial(official.scope)
    await flush()
    await channel.mutate([{ op: 'set', path: ['items'], value: [item('x')] }], 1)
    expect(remote.mutateCalls).toHaveLength(1)
    expect(official.mutations).toHaveLength(0)

    const empty = createSettingsChannel({ openDirect: () => undefined })
    await expect(empty.mutate([{ op: 'set', path: ['items'], value: [] }]))
      .rejects.toThrow('settings channel is unavailable')
  })

  it('reload() refreshes the direct channel through the invalidation seam', async () => {
    const remote = makeRemote({ rows: [{ ns: NS, value: section([item('a')]), revision: 1 }] })
    const official = makeOfficial({ status: 'unavailable', mode: 'memory' })
    const channel = createSettingsChannel({ openDirect: () => createHostDirectScope(remote.remote, NS) })
    channel.setOfficial(official.scope)
    await flush()
    expect(remote.describeCalls).toHaveLength(1)

    remote.setRows([{ ns: NS, value: section([item('a'), item('b')]), revision: 2 }])
    channel.reload()
    await flush()
    expect(remote.describeCalls).toHaveLength(2)
    expect(channel.getSnapshot().revision).toBe(2)
  })
})

describe('LAN regression: the library is usable on a non-loopback page', () => {
  it('becomes ready, editable and writable over the direct Host channel', async () => {
    const remote = makeRemote({
      rows: [{
        ns: NS,
        value: section([item('qr-a', '继续'), item('qr-b', '下一步')]),
        base: { items: [] },
        user: { items: [item('qr-a', '继续'), item('qr-b', '下一步')] },
        revision: 21,
      }],
    })
    // Exactly what DSH answers on a LAN page: an inert, process-local scope.
    const official = makeOfficial({ status: 'unavailable', writable: false, mode: 'memory' })
    const channel = createSettingsChannel({ openDirect: () => createHostDirectScope(remote.remote, NS) })
    const library = createLibraryStore()

    channel.setOfficial(official.scope)
    library.attach(channel)
    expect(library.get()).toMatchObject({ status: 'loading', editable: false })

    await flush()
    const state = library.get()
    expect(state).toMatchObject({ status: 'ready', editable: true, note: 'ok', revision: 21 })
    expect(state.items.map(entry => entry.id)).toEqual(['qr-a', 'qr-b'])

    // And the management UI can persist the whole library (shared with every device).
    await library.save({ items: [item('only')], expectedRevision: 21 })
    expect(remote.mutateCalls).toHaveLength(1)
    expect(remote.mutateCalls[0]!.ns).toBe(NS)
    expect(remote.mutateCalls[0]!.expectedRevision).toBe(21)
    expect(library.get()).toMatchObject({ status: 'ready', revision: 22 })
  })
})
