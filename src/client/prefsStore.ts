/**
 * dsh-quick-replies — fold preference persistence.
 *
 * Per-browser manual choices live in localStorage; when storage is disabled or
 * throws (private mode, blocked), the wrapper degrades to an in-memory map
 * without ever throwing to the caller. The reply library itself is NOT stored
 * here — only the two layout toggles.
 */
import { applyManualToggle, bandOf, effectiveCollapsed, type FoldPrefs } from './fold.ts'

const STORAGE_KEY = 'dsh-quick-replies.foldPrefs.v1'

export interface FoldPrefsStore {
  /** Current effective collapsed state for the container width. */
  collapsed(widthPx: number): boolean
  /** Persist one manual toggle for the current width's band. */
  setManual(widthPx: number, collapsed: boolean): void
}

interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function sanitize(raw: unknown): FoldPrefs {
  const out: FoldPrefs = {}
  if (raw !== null && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.narrow === 'boolean') out.narrow = record.narrow
    if (typeof record.wide === 'boolean') out.wide = record.wide
  }
  return out
}

/** localStorage-backed store; falls back to memory when storage is unavailable. */
export function createFoldPrefsStore(storage?: KeyValue): FoldPrefsStore {
  let memory: FoldPrefs = {}
  let liveStorage: KeyValue | undefined
  try {
    liveStorage = storage ?? globalThis.localStorage
    // Probe: some browsers throw on property access itself.
    const probe = liveStorage.getItem(STORAGE_KEY)
    memory = sanitize(probe === null ? undefined : JSON.parse(probe) as unknown)
  } catch {
    liveStorage = undefined
    memory = {}
  }

  return {
    collapsed(widthPx) {
      return effectiveCollapsed(widthPx, memory)
    },
    setManual(widthPx, collapsed) {
      memory = applyManualToggle(memory, widthPx, collapsed)
      if (liveStorage !== undefined) {
        try {
          liveStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
        } catch {
          // Storage full/blocked at write time: memory keeps working.
        }
      }
    },
  }
}

export { bandOf, effectiveCollapsed }
