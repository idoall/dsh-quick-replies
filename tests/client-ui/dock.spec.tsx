/**
 * dsh-quick-replies — dock UI specs (jsdom + @testing-library/react).
 *
 * Renders the real dock component over real stores with fake scopes/session
 * faces. jsdom cannot measure layout, so tests drive the container width via
 * `widthOverride` and assert behavior, ARIA, visibility (collapsed items are
 * NOT in the DOM at all), and the inline height cap the component computes
 * from the real fold logic.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QuickRepliesDock, type DockHandles } from '../../src/client/ui/QuickRepliesDock.tsx'
import { QuickReplySender } from '../../src/client/send/sender.ts'
import { createLibraryStore } from '../../src/client/settings/libraryStore.ts'
import type { SettingsPathOpLike, SettingsScopeLike } from '../../src/client/settings/scopeFaces.ts'
import { createManageController } from '../../src/client/manage/controller.ts'
import { createFoldPrefsStore } from '../../src/client/prefsStore.ts'
import type { SendEnvironment, PromptResult } from '../../src/client/send/faces.ts'
import type { QuickReply } from '../../src/shared/types.ts'

afterEach(cleanup)

/** Fake settings scope in ready state (library host). */
function scopeWith(items: QuickReply[], writable = true): { scope: SettingsScopeLike; mutateCalls: Array<{ ops: readonly SettingsPathOpLike[]; expectedRevision?: number }>; applyOps(): void } {
  let value: { schemaVersion: 1; items: QuickReply[] } = { schemaVersion: 1, items: items.map(i => ({ ...i })) }
  let revision = 1
  const listeners = new Set<() => void>()
  const mutateCalls: Array<{ ops: readonly SettingsPathOpLike[]; expectedRevision?: number }> = []
  const scope: SettingsScopeLike = {
    getSnapshot: () => ({
      status: 'ready',
      value,
      base: undefined,
      user: { items: value.items },
      revision,
      writable,
      mode: 'host',
    }),
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async mutate(ops, expectedRevision) {
      mutateCalls.push({ ops, expectedRevision })
    },
  }
  return {
    scope,
    mutateCalls,
    applyOps() {
      const op = mutateCalls[mutateCalls.length - 1]
      if (op !== undefined && op.ops[0]?.op === 'set' && op.ops[0].path[0] === 'items') {
        value = { schemaVersion: 1, items: op.ops[0].value as QuickReply[] }
        revision += 1
        for (const l of [...listeners]) l()
      }
    },
  }
}

interface TestBed {
  handles: DockHandles
  sender: QuickReplySender
  setPromptResult(result: PromptResult): void
  promptCalls: Array<{ text: string; mode: string }>
  mutateCalls: ReturnType<typeof scopeWith>['mutateCalls']
  applyOps(): void
}

function makeBed(items: QuickReply[], width?: number): TestBed {
  const host = scopeWith(items)
  const store = createLibraryStore()
  store.attach(host.scope)
  const sender = new QuickReplySender()
  const manage = createManageController(store)
  const storage = new Map<string, string>()
  const kv = {
    getItem(key: string) { return storage.get(key) ?? null },
    setItem(key: string, value: string) { storage.set(key, value) },
  }
  const prefs = createFoldPrefsStore(kv)
  const promptCalls: Array<{ text: string; mode: string }> = []
  let result: PromptResult = { ok: true, value: { accepted: true } }
  const env: SendEnvironment = {
    resolveSession(sessionId) {
      if (sessionId !== 'A') return undefined
      return {
        face: {
          async prompt(content, mode) {
            promptCalls.push({ text: (content[0] as { text: string }).text, mode })
            return result
          },
          getSnapshot: () => ({ running: false, removed: false, blank: false, subagent: null, openState: 'open', openError: null }),
        },
      }
    },
    connectionState: () => 'connected',
    composerBlockOf: () => undefined,
    inputPhase: () => 'plain',
    now: () => Date.now(),
    admissionTimeoutMs: () => 15_000,
    debounceMs: () => 600,
  }
  const handles: DockHandles = {
    library: store,
    sender,
    manage,
    prefs,
    makeEnv: () => env,
  }
  void width
  return {
    handles,
    sender,
    setPromptResult(next) { result = next },
    promptCalls,
    mutateCalls: host.mutateCalls,
    applyOps: host.applyOps,
  }
}

