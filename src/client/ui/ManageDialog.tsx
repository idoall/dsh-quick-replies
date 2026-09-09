/**
 * dsh-quick-replies — management dialog (add/edit/delete/order/import/export).
 *
 * A controlled modal over the management controller: Esc closes (asking before
 * discarding an unsaved form), focus is trapped, the trigger keeps its focus
 * restored on close, and body content scrolls internally so phones keep the
 * action bar reachable. Save is add/update ONLY — nothing here ever sends.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react'
import type { ManageController, ManageState } from '../manage/controller.ts'
import type { LibraryStore, LibraryState } from '../settings/libraryStore.ts'
import type { QuickReply } from '../../shared/types.ts'
import { MAX_CONTENT_CODE_POINTS, MAX_ITEMS, MAX_LABEL_CODE_POINTS } from '../../shared/limits.ts'
import { codePointLength } from '../../shared/text.ts'
import { t } from '../i18n.ts'
import { fieldIssueText, importIssueText, storageNoteText } from './texts.ts'
import type { ImportJudgement } from '../../shared/importExport.ts'
import type { QuickReplySender } from '../send/sender.ts'
import type { FoldPrefsStore } from '../prefsStore.ts'
import type { SendEnvironment } from '../send/faces.ts'

export interface ManageDialogProps {
  controller: ManageController
  view: ManageState
  store: LibraryStore
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function limitCodePoints(text: string, max: number): string {
  if (codePointLength(text) <= max) return text
  let count = 0
  let out = ''
  for (const ch of text) {
    if (count + 1 > max) break
    out += ch
    count += 1
  }
  return out
}

export function ManageDialog(props: ManageDialogProps): ReactElement | null {
  const { controller, view, store } = props
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<Element | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [discardAsk, setDiscardAsk] = useState(false)
  const [exported, setExported] = useState(false)

  const editing = view.editing
  const library = view.library
  const importStage = view.importStage

  // Mount-time: remember the trigger, focus the sheet, trap Tab, handle Esc.
  useEffect(() => {
    restoreRef.current = document.activeElement
    const sheet = sheetRef.current
    const focusTarget = sheet?.querySelector<HTMLElement>('[data-qr-autofocus]') ?? sheet?.querySelector<HTMLElement>(FOCUSABLE)
    focusTarget?.focus()

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDiscardAsk(false)
        if (!controller.requestClose()) setDiscardAsk(true)
        return
      }
      if (event.key !== 'Tab' || sheetRef.current === null) return
      const focusables = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const restore = restoreRef.current
      if (restore instanceof HTMLElement && document.contains(restore)) restore.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = (): void => {
    setDiscardAsk(false)
    controller.forceClose()
  }

  const onEditorField = (field: 'label' | 'content' | 'enabled', value: string | boolean): void => {
    controller.setDraftField(field, value)
  }

  const editorIssue = editing !== null ? fieldIssueText(view.editingIssue) : null
  const labelCount = editing !== null ? codePointLength(editing.draft.label) : 0
  const contentCount = editing !== null ? codePointLength(editing.draft.content) : 0
  const noticeText = view.notice === null
    ? null
    : view.notice.kind === 'ok' ? t('form.saved.ok')
      : view.notice.kind === 'conflict' ? t('form.conflict.notice')
        : t('form.saveFailed', { detail: '—' })

  const isImportPreview = importStage?.kind === 'preview'
  const importJudgement: ImportJudgement | null = isImportPreview && importStage !== null ? importStage.judgement : null

  const runExport = (): void => {
    const payload = controller.exportPayload()
    if (payload === null) return
    try {
      const blob = new Blob([payload.text], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'dsh-quick-replies.json'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setExported(true)
    } catch {
      setExported(false)
    }
  }

  const body = ((): ReactElement => {
    if (view.mode === 'editor' && editing !== null) {
      return (
        <div className="dsh-qr-form" role="form" aria-label={editing.id === null ? t('form.addTitle') : t('form.editTitle')}>
          <div className="dsh-qr-form-field">
            <label className="dsh-qr-form-label" htmlFor="dsh-qr-field-label">{t('form.label')}</label>
            <input
              id="dsh-qr-field-label"
              className="dsh-qr-input"
              data-qr-autofocus=""
              value={editing.draft.label}
              onChange={event => onEditorField('label', limitCodePoints(event.target.value, MAX_LABEL_CODE_POINTS))}
            />
            <div className="dsh-qr-char-count">{labelCount} / {MAX_LABEL_CODE_POINTS}</div>
            {editorIssue !== null && <div className="dsh-qr-field-error">{editorIssue}</div>}
          </div>
          <div className="dsh-qr-form-field">
            <label className="dsh-qr-form-label" htmlFor="dsh-qr-field-content">{t('form.content')}</label>
            <textarea
              id="dsh-qr-field-content"
              className="dsh-qr-textarea"
              value={editing.draft.content}
              onChange={event => onEditorField('content', limitCodePoints(event.target.value, MAX_CONTENT_CODE_POINTS))}
            />
            <div className="dsh-qr-char-count">{contentCount} / {MAX_CONTENT_CODE_POINTS}</div>
          </div>
          <div className="dsh-qr-form-field dsh-qr-toggle-row">
            <input
              id="dsh-qr-field-enabled"
              type="checkbox"
              className="dsh-qr-toggle"
              checked={editing.draft.enabled}
              onChange={event => onEditorField('enabled', event.target.checked)}
            />
            <label htmlFor="dsh-qr-field-enabled">{t('form.enabled')}</label>
          </div>
          <div className="dsh-qr-hint">{t('form.saveOnlyHint')}</div>
          {view.notice?.kind === 'conflict' && (
            <div className="dsh-qr-notice dsh-qr-notice-conflict">{noticeText}</div>
          )}
          {discardAsk && (
            <div className="dsh-qr-confirm-bar" style={{ marginTop: 12 }}>
              <span>{t('form.discard')}?</span>
              <div className="dsh-qr-confirm-actions">
                <button type="button" className="dsh-qr-text-button" onClick={() => setDiscardAsk(false)}>{t('form.keepEditing')}</button>
                <button type="button" className="dsh-qr-danger" onClick={() => close()}>{t('form.discard')}</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (view.mode === 'import') {
      return (
        <div>
          {!isImportPreview ? (
            <>
              <div className="dsh-qr-form-field">
                <label className="dsh-qr-form-label" htmlFor="dsh-qr-import-paste">{t('import.title')}</label>
                <textarea
                  id="dsh-qr-import-paste"
                  className="dsh-qr-textarea"
                  data-qr-autofocus=""
                  placeholder={t('import.paste.hint')}
                  value={pasteText}
                  onChange={event => setPasteText(event.target.value)}
                />
              </div>
              <div className="dsh-qr-sheet-foot" style={{ padding: 0, border: 'none' }}>
                <button type="button" className="dsh-qr-text-button" onClick={() => controller.closeImport()}>{t('import.back')}</button>
                <button type="button" className="dsh-qr-primary" disabled={pasteText.trim() === ''} onClick={() => controller.previewImport(pasteText)}>{t('import.preview')}</button>
              </div>
            </>
          ) : (
            <>
              {importJudgement !== null && importJudgement.kind === 'ok' && (
                <>
                  <p>{t('import.review', { in: importJudgement.data.items.length, current: library.items.length })}</p>
                  <ul className="dsh-qr-list" style={{ maxHeight: 'min(260px, 40dvh)' }}>
                    {importJudgement.data.items.map(item => (
                      <li key={item.id} className="dsh-qr-list-item">
                        <span className="dsh-qr-chip" title={item.content}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {importJudgement !== null && importJudgement.kind === 'invalid' && (
                <div className="dsh-qr-field-error">{importIssueText(importJudgement.issue)}</div>
              )}
              {importJudgement !== null && importJudgement.kind === 'unsupported-version' && (
                <div className="dsh-qr-field-error">{t('import.issue.unsupported-version', { version: String(importJudgement.version) })}</div>
              )}
              <div className="dsh-qr-sheet-foot" style={{ padding: 0, border: 'none' }}>
                <button type="button" className="dsh-qr-text-button" onClick={() => controller.backToPaste()}>{t('import.back')}</button>
                {importJudgement?.kind === 'ok' && (
                  <button
                    type="button"
                    className="dsh-qr-primary"
                    disabled={view.saving}
                    onClick={() => { void controller.confirmImport() }}
                  >{t('import.confirm.replace')}</button>
                )}
              </div>
            </>
          )}
        </div>
      )
    }

    // List mode
    const storageNote = storageNoteText(library.note)
    return (
      <div>
        <div className="dsh-qr-form-field" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="dsh-qr-hint" style={{ margin: 0 }}>{t('manage.count', { n: library.items.length, limit: MAX_ITEMS })}</span>
          {storageNote !== '' && <span className="dsh-qr-storage-note" style={{ margin: 0 }}>{storageNote}</span>}
        </div>
        {view.notice?.kind === 'conflict' && <div className="dsh-qr-notice dsh-qr-notice-conflict">{noticeText}</div>}
        {library.items.length === 0 && <div className="dsh-qr-empty">{t('manage.empty')}</div>}
        <ul className="dsh-qr-manage-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {library.items.map((item, index) => (
            <li key={item.id} className="dsh-qr-manage-row">
              <span className="dsh-qr-manage-label" title={item.content}>{item.label}</span>
              <button
                type="button"
                className={`dsh-qr-chip ${item.enabled ? 'dsh-qr-chip-on' : 'dsh-qr-chip-off'}`}
                disabled={!library.editable || view.saving}
                onClick={() => { void controller.toggle(item.id) }}
              >{item.enabled ? t('manage.enabled.label') : t('manage.disabled.label')}</button>
              <span className="dsh-qr-row-actions">
                <button type="button" className="dsh-qr-row-button" aria-label={t('manage.moveUp')} disabled={index === 0 || view.saving} onClick={() => { void controller.move(item.id, -1) }}>↑</button>
                <button type="button" className="dsh-qr-row-button" aria-label={t('manage.moveDown')} disabled={index === library.items.length - 1 || view.saving} onClick={() => { void controller.move(item.id, 1) }}>↓</button>
                <button type="button" className="dsh-qr-row-button" aria-label={t('manage.edit')} disabled={!library.editable} onClick={() => controller.startEdit(item)}>{t('manage.edit')}</button>
                <button type="button" className="dsh-qr-row-button dsh-qr-row-button-danger" aria-label={t('manage.delete')} disabled={!library.editable || view.saving} onClick={() => controller.requestDelete(item.id)}>{t('manage.delete')}</button>
              </span>
            </li>
          ))}
        </ul>
        {view.deletePendingId !== null && (() => {
          const pending = library.items.find(item => item.id === view.deletePendingId)
          return (
            <div className="dsh-qr-confirm-bar" style={{ marginTop: 12 }}>
              <span>{t('manage.delete.confirm', { label: pending?.label ?? '' })}</span>
              <div className="dsh-qr-confirm-actions">
                <button type="button" className="dsh-qr-text-button" onClick={() => controller.cancelDelete()}>{t('form.cancel')}</button>
                <button type="button" className="dsh-qr-danger" onClick={() => { void controller.confirmDelete() }}>{t('manage.delete')}</button>
              </div>
            </div>
          )
        })()}
      </div>
    )
  })()

  return (
    <div className="dsh-qr-overlay" role="presentation" data-dsh-quick-replies-dialog="">
      <div
        ref={sheetRef}
        className="dsh-qr-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={view.mode === 'editor' ? (editing?.id === null ? t('form.addTitle') : t('form.editTitle')) : t('manage.title')}
      >
        <div className="dsh-qr-sheet-head">
          <h2 className="dsh-qr-sheet-title">
            {view.mode === 'editor' ? (editing?.id === null ? t('form.addTitle') : t('form.editTitle'))
              : view.mode === 'import' ? t('import.title') : t('manage.title')}
          </h2>
          <button type="button" className="dsh-qr-close" aria-label={t('manage.close')} onClick={() => close()}>×</button>
        </div>
        {noticeText !== null && view.mode !== 'editor' && view.notice?.kind !== 'conflict' && (
          <div className={`dsh-qr-notice ${view.notice?.kind === 'ok' ? 'dsh-qr-notice-ok' : 'dsh-qr-notice-error'}`} style={{ margin: '8px 16px 0' }}>
            {noticeText}
          </div>
        )}
        <div className="dsh-qr-sheet-body">{body}</div>
        <div className="dsh-qr-sheet-foot">
          {view.mode === 'editor' && (
            <>
              {view.notice?.kind === 'conflict' && (
                <button type="button" className="dsh-qr-text-button" disabled={view.saving} onClick={() => { void controller.retrySaveEditing() }}>{t('form.conflict.retry')}</button>
              )}
              <button type="button" className="dsh-qr-text-button" onClick={() => controller.requestClose() || setDiscardAsk(true)}>{t('form.cancel')}</button>
              <button type="button" className="dsh-qr-primary" disabled={view.saving || editing === null} onClick={() => { void controller.saveEditing() }}>{t('form.save')}</button>
            </>
          )}
          {view.mode === 'list' && (
            <>
              <span className="dsh-qr-foot-cluster">
                <button type="button" className="dsh-qr-text-button" disabled={!library.editable} onClick={() => controller.openImport()}>{t('import.title')}</button>
                <button type="button" className="dsh-qr-text-button" disabled={library.items.length === 0} onClick={() => runExport()}>{exported ? t('export.done', { n: library.items.length }) : t('export.label')}</button>
              </span>
              <button type="button" className="dsh-qr-primary" disabled={!library.editable} onClick={() => controller.startAdd()}>{t('bar.add')}</button>
            </>
          )}
          {view.mode === 'import' && <span className="dsh-qr-hint" style={{ marginRight: 'auto' }}>{t('form.saveOnlyHint')}</span>}
        </div>
      </div>
    </div>
  )
}

export type { QuickReply, LibraryState, ManageState }
export type DialogProps = ManageDialogProps
