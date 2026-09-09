/**
 * dsh-quick-replies — management controller (browser half, React-free).
 *
 * One observable state machine behind the management dialog: list, editor,
 * delete-confirm, import preview/confirm, and every library write. It owns
 * the unsaved form across dock remounts (switching sessions while editing
 * keeps the draft), the revision conflict flow, and the strict save-only
 * guarantee (management never sends anything).
 */
import { MAX_ITEMS } from '../../shared/limits.ts'
import { judgeImport, type ImportJudgement } from '../../shared/importExport.ts'
import { newReplyId } from '../../shared/id.ts'
import type { QuickReply } from '../../shared/types.ts'
import { judgeDraft, moveItem, removeItem, toggleItem, updateItem, withNewId, type FieldIssue, type ItemDraft } from './ops.ts'
import type { LibraryState, LibraryStore } from '../settings/libraryStore.ts'

export type ViewMode = 'list' | 'editor' | 'import'
export type NoticeKind = 'ok' | 'conflict' | 'error'

export interface ManageState {
  mode: ViewMode
  open: boolean
  library: LibraryState
  /** Editor seat: id null = creating a new reply. */
  editing: { id: string | null; draft: ItemDraft } | null
  editingIssue: FieldIssue | null
  /** Revision the form derived from — the conflict fence of its first save. */
  editingRevision: number | undefined
  saving: boolean
  deletePendingId: string | null
  importStage: null | { kind: 'paste' } | { kind: 'preview'; judgement: ImportJudgement }
  notice: { kind: NoticeKind } | null
  /** When true, a successful add closes the dialog (bar "+" flow). */
  dismissOnSave: boolean
}

const emptyDraft: ItemDraft = { label: '', content: '', enabled: true }

export interface ManageController {
  get(): ManageState
  subscribe(listener: () => void): () => void
  open(): void
  /** Close request; returns false when an unsaved form needs confirmation. */
  requestClose(): boolean
  forceClose(): void
  startAdd(options?: { dismissOnSave?: boolean }): void
  startEdit(item: QuickReply): void
  setDraftField<K extends keyof ItemDraft>(field: K, value: ItemDraft[K]): void
  /** Persist the current editor form (add/update ONLY — never sends). */
  saveEditing(): Promise<void>
  /** Explicit user re-confirmation after a revision conflict. */
  retrySaveEditing(): Promise<void>
  requestDelete(itemId: string): void
  cancelDelete(): void
  confirmDelete(): Promise<void>
  toggle(itemId: string): Promise<void>
  move(itemId: string, delta: -1 | 1): Promise<void>
  openImport(): void
  closeImport(): void
  /** From a preview back to the paste stage (text kept by the caller). */
  backToPaste(): void
  /** Parse pasted import text and move to preview when valid. */
  previewImport(text: string): void
  /** Replace the whole library with the previewed import (single atomic write). */
  confirmImport(): Promise<void>
  /** Detached export payload + count for the download affordance. */
  exportPayload(): { text: string; count: number } | null
  dismissNotice(): void
}

