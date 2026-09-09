/**
 * dsh-quick-replies — library store (browser half).
 *
 * Owns the reactive mirror over the `quick-replies` settings scope and every
 * CRUD operation the management UI issues. Rules (docs/REQUIREMENTS.md
 * FR-08/FR-09):
 *
 * - While the scope is loading, NO sendable (possibly stale or fabricated)
 *   data is exposed. An unavailable/read-only/memory scope disables editing
 *   with a truthful reason. A scope that turns bad (hand-edited document,
 *   unknown future schema version) keeps the last confirmed good snapshot for
 *   sending but shows the storage problem — it never silently falls back.
 * - Every write goes through one namespace mutation with an expectedRevision
 *   fence captured at the moment the caller derived the new items. A conflict
 *   rejects and is surfaced (the caller keeps its unsaved form and asks the
 *   user to re-confirm) — the store never retries the overwrite by itself.
 * - Imports replace the library as ONE atomic operation (preview elsewhere,
 *   single mutate here); an error cannot leave a partial save.
 */
import { itemsOf, judgeSection } from '../../shared/validate.ts'
import { QR_NAMESPACE } from '../../shared/limits.ts'
import type { QuickReply } from '../../shared/types.ts'
import type { SettingsPathOpLike, SettingsScopeLike } from './scopeFaces.ts'

export type StorageNote =
  | 'ok'
  | 'memory'
  | 'readonly'
  | 'unavailable'
  | 'unsupported-version'
  | 'invalid-section'

export interface LibraryState {
  /** Scope sync state. */
  status: 'loading' | 'ready' | 'unavailable'
  /** Currently authoritative items (empty while loading or unusable). */
  items: QuickReply[]
  /** Last confirmed-good items retained when a newer value is unusable. */
  lastGoodItems: QuickReply[]
  /** Truthful storage diagnosis. */
  note: StorageNote
  /** Editing disabled: memory/read-only/unavailable/unsupported/invalid. */
  editable: boolean
  /** Namespace revision the UI should fence its next write with. */
  revision: number | undefined
}

export interface LibraryChange {
  /** Items to persist as the whole new library. */
  items: QuickReply[]
  /** Revision the caller read when it derived `items`. */
  expectedRevision: number | undefined
}

export interface LibraryStore {
  get(): LibraryState
  subscribe(listener: () => void): () => void
  /** Bind the settings scope; returns a disposer. */
  attach(scope: SettingsScopeLike): () => void
  /**
   * Persist one whole-library change. Rejects on transport failure or a
   * revision conflict (`settings/conflict`) WITHOUT overwriting; the caller
   * keeps its form and asks for an explicit re-confirmation.
   */
  save(change: LibraryChange): Promise<void>
}

function stateOf(scope: SettingsScopeLike): LibraryState {
  const snap = scope.getSnapshot()
  if (snap.status === 'loading') {
    return { status: 'loading', items: [], lastGoodItems: [], note: 'ok', editable: false, revision: snap.revision }
  }
  if (snap.status === 'unavailable') {
    return { status: 'unavailable', items: [], lastGoodItems: [], note: 'unavailable', editable: false, revision: snap.revision }
  }

  const writable = snap.writable === true && snap.mode !== 'memory'
  const note: StorageNote = !writable
    ? (snap.mode === 'memory' ? 'memory' : 'readonly')
    : 'ok'

  const judged = judgeSection(snap.value)
  if (judged.kind === 'ok') {
    return {
      status: 'ready',
      items: judged.data.items.map(item => ({ ...item })),
      lastGoodItems: judged.data.items.map(item => ({ ...item })),
      note,
      editable: writable,
      revision: snap.revision,
    }
  }

  // The value is unusable: keep the last confirmed-good items (if any) for
  // sending, refuse edits, and surface the storage diagnosis.
  const problem: StorageNote = judged.kind === 'unsupported-version' ? 'unsupported-version' : 'invalid-section'
  return {
    status: 'ready',
    items: [],
    lastGoodItems: [],
    note: problem,
    editable: false,
    revision: snap.revision,
  }
}

/** Re-derive a detached library state from arbitrary scope values (test seam + store core). */
export function libraryStateOf(snap: {
  status: 'loading' | 'ready' | 'unavailable'
  value: unknown
  writable: boolean
  mode: 'host' | 'memory'
  revision: number | undefined
}): LibraryState {
  const fake = {
    getSnapshot: () => snap,
  } as unknown as SettingsScopeLike
  return stateOf(fake)
}

export function createLibraryStore(): LibraryStore {
  let state: LibraryState = { status: 'loading', items: [], lastGoodItems: [], note: 'ok', editable: false, revision: undefined }
  let scope: SettingsScopeLike | undefined
  let attachedRevision = 0
  const listeners = new Set<() => void>()

  const publish = (next: LibraryState): void => {
    const same = next.status === state.status
      && next.editable === state.editable
      && next.note === state.note
      && next.revision === state.revision
      && JSON.stringify(next.items) === JSON.stringify(state.items)
    if (same) return
    state = next
    for (const listener of [...listeners]) {
      try { listener() } catch { /* contained */ }
    }
  }

  const sync = (): void => {
    if (scope === undefined) return
    let next: LibraryState
    try {
      next = stateOf(scope)
    } catch {
      next = { status: 'unavailable', items: [], lastGoodItems: state.lastGoodItems, note: 'unavailable', editable: false, revision: undefined }
    }
    // The value became unusable (hand-edited document, unknown future schema
    // version): keep the last confirmed-good snapshot for SENDING, truthfully
    // flagged — never silently fall back to the built-in defaults.
    if (next.status === 'ready' && (next.note === 'unsupported-version' || next.note === 'invalid-section')) {
      const retained = state.lastGoodItems
      next = { ...next, items: retained.map(item => ({ ...item })), lastGoodItems: retained }
    }
    publish(next)
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    attach(bound) {
      scope = bound
      attachedRevision += 1
      sync()
      const dispose = bound.subscribe(() => { sync() })
      return () => {
        dispose()
        attachedRevision -= 1
        if (attachedRevision === 0) scope = undefined
      }
    },
    async save(change) {
      if (scope === undefined) throw new Error('library unavailable')
      const ops: SettingsPathOpLike[] = [{ op: 'set', path: ['items'], value: change.items }]
      // expectedRevision fences the write; a stale writer is refused by the
      // Host and this promise rejects — no silent overwrite, no auto retry.
      await scope.mutate(ops, change.expectedRevision)
      sync()
    },
  }
}

export { QR_NAMESPACE }

/** itemsOf re-export for peers that validate raw values. */
export function validateItems(value: unknown): QuickReply[] | undefined {
  return itemsOf(value)
}
