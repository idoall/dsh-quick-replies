/**
 * dsh-quick-replies — library store specs (fake settings scope).
 */
import { describe, expect, it } from 'vitest'
import { createLibraryStore } from '../../src/client/settings/libraryStore.ts'
import type { SettingsPathOpLike, SettingsScopeLike, SettingsScopeSnapshotLike } from '../../src/client/settings/scopeFaces.ts'

function makeScope(initial: {
  status?: 'loading' | 'ready' | 'unavailable'
  value?: unknown
  writable?: boolean
  mode?: 'host' | 'memory'
  revision?: number
} = {}) {
  const snap: SettingsScopeSnapshotLike = {
    status: initial.status ?? 'ready',
    value: initial.value as never,
    base: undefined,
    user: initial.value === undefined ? undefined : { items: (initial.value as { items?: unknown }).items },
    revision: initial.revision,
    writable: initial.writable ?? true,
    mode: initial.mode ?? 'host',
  }
  const listeners = new Set<() => void>()
  const calls: Array<{ ops: readonly SettingsPathOpLike[]; expectedRevision?: number }> = []
  let failMutate: Error | null = null
  const scope: SettingsScopeLike = {
    getSnapshot: () => snap,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async mutate(ops, expectedRevision) {
      // The scope records the operation it would send before the Host refusal.
      calls.push({ ops, expectedRevision })
      if (failMutate !== null) {
        const error = failMutate
        failMutate = null
        // Mirror recovery read follows a refused write in the real client.
        for (const listener of [...listeners]) listener()
        throw error
      }
      // Simulate the Host applying the write and bumping the revision.
      for (const op of ops) {
        if (op.op === 'set' && op.path[0] === 'items') {
          snap.user = { items: op.value }
          snap.value = { schemaVersion: 1, items: op.value } as never
        }
      }
      snap.revision = (snap.revision ?? 0) + 1
      for (const listener of [...listeners]) listener()
    },
  }
  return {
    scope,
    snap,
    calls,
    listeners,
    setSnapshot(next: Partial<SettingsScopeSnapshotLike>) {
      Object.assign(snap, next)
      for (const listener of [...listeners]) listener()
    },
    failNext(error: Error) { failMutate = error },
  }
}

const readyValue = (items: unknown[]) => ({ schemaVersion: 1, items })

describe('library store', () => {
  it('starts loading and exposes NO items while the scope has not delivered a value', () => {
    const scope = makeScope({ status: 'loading' })
    const store = createLibraryStore()
    store.attach(scope.scope)
    expect(store.get()).toMatchObject({ status: 'loading', items: [], editable: false })
  })

  it('becomes editable & ready once a valid value arrives', () => {
    const scope = makeScope({ status: 'loading' })
    const store = createLibraryStore()
    store.attach(scope.scope)
    scope.setSnapshot({ status: 'ready', value: readyValue([{ id: 'a', label: '继续', content: '继续', enabled: true }]) as never, revision: 3, user: {} })
    const state = store.get()
    expect(state.status).toBe('ready')
    expect(state.items).toHaveLength(1)
    expect(state.editable).toBe(true)
    expect(state.revision).toBe(3)
    expect(state.note).toBe('ok')
  })

  it('memory mode is read-only with a truthful note (never claims persistence)', () => {
    const scope = makeScope({ value: readyValue([]), mode: 'memory', writable: false, revision: 1 })
    const store = createLibraryStore()
    store.attach(scope.scope)
    const state = store.get()
    expect(state.status).toBe('ready')
    expect(state.editable).toBe(false)
    expect(state.note).toBe('memory')
  })

  it('unavailable scope disables everything with the storage note', () => {
    const scope = makeScope({ status: 'unavailable' })
    const store = createLibraryStore()
    store.attach(scope.scope)
    expect(store.get()).toMatchObject({ status: 'unavailable', editable: false, note: 'unavailable', items: [] })
  })

  it('an unknown future schema version is read-only, keeps the last confirmed snapshot for sending, and never downgrades', () => {
    const scope = makeScope({ value: readyValue([{ id: 'a', label: '继续', content: '继续', enabled: true }]), revision: 1 })
    const store = createLibraryStore()
    store.attach(scope.scope)
    expect(store.get().items).toHaveLength(1)

    // Another device writes a v2 document.
    scope.setSnapshot({ value: { schemaVersion: 2, items: [{ id: 'b', label: 'x', content: 'y', enabled: true }] } as never, revision: 2, user: { schemaVersion: 2 } })
    const state = store.get()
    expect(state.editable).toBe(false)
    expect(state.note).toBe('unsupported-version')
    // Last confirmed snapshot is retained for sending, flagged as storage problem.
    expect(state.items[0]!.id).toBe('a')
    expect(state.lastGoodItems[0]!.id).toBe('a')
  })

  it('save persists the whole library through one namespace mutation with the given revision fence', async () => {
    const scope = makeScope({ value: readyValue([]), revision: 7 })
    const store = createLibraryStore()
    store.attach(scope.scope)
    const next = [{ id: 'x', label: '继续', content: '继续', enabled: true }]
    await store.save({ items: next, expectedRevision: 7 })
    expect(scope.calls).toHaveLength(1)
    expect(scope.calls[0]).toEqual({ ops: [{ op: 'set', path: ['items'], value: next }], expectedRevision: 7 })
    // The mirror applied the write and the store follows it.
    expect(store.get().items[0]!.id).toBe('x')
    expect(store.get().revision).toBe(8)
  })

  it('a revision conflict rejects WITHOUT overwriting and the caller keeps its form (no auto retry)', async () => {
    const scope = makeScope({ value: readyValue([]), revision: 5 })
    const store = createLibraryStore()
    store.attach(scope.scope)
    scope.failNext(new Error('settings/conflict'))
    await expect(store.save({ items: [{ id: 'x', label: 'y', content: 'z', enabled: true }], expectedRevision: 5 }))
      .rejects.toThrow('settings/conflict')
    expect(scope.calls).toHaveLength(1)
    // Nothing was written and the store still holds the old value.
    expect(store.get().items).toHaveLength(0)
    expect(store.get().revision).toBe(5)
  })
})