export function createManageController(store: LibraryStore): ManageController {
  let state: ManageState = {
    mode: 'list',
    open: false,
    library: store.get(),
    editing: null,
    editingIssue: null,
    editingRevision: undefined,
    saving: false,
    deletePendingId: null,
    importStage: null,
    notice: null,
    dismissOnSave: false,
  }
  let editingBaseline: string | null = null
  const listeners = new Set<() => void>()

  const publish = (patch: Partial<ManageState>): void => {
    state = { ...state, ...patch }
    for (const listener of [...listeners]) {
      try { listener() } catch { /* contained */ }
    }
  }

  const currentItems = (): QuickReply[] => state.library.items

  const dismissableNotice = (kind: NoticeKind) => ({ kind })

  /** One whole-library write; a conflict is surfaced, never auto-overwritten. */
  const persistItems = async (
    build: (items: QuickReply[]) => QuickReply[] | FieldIssue,
    expectedRevision: number | undefined,
  ): Promise<boolean> => {
    const built = build(currentItems())
    if (typeof built === 'string' || built === null) {
      publish({ notice: dismissableNotice('error') })
      return false
    }
    try {
      await store.save({ items: built, expectedRevision })
      return true
    } catch {
      publish({ notice: dismissableNotice('conflict') })
      return false
    }
  }

  const finishSave = async (revision: number | undefined): Promise<void> => {
    const editing = state.editing
    if (editing === null) return
    const issue = judgeDraft(editing.draft, editing.id ?? 'qr_pending')
    if (issue !== null) {
      publish({ editingIssue: issue })
      return
    }
    publish({ saving: true })
    const next = editing.id === null
      ? (currentItems().length >= MAX_ITEMS ? null : withNewId(currentItems(), editing.draft, newReplyId()))
      : updateItem(currentItems(), editing.id, editing.draft)
    if (next === null || typeof next === 'string') {
      publish({ saving: false, editingIssue: (next ?? 'too-many-items') as FieldIssue })
      return
    }
    let ok: boolean
    try {
      await store.save({ items: next, expectedRevision: revision })
      ok = true
    } catch {
      ok = false
      publish({ notice: dismissableNotice('conflict') })
    }
    publish({ saving: false })
    if (ok) {
      editingBaseline = JSON.stringify(editing.draft)
      const dismiss = editing.id === null && state.dismissOnSave
      publish({
        open: dismiss ? false : state.open,
        mode: 'list',
        editing: null,
        editingIssue: null,
        dismissOnSave: false,
        notice: dismiss ? null : dismissableNotice('ok'),
      })
    }
  }

  const disposeStore = store.subscribe(() => {
    publish({ library: store.get() })
  })

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    open() {
      if (state.open) return
      publish({ open: true, mode: 'list', notice: null, editing: null, deletePendingId: null, importStage: null, dismissOnSave: false })
    },
    requestClose() {
      const editing = state.editing
      if (editing !== null && editingBaseline !== null && editingBaseline !== JSON.stringify(editing.draft)) {
        return false // the UI asks the user before discarding
      }
      this.forceClose()
      return true
    },
    forceClose() {
      publish({ open: false, editing: null, editingIssue: null, deletePendingId: null, importStage: null, notice: null, dismissOnSave: false })
    },
    startAdd(options) {
      editingBaseline = JSON.stringify(emptyDraft)
      publish({
        open: true,
        mode: 'editor',
        editing: { id: null, draft: { ...emptyDraft } },
        editingIssue: null,
        editingRevision: state.library.revision,
        deletePendingId: null,
        importStage: null,
        notice: null,
        dismissOnSave: options?.dismissOnSave === true,
      })
    },
    startEdit(item) {
      const draft: ItemDraft = { label: item.label, content: item.content, enabled: item.enabled }
      editingBaseline = JSON.stringify(draft)
      publish({
        mode: 'editor',
        editing: { id: item.id, draft },
        editingIssue: null,
        editingRevision: state.library.revision,
        deletePendingId: null,
        notice: null,
      })
    },
    setDraftField(field, value) {
      const editing = state.editing
      if (editing === null) return
      const draft = { ...editing.draft, [field]: value }
      const issue = judgeDraft(draft, editing.id ?? 'qr_pending')
      publish({ editing: { ...editing, draft }, editingIssue: issue })
    },
    async saveEditing() {
      await finishSave(state.editingRevision)
    },
    async retrySaveEditing() {
      // The user EXPLICITLY confirmed overwriting the newer remote state.
      await finishSave(store.get().revision)
    },
    requestDelete(itemId) {
      publish({ deletePendingId: itemId })
    },
    cancelDelete() {
      publish({ deletePendingId: null })
    },
    async confirmDelete() {
      const id = state.deletePendingId
      if (id === null) return
      publish({ saving: true })
      const ok = await persistItems(items => removeItem(items, id), state.library.revision)
      publish({ saving: false, deletePendingId: ok ? null : id })
    },
    async toggle(itemId) {
      await persistItems(items => toggleItem(items, itemId), state.library.revision)
    },
    async move(itemId, delta) {
      await persistItems(items => moveItem(items, itemId, delta), state.library.revision)
    },
    openImport() {
      publish({ mode: 'import', importStage: { kind: 'paste' }, notice: null })
    },
    closeImport() {
      publish({ mode: 'list', importStage: null })
    },
    backToPaste() {
      if (state.mode !== 'import') return
      publish({ importStage: { kind: 'paste' } })
    },
    previewImport(text) {
      publish({ importStage: { kind: 'preview', judgement: judgeImport(text) } })
    },
    async confirmImport() {
      const stage = state.importStage
      if (stage === null || stage.kind !== 'preview' || stage.judgement.kind !== 'ok') return
      publish({ saving: true })
      const items = stage.judgement.data.items
      const ok = await persistItems(() => items.map(item => ({ ...item })), state.library.revision)
      publish({ saving: false })
      if (ok) publish({ mode: 'list', importStage: null, notice: dismissableNotice('ok') })
    },
    exportPayload() {
      const items = currentItems()
      if (items.length === 0) return null
      const payload = { schemaVersion: 1 as const, items: items.map(item => ({ ...item })) }
      return { text: `${JSON.stringify(payload, null, 2)}\n`, count: items.length }
    },
    dismissNotice() {
      publish({ notice: null })
    },
  }
}
