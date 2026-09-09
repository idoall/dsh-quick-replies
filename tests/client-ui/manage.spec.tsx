/**
 * dsh-quick-replies — management dialog specs (jsdom).
 *
 * Covers add/edit/save-only, field limits, delete-confirm, enable/order
 * mutations, import preview → confirm-replace, and the revision-conflict flow
 * (form retained, explicit re-confirm required — never a silent overwrite).
 * All queries are scoped to the dialog element (the dock bar shows the same
 * labels for its chips).
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within, type RenderResult } from '@testing-library/react'
import { QuickRepliesDock, type DockHandles } from '../../src/client/ui/QuickRepliesDock.tsx'
import { QuickReplySender } from '../../src/client/send/sender.ts'
import { createLibraryStore } from '../../src/client/settings/libraryStore.ts'
import type { SettingsPathOpLike, SettingsScopeLike } from '../../src/client/settings/scopeFaces.ts'
import { createManageController } from '../../src/client/manage/controller.ts'
import { createFoldPrefsStore } from '../../src/client/prefsStore.ts'
import type { SendEnvironment } from '../../src/client/send/faces.ts'
import type { QuickReply } from '../../src/shared/types.ts'

afterEach(cleanup)

beforeAll(() => {
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => {}
  }
})

interface ScopeHost {
  scope: SettingsScopeLike
  mutateCalls: Array<{ ops: readonly SettingsPathOpLike[]; expectedRevision?: number }>
  failNext: Error | null
}

function scopeWith(items: QuickReply[]): ScopeHost {
  let value: { schemaVersion: 1; items: QuickReply[] } = { schemaVersion: 1, items: items.map(i => ({ ...i })) }
  let revision = 1
  const listeners = new Set<() => void>()
  const host: ScopeHost = {
    mutateCalls: [],
    failNext: null,
    scope: {
      getSnapshot: () => ({
        status: 'ready',
        value,
        base: undefined,
        user: { items: value.items },
        revision,
        writable: true,
        mode: 'host',
      }),
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      async mutate(ops, expectedRevision) {
        host.mutateCalls.push({ ops, expectedRevision })
        if (host.failNext !== null) {
          const error = host.failNext
          host.failNext = null
          for (const l of [...listeners]) l()
          throw error
        }
        const op = ops[0]
        if (op?.op === 'set' && op.path[0] === 'items') {
          value = { schemaVersion: 1, items: op.value as QuickReply[] }
          revision += 1
          for (const l of [...listeners]) l()
        }
      },
    },
  }
  return host
}

/** Items of the most recent whole-library write. */
function lastItems(host: ScopeHost): QuickReply[] {
  const ops = host.mutateCalls[host.mutateCalls.length - 1]!.ops
  return (ops[0] as { value: QuickReply[] }).value
}

function renderDockWith(host: ScopeHost): RenderResult & { dialog(): HTMLElement } {
  const store = createLibraryStore()
  store.attach(host.scope)
  const sender = new QuickReplySender()
  const manage = createManageController(store)
  const kv = { getItem: () => null, setItem: () => {} }
  const prefs = createFoldPrefsStore(kv)
  const env: SendEnvironment = {
    resolveSession: () => undefined,
    connectionState: () => 'connected',
    composerBlockOf: () => undefined,
    inputPhase: () => 'plain',
    now: () => Date.now(),
    admissionTimeoutMs: () => 15_000,
    debounceMs: () => 600,
  }
  const handles: DockHandles = { library: store, sender, manage, prefs, makeEnv: () => env }
  const view = render(<QuickRepliesDock sessionId="A" handles={handles} widthOverride={900} />)
  fireEvent.click(screen.getByLabelText('Manage'))
  return {
    ...view,
    dialog() {
      return screen.getByRole('dialog')
    },
  }
}

const one = (): QuickReply => ({ id: 'qr_a', label: '继续', content: '继续', enabled: true })
const q = (view: ReturnType<typeof renderDockWith>) => within(view.dialog())

describe('Manage dialog — CRUD and save-only', () => {
  it('adds a reply: save only persists (never sends) and returns to the list', async () => {
    const host = scopeWith([])
    const view = renderDockWith(host)
    expect(await within(view.dialog()).findByText('No replies yet. Use Add to create one.')).toBeTruthy()

    fireEvent.click(q(view).getByRole('button', { name: 'Add' }))
    expect(await q(view).findByText('Add quick reply')).toBeTruthy()
    fireEvent.change(q(view).getByLabelText('Label'), { target: { value: '继续' } })
    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '继续' } })
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host)).toHaveLength(1)
    expect(lastItems(host)[0]).toMatchObject({ label: '继续', content: '继续', enabled: true })
    // Save never sent: no prompt happened and we are back on the list.
    expect(await q(view).findByText('继续')).toBeTruthy()
    expect(q(view).getByText('1 of 50')).toBeTruthy()
  })

  it('refuses a blank body and enforces the label code-point cap at the field level', async () => {
    const host = scopeWith([])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getByRole('button', { name: 'Add' }))
    await q(view).findByText('Add quick reply')
    fireEvent.change(q(view).getByLabelText('Label'), { target: { value: 'x' } })
    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '   ' } })
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))
    expect(await q(view).findByText('Body must not be blank')).toBeTruthy()
    expect(host.mutateCalls).toHaveLength(0)

    // The input truncates at the code-point cap (41 chars → 40 kept).
    const label = q(view).getByLabelText('Label') as HTMLInputElement
    fireEvent.change(label, { target: { value: '中'.repeat(41) } })
    expect(label.value).toHaveLength(40)

    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '继续' } })
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host)[0]!.label).toBe('中'.repeat(40))
  })

  it('edits an existing row (update only)', async () => {
    const host = scopeWith([one()])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getByRole('button', { name: 'Edit' }))
    await q(view).findByText('Edit quick reply')
    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '继续（改）' } })
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host)[0]).toMatchObject({ id: 'qr_a', content: '继续（改）' })
  })

  it('delete requires confirmation and removes exactly the pending row', async () => {
    const host = scopeWith([one(), { id: 'qr_b', label: '下一步', content: '下一步该做什么？', enabled: true }])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getAllByRole('button', { name: 'Delete' })[0]!)
    expect(await q(view).findByText('Delete “继续”?')).toBeTruthy()
    // The confirm bar appends its own Delete button — click the last one.
    const deletes = q(view).getAllByRole('button', { name: 'Delete' })
    fireEvent.click(deletes[deletes.length - 1]!)
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host).map(i => i.id)).toEqual(['qr_b'])
    expect(await q(view).findByText('下一步')).toBeTruthy()
    expect(q(view).queryByText('继续')).toBeNull()
  })

  it('enabled toggle and move emit whole-library writes in display order', async () => {
    const host = scopeWith([one(), { id: 'qr_b', label: '下一步', content: '下一步', enabled: false }])
    const view = renderDockWith(host)
    // The second row is Disabled → enabling it flips qr_b.
    fireEvent.click(q(view).getAllByRole('button', { name: 'Disabled' })[0]!)
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host)[1]).toMatchObject({ id: 'qr_b', enabled: true })

    // Move the second row up (index 1) → display order becomes qr_b, qr_a.
    fireEvent.click(q(view).getAllByRole('button', { name: 'Move up' })[1]!)
    await waitFor(() => expect(host.mutateCalls).toHaveLength(2))
    expect(lastItems(host).map(i => i.id)).toEqual(['qr_b', 'qr_a'])
  })
})

