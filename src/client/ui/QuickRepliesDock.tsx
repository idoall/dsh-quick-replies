/**
 * dsh-quick-replies — the input.dock quick-reply bar.
 *
 * One full-width entry above the composer card, registered on the
 * `conversation.input.dock` list slot (id `quick-replies`, order 30). Density
 * follows the CONTAINER width (ResizeObserver on the plugin's own element
 * only); height caps follow the real visual-viewport height.
 */
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import type { SendEnvironment, SendResult, SessionSendStatus } from '../send/faces.ts'
import type { QuickReplySender } from '../send/sender.ts'
import type { LibraryStore, LibraryState } from '../settings/libraryStore.ts'
import type { FoldPrefsStore } from '../prefsStore.ts'
import type { ManageController, ManageState } from '../manage/controller.ts'
import { bandOf, expandedLimits } from '../fold.ts'
import { t } from '../i18n.ts'
import { useContainerWidth, useObservable, useVisualViewportHeight } from './reactKit.ts'
import { refusalText, sendResultText, storageNoteText } from './texts.ts'
import { ManageDialog } from './ManageDialog.tsx'

export interface DockHandles {
  library: LibraryStore
  sender: QuickReplySender
  manage: ManageController
  prefs: FoldPrefsStore
  /** Build a fresh send environment for one session at click time. */
  makeEnv(sessionId: string): SendEnvironment
}

export interface QuickRepliesDockProps {
  sessionId: string | undefined
  handles: DockHandles
  /** Only for tests/embeds: force a container width while ResizeObserver is absent. */
  widthOverride?: number
}

const NO_SESSION_STATUS: SessionSendStatus = { busy: false, last: null }

/** Live per-session send status (stable snapshots come from the sender). */
function useSessionStatus(sender: QuickReplySender, sessionId: string | undefined): SessionSendStatus {
  return useSyncExternalStore(
    (listener) => (sessionId === undefined ? () => {} : sender.subscribe(sessionId, listener)),
    () => (sessionId === undefined ? NO_SESSION_STATUS : sender.get(sessionId)),
    () => (sessionId === undefined ? NO_SESSION_STATUS : sender.get(sessionId)),
  )
}

export function QuickRepliesDock(props: QuickRepliesDockProps): ReactElement | null {
  const { sessionId, handles, widthOverride } = props
  const library = useObservable<LibraryState>(handles.library)
  const status = useSessionStatus(handles.sender, sessionId)
  const manage = useObservable<ManageState>(handles.manage)

  const [containerRef, measuredWidth] = useContainerWidth()
  const visualHeight = useVisualViewportHeight()
  const width = widthOverride ?? measuredWidth ?? 360 // pre-measure assumption: narrow column
  const band = bandOf(width)

  // Fold: the saved manual per-band choice wins; auto behavior applies only
  // where no manual choice exists. Crossing a band re-reads that band's choice.
  const [bandState, setBandState] = useState(band)
  const [collapsedState, setCollapsedState] = useState(() => handles.prefs.collapsed(width))
  useEffect(() => {
    if (bandState !== band) {
      setBandState(band)
      setCollapsedState(handles.prefs.collapsed(width))
    }
  }, [band, bandState, width, handles.prefs])

  const setCollapsed = useCallback((next: boolean) => {
    handles.prefs.setManual(width, next)
    setCollapsedState(next)
  }, [handles.prefs, width])

  const limits = expandedLimits(width, visualHeight)
  const busy = sessionId !== undefined && status.busy
  const lastOutcome: SendResult | null = sessionId !== undefined ? status.last : null
  const [localNote, setLocalNote] = useState<string | null>(null)

  const statusText = busy
    ? t('bar.status.submitting')
    : lastOutcome !== null
      ? sendResultText(lastOutcome)
      : localNote

  const sendItem = useCallback(async (itemId: string, content: string) => {
    if (sessionId === undefined) return
    const answer = handles.sender.begin(handles.makeEnv(sessionId), sessionId, { id: itemId, content, enabled: true })
    if (answer.kind === 'busy' || answer.kind === 'duplicate-window') return
    if (answer.kind === 'refused') {
      setLocalNote(refusalText(answer.refusal))
      return
    }
    setLocalNote(null)
    await answer.settled
  }, [sessionId, handles])

  if (library.status === 'loading') {
    return (
      <div ref={containerRef} className="dsh-qr-dock" data-dsh-quick-replies="">
        <div className="dsh-qr-collapsed"><span className="dsh-qr-title">{t('bar.note.loading')}</span></div>
      </div>
    )
  }

  if (library.status !== 'ready') {
    return (
      <div ref={containerRef} className="dsh-qr-dock" data-dsh-quick-replies="">
        <div className="dsh-qr-collapsed"><span className="dsh-qr-title">{t('bar.note.unavailable')}</span></div>
      </div>
    )
  }

  const storageNote = storageNoteText(library.note)
  const enabledItems = library.items.filter(item => item.enabled)
  const dialog = manage.open ? createPortal(
    <ManageDialog controller={handles.manage} view={manage} store={handles.library} />,
    document.body,
  ) : null

  const foldHeader = (expanded: boolean) => (
    <button
      type="button"
      className="dsh-qr-header"
      aria-expanded={expanded}
      aria-label={expanded ? t('bar.collapse') : t('bar.expand')}
      onClick={() => setCollapsed(expanded)}
    >
      <span className="dsh-qr-title">
        {expanded ? t('bar.title') : t('bar.collapsed.summary', { n: enabledItems.length })}
      </span>
      <span className="dsh-qr-chevron" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {expanded
            ? <path d="M3.2 5.2 L7 9 L10.8 5.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M3.2 8.8 L7 5 L10.8 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      </span>
    </button>
  )

  return (
    <div ref={containerRef} className="dsh-qr-dock" data-dsh-quick-replies="">
      {collapsedState ? (
        <div className="dsh-qr-collapsed">
          {foldHeader(false)}
          {storageNote !== '' && <span className="dsh-qr-status dsh-qr-status-error" title={storageNote}>{t('bar.note.storage.problem')}</span>}
        </div>
      ) : (
        <div className="dsh-qr-expanded" style={{ maxHeight: limits.expandedMaxPx }}>
          <div className="dsh-qr-controls">
            {foldHeader(true)}
            <button type="button" className="dsh-qr-icon-button" aria-label={t('bar.add')} disabled={!library.editable} onClick={() => handles.manage.startAdd({ dismissOnSave: true })}>＋</button>
            <button type="button" className="dsh-qr-icon-button" aria-label={t('bar.manage')} onClick={() => handles.manage.open()}>⚙</button>
          </div>
          <ul className="dsh-qr-list" role="list">
            {enabledItems.map(item => (
              <li key={item.id} className="dsh-qr-list-item">
                <button
                  type="button"
                  className="dsh-qr-send"
                  aria-label={t('bar.send.aria', { label: item.label })}
                  title={item.label}
                  disabled={busy}
                  onClick={() => { void sendItem(item.id, item.content) }}
                >
                  <span className="dsh-qr-send-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          {enabledItems.length === 0 && <div className="dsh-qr-empty-note">{t('manage.empty')}</div>}
          {storageNote !== '' && <div className="dsh-qr-status dsh-qr-status-error">{storageNote}</div>}
          {statusText !== null && <div className="dsh-qr-status" aria-live="polite" role="status">{statusText}</div>}
        </div>
      )}
      {dialog}
    </div>
  )
}