const reply = (overrides: Partial<QuickReply> = {}): QuickReply => ({
  id: 'qr_a',
  label: '继续',
  content: '继续',
  enabled: true,
  ...overrides,
})

describe('QuickRepliesDock — fold behavior (container width based)', () => {
  it('narrow container defaults to COLLAPSED: one row, items not rendered/focusable', () => {
    const bed = makeBed([reply()])
    render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={320} />)
    expect(screen.getByText('Quick replies (1), collapsed')).toBeTruthy()
    // Collapsed: hidden content is not in the DOM at all (cannot be Tab-focused).
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByLabelText('Send: 继续')).toBeNull()
  })

  it('wide container defaults to EXPANDED with chips', () => {
    const bed = makeBed([reply()])
    render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={900} />)
    expect(screen.getByRole('list')).toBeTruthy()
    expect(screen.getByLabelText('Send: 继续')).toBeTruthy()
  })

  it('expand/collapse buttons flip the bar and stay within the same width band', () => {
    const bed = makeBed([reply()])
    render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={320} />)
    fireEvent.click(screen.getByLabelText('Expand quick replies'))
    expect(screen.getByLabelText('Send: 继续')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Collapse quick replies'))
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('manual choice persists per band and survives a remount (auto never overrides it)', () => {
    const host = scopeWith([reply()])
    const store = createLibraryStore()
    store.attach(host.scope)
    const storage = new Map<string, string>()
    const kv = {
      getItem(key: string) { return storage.get(key) ?? null },
      setItem(key: string, value: string) { storage.set(key, value) },
    }
    const prefs = createFoldPrefsStore(kv)
    const sender = new QuickReplySender()
    const manage = createManageController(store)
    const makeHandles = (): DockHandles => ({ library: store, sender, manage, prefs, makeEnv: () => {
      const env: SendEnvironment = {
        resolveSession: () => undefined,
        connectionState: () => 'connected',
        composerBlockOf: () => undefined,
        inputPhase: () => 'plain',
        now: () => Date.now(),
        admissionTimeoutMs: () => 15_000,
        debounceMs: () => 600,
      }
      return env
    } })

    const first = render(<QuickRepliesDock sessionId="A" handles={makeHandles()} widthOverride={320} />)
    expect(screen.getByText('Quick replies (1), collapsed')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Expand quick replies'))
    expect(screen.getByLabelText('Send: 继续')).toBeTruthy()
    first.unmount()

    // A brand-new dock on the same storage restores the manual expansion even
    // though the width is still in the auto-collapse band.
    render(<QuickRepliesDock sessionId="A" handles={makeHandles()} widthOverride={320} />)
    expect(screen.getByLabelText('Send: 继续')).toBeTruthy()
  })

  it('expanded zone carries the computed height cap (narrow: min(220px, 40dvh))', () => {
    const bed = makeBed([reply()])
    const { container } = render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={320} />)
    fireEvent.click(screen.getByLabelText('Expand quick replies'))
    const zone = container.querySelector('.dsh-qr-expanded') as HTMLElement | null
    expect(zone).not.toBeNull()
    // jsdom innerHeight is 768 → 40% is 307 → narrow cap 220px.
    expect(zone!.style.maxHeight).toBe('220px')
  })

  it('50 items render inside the scrollable list, never stretching the page', () => {
    const items = Array.from({ length: 50 }, (_, i) => reply({ id: `qr_${i}`, label: `Reply ${i}`, content: 'x' }))
    const bed = makeBed(items)
    const { container } = render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={360} />)
    fireEvent.click(screen.getByLabelText('Expand quick replies'))
    const list = container.querySelector('.dsh-qr-list') as HTMLElement | null
    expect(list).not.toBeNull()
    expect(list!.querySelectorAll('li')).toHaveLength(50)
    expect(list!.style.overflowY).not.toBe('visible')
  })
})

