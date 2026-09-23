/**
 * dsh-quick-replies — official settings-form adapter specs.
 *
 * DSH 0.1.7 removed the per-namespace `settingsScope` service and replaced it
 * with `ctx.configForms.get(entryId)`. These specs lock three things the rest of
 * the plugin relies on: the projection onto the plugin's own scope contract, the
 * refusal translation the management UI needs (a rejected write must REJECT, not
 * silently succeed), and the channel selection that keeps the LAN fallback
 * reachable when the official form is pinned to `memory`.
 */
import { describe, expect, it, vi } from 'vitest'
import {
  configFormScope,
  configFormsOf,
  type ConfigFormLike,
  type ConfigFormSnapshotLike,
} from '../../src/client/settings/configFormScope.ts'
import { SettingsWriteFailure } from '../../src/client/settings/hostDirectScope.ts'
import { createSettingsChannel } from '../../src/client/settings/settingsChannel.ts'
import { createLibraryStore } from '../../src/client/settings/libraryStore.ts'
import type { SettingsPathOpLike, SettingsScopeSnapshotLike } from '../../src/client/settings/scopeFaces.ts'
import { QR_NAMESPACE } from '../../src/shared/limits.ts'
import type { QuickReplySettings } from '../../src/shared/types.ts'

const NS = QR_NAMESPACE

const section = (items: unknown[]): QuickReplySettings => ({
  schemaVersion: 1,
  items: items as QuickReplySettings['items'],
})
const item = (id: string) => ({ id, label: id, content: id, enabled: true })