describe('Manage dialog — import/export', () => {
  it('import previews then replaces the whole library in ONE atomic write', async () => {
    const host = scopeWith([one()])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getByRole('button', { name: 'Import quick replies (JSON)' }))
    await q(view).findByPlaceholderText('Paste the contents of an exported file (UTF-8, ≤ 1 MiB)')

    const paste = q(view).getByPlaceholderText('Paste the contents of an exported file (UTF-8, ≤ 1 MiB)')
    fireEvent.change(paste, { target: { value: 'not json at all' } })
    fireEvent.click(q(view).getByRole('button', { name: 'Preview' }))
    expect(await q(view).findByText('Not valid JSON')).toBeTruthy()
    expect(host.mutateCalls).toHaveLength(0)

    // Back to paste with a VALID document this time.
    fireEvent.click(q(view).getByRole('button', { name: 'Back' }))
    const payload = {
      schemaVersion: 1,
      items: [
        { id: 'imp_1', label: '导入一', content: '内容一', enabled: true },
        { id: 'imp_2', label: '导入二', content: '内容二', enabled: false },
      ],
    }
    const pasteAgain = q(view).getByPlaceholderText('Paste the contents of an exported file (UTF-8, ≤ 1 MiB)')
    fireEvent.change(pasteAgain, { target: { value: JSON.stringify(payload) } })
    fireEvent.click(q(view).getByRole('button', { name: 'Preview' }))
    expect(await q(view).findByText('Import 2 replies, replacing the current 1.')).toBeTruthy()
    fireEvent.click(q(view).getByRole('button', { name: 'Replace the library' }))
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(lastItems(host).map(i => i.id)).toEqual(['imp_1', 'imp_2'])
    // Back on the list showing the imported labels.
    expect(await q(view).findByText('导入一')).toBeTruthy()
    expect(q(view).getByText('导入二')).toBeTruthy()
  })
})

describe('Manage dialog — revision conflict', () => {
  it('keeps the unsaved form on conflict and only writes after explicit re-confirmation', async () => {
    const host = scopeWith([one()])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getByRole('button', { name: 'Edit' }))
    await q(view).findByText('Edit quick reply')
    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '本地未保存修改' } })

    host.failNext = new Error('settings/conflict')
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))
    expect(await q(view).findByText('The library changed on another device. Your edit was not saved — review the latest list, then confirm again.')).toBeTruthy()
    // The form is retained untouched.
    expect((q(view).getByLabelText('Body (sent verbatim on click)') as HTMLTextAreaElement).value).toBe('本地未保存修改')

    // Explicit re-confirmation overwrites with the CURRENT revision.
    fireEvent.click(q(view).getByRole('button', { name: 'Confirm and save again' }))
    await waitFor(() => expect(host.mutateCalls).toHaveLength(2))
    expect(lastItems(host)[0]).toMatchObject({ content: '本地未保存修改' })
  })
})

describe('Manage dialog — keyboard (Esc) and dirty-close guard', () => {
  it('Esc with an unsaved form asks before discarding; Escape again keeps editing, Esc on a clean form closes', async () => {
    const host = scopeWith([one()])
    const view = renderDockWith(host)
    fireEvent.click(q(view).getByRole('button', { name: 'Edit' }))
    await q(view).findByText('Edit quick reply')

    // Dirty form: first Esc asks, it does NOT close the dialog.
    fireEvent.change(q(view).getByLabelText('Body (sent verbatim on click)'), { target: { value: '未保存' } })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(await q(view).findByText('Discard unsaved changes?')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()

    // Choose "Keep editing": the form survives.
    fireEvent.click(q(view).getByRole('button', { name: 'Keep editing' }))
    expect((q(view).getByLabelText('Body (sent verbatim on click)') as HTMLTextAreaElement).value).toBe('未保存')

    // Saving then Escape on the clean list closes the dialog.
    fireEvent.click(q(view).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(host.mutateCalls).toHaveLength(1))
    expect(await q(view).findByText('继续')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