describe('QuickRepliesDock — sending behavior', () => {
  it('the bar Add button opens the editor dialog (not the manage list)', async () => {
    const bed = makeBed([reply()])
    render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={900} />)
    fireEvent.click(screen.getByLabelText('Add'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Add quick reply')).toBeTruthy()
    expect(within(dialog).queryByText('Manage quick replies')).toBeNull()
  })

  it('clicking an enabled chip submits the exact body once; disabled entries are hidden', async () => {
    const bed = makeBed([reply({ id: 'qr_off', enabled: false }), reply({ id: 'qr_on', label: '下一步', content: '下一步该做什么？' })])
    render(<QuickRepliesDock sessionId="A" handles={bed.handles} widthOverride={900} />)
    // Disabled entry is not offered.
    expect(screen.queryByLabelText('Send: 继续')).toBeNull()
    const send = screen.getByLabelText('Send: 下一步')
    fireEvent.click(send)
    await waitFor(() => expect(bed.promptCalls).toHaveLength(1))
    expect(bed.promptCalls[0]).toEqual({ text: '下一步该做什么？', mode: 'queue' })
    await screen.findByText('Submitted (queue)')
  })

  it('busy locks every chip until the admission settles', async () => {
    let resolvePrompt: (value: PromptResult) => void = () => {}
    const host = scopeWith([reply()])
    const store = createLibraryStore()
    store.attach(host.scope)
    const sender = new QuickReplySender()
    const manage = createManageController(store)
    const kv = { getItem: () => null, setItem: () => {} }
    const prefs = createFoldPrefsStore(kv)
    const env: SendEnvironment = {
      resolveSession: () => ({
        face: {
          prompt: () => new Promise<PromptResult>((resolve) => { resolvePrompt = resolve }),
          getSnapshot: () => ({ running: false, removed: false, blank: false, subagent: null, openState: 'open', openError: null }),
        },
      }),
      connectionState: () => 'connected',
      composerBlockOf: () => undefined,
      inputPhase: () => 'plain',
      now: () => Date.now(),
      admissionTimeoutMs: () => 15_000,
      debounceMs: () => 600,
    }
    render(<QuickRepliesDock sessionId="A" handles={{ library: store, sender, manage, prefs, makeEnv: () => env }} widthOverride={900} />)
    const send = screen.getByLabelText('Send: 继续') as HTMLButtonElement
    fireEvent.click(send)
    await waitFor(() => expect(send.disabled).toBe(true))
    expect(screen.getByText('Submitting…')).toBeTruthy()
    resolvePrompt({ ok: true, value: { accepted: true } })
    await waitFor(() => expect(send.disabled).toBe(false))
  })

  it('a blank session (no history yet) refuses the click: no request, explanatory note shown', async () => {
    const host = scopeWith([reply()])
    const store = createLibraryStore()
    store.attach(host.scope)
    const sender = new QuickReplySender()
    const manage = createManageController(store)
    const kv = { getItem: () => null, setItem: () => {} }
    const prefs = createFoldPrefsStore(kv)
    const promptCalls: Array<{ text: string; mode: string }> = []
    const env: SendEnvironment = {
      resolveSession: () => ({
        face: {
          async prompt(content, mode) {
            promptCalls.push({ text: (content[0] as { text: string }).text, mode })
            return { ok: true, value: { accepted: true } }
          },
          // Blank: no durable history yet, exactly like a freshly created session.
          getSnapshot: () => ({ running: false, removed: false, blank: true, subagent: null, openState: 'open', openError: null }),
        },
      }),
      connectionState: () => 'connected',
      composerBlockOf: () => undefined,
      inputPhase: () => 'plain',
      now: () => Date.now(),
      admissionTimeoutMs: () => 15_000,
      debounceMs: () => 600,
    }
    render(<QuickRepliesDock sessionId="A" handles={{ library: store, sender, manage, prefs, makeEnv: () => env }} widthOverride={900} />)
    fireEvent.click(screen.getByLabelText('Send: 继续'))
    // Never issued a request and never locked the bar.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(promptCalls).toHaveLength(0)
    expect(sender.get('A').busy).toBe(false)
    expect(screen.getByText(/has no history yet/i)).toBeTruthy()
  })
})