/** Fake of the official `ConfigForm<T>` surface with switchable write outcomes. */
function makeConfigForm(initial: Partial<ConfigFormSnapshotLike<unknown>> = {}) {
  const snap: ConfigFormSnapshotLike<unknown> = {
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
  let accepts = true
  let throws: unknown

  const form: ConfigFormLike = {
    getSnapshot: () => snap,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async mutate(ops, expectedRevision) {
      mutations.push(expectedRevision === undefined ? { ops } : { ops, expectedRevision })
      if (throws !== undefined) throw throws
      return accepts
    },
  }

  return {
    form,
    snap,
    mutations,
    rejectWrites() { accepts = false },
    failWrites(error: unknown) { throws = error },
    set(next: Partial<ConfigFormSnapshotLike<unknown>>) {
      Object.assign(snap, next)
      for (const listener of [...listeners]) listener()
    },
  }
}

describe('configFormsOf (structural guard)', () => {
  it('accepts a payload exposing a configForms binder with get()', () => {
    const get = vi.fn()
    const face = configFormsOf({ configForms: { get } })
    expect(face).toBeDefined()
    expect(face!.get).toBe(get)
  })

  it('refuses a payload whose configForms member is missing, unreadable, or has no get()', () => {
    expect(configFormsOf(null)).toBeUndefined()
    expect(configFormsOf('configForms')).toBeUndefined()
    expect(configFormsOf({})).toBeUndefined()
    expect(configFormsOf({ configForms: null })).toBeUndefined()
    expect(configFormsOf({ configForms: {} })).toBeUndefined()
    // A member read a hostile payload proxy refuses must not throw out of the guard.
    const hostile = {
      get configForms(): unknown { throw new Error('cannot get property "configForms" without inject') },
    }
    expect(configFormsOf(hostile)).toBeUndefined()
  })
})

describe('configFormScope (official form projection)', () => {
  it('projects every snapshot field the library store reads', () => {
    const fake = makeConfigForm({
      status: 'ready',
      value: section([item('a')]),
      base: section([]),
      user: { items: [item('a')] },
      revision: 9,
      writable: true,
      mode: 'host',
    })
    const scope = configFormScope(fake.form)
    expect(scope.getSnapshot()).toEqual({
      status: 'ready',
      value: section([item('a')]),
      base: section([]),
      user: { items: [item('a')] },
      revision: 9,
      writable: true,
      mode: 'host',
    })
  })

  it('forwards subscriptions to the shared form', () => {
    const fake = makeConfigForm()
    const scope = configFormScope(fake.form)
    const listener = vi.fn()
    const off = scope.subscribe(listener)
    fake.set({ status: 'ready', value: section([]), writable: true, revision: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    fake.set({ revision: 2 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('passes the caller revision fence through and resolves on acceptance', async () => {
    const fake = makeConfigForm({ status: 'ready', value: section([]), revision: 4, writable: true, mode: 'host' })
    const scope = configFormScope(fake.form)
    const ops: SettingsPathOpLike[] = [{ op: 'set', path: ['items'], value: [item('a')] }]
    await expect(scope.mutate(ops, 4)).resolves.toBeUndefined()
    expect(fake.mutations).toEqual([{ ops, expectedRevision: 4 }])
  })

  it('turns a refused write into a conflict rejection', async () => {
    const fake = makeConfigForm({ status: 'ready', value: section([]), revision: 4, writable: true, mode: 'host' })
    fake.rejectWrites()
    const scope = configFormScope(fake.form)
    await expect(scope.mutate([{ op: 'set', path: ['items'], value: [] }], 4))
      .rejects.toBeInstanceOf(SettingsWriteFailure)
    await scope.mutate([{ op: 'set', path: ['items'], value: [] }], 4).catch((error: SettingsWriteFailure) => {
      expect(error.code).toBe('settings/conflict')
    })
  })

  it('turns a transport throw into an unreachable rejection that keeps the message', async () => {
    const fake = makeConfigForm({ status: 'ready', value: section([]), revision: 4, writable: true, mode: 'host' })
    fake.failWrites(new Error('gateway/transport'))
    const scope = configFormScope(fake.form)
    await scope.mutate([{ op: 'set', path: ['items'], value: [] }], 4).catch((error: SettingsWriteFailure) => {
      expect(error.code).toBe('settings/unreachable')
      expect(error.message).toBe('gateway/transport')
    })
    expect.assertions(2)
  })
})

describe('channel selection with the official form', () => {
  it('keeps the official form while it is not unavailable and opens no direct wire', () => {
    const official = makeConfigForm({
      status: 'ready',
      value: section([item('a')]),
      base: section([]),
      user: { items: [item('a')] },
      revision: 3,
      writable: true,
      mode: 'host',
    })
    const openDirect = vi.fn(() => undefined)
    const channel = createSettingsChannel({ openDirect })
    channel.setOfficial(configFormScope(official.form))
    expect(openDirect).not.toHaveBeenCalled()
    expect(channel.getSnapshot()).toMatchObject({ status: 'ready', revision: 3, mode: 'host' })
  })

  it('falls back to the direct Host channel when the official form is the memory-only non-loopback state', async () => {
    // `source` is what `openDirect()` would build; the channel only asks once.
    const direct = {
      getSnapshot: (): SettingsScopeSnapshotLike => ({
        status: 'ready',
        value: section([item('phone')]),
        base: undefined,
        user: undefined,
        revision: 11,
        writable: true,
        mode: 'host',
      }),
      subscribe: () => () => {},
      mutate: async () => {},
    }
    const openDirect = vi.fn(() => direct)
    const channel = createSettingsChannel({ openDirect })
    channel.setOfficial(configFormScope(makeConfigForm({
      status: 'unavailable', writable: false, mode: 'memory',
    }).form))
    expect(openDirect).toHaveBeenCalledTimes(1)
    expect(channel.getSnapshot()).toMatchObject({ status: 'ready', revision: 11 })
  })
})

describe('library store over the official form', () => {
  it('reads the stored library and writes it back with the read revision fence', async () => {
    const official = makeConfigForm({
      status: 'ready',
      value: section([item('a'), item('b')]),
      base: section([]),
      revision: 5,
      writable: true,
      mode: 'host',
    })
    const library = createLibraryStore()
    const channel = createSettingsChannel({ openDirect: () => undefined })
    channel.setOfficial(configFormScope(official.form))
    const detach = library.attach(channel)
    try {
      expect(library.get()).toMatchObject({ status: 'ready', editable: true, revision: 5 })
      expect(library.get().items.map(entry => entry.id)).toEqual(['a', 'b'])
      await library.save({ items: [item('c')] as never, expectedRevision: 5 })
      expect(official.mutations).toEqual([
        { ops: [{ op: 'set', path: ['items'], value: [item('c')] }], expectedRevision: 5 },
      ])
    } finally {
      detach()
      channel.dispose()
    }
  })

  it('surfaces a refused write instead of pretending the edit landed', async () => {
    const official = makeConfigForm({
      status: 'ready', value: section([]), revision: 2, writable: true, mode: 'host',
    })
    official.rejectWrites()
    const library = createLibraryStore()
    const channel = createSettingsChannel({ openDirect: () => undefined })
    channel.setOfficial(configFormScope(official.form))
    const detach = library.attach(channel)
    try {
      await expect(library.save({ items: [], expectedRevision: 2 })).rejects.toBeInstanceOf(SettingsWriteFailure)
    } finally {
      detach()
      channel.dispose()
    }
  })
})
