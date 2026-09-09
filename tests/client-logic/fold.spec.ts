/**
 * dsh-quick-replies — fold/height logic specs (pure).
 */
import { describe, expect, it } from 'vitest'
import {
  applyManualToggle,
  autoCollapsed,
  bandOf,
  effectiveCollapsed,
  expandedLimits,
  NARROW_BREAKPOINT_PX,
} from '../../src/client/fold.ts'
import { createFoldPrefsStore } from '../../src/client/prefsStore.ts'

describe('band & auto behavior', () => {
  it('bands by container width, not by UA/viewport', () => {
    expect(bandOf(320)).toBe('narrow')
    expect(bandOf(NARROW_BREAKPOINT_PX - 1)).toBe('narrow')
    expect(bandOf(NARROW_BREAKPOINT_PX)).toBe('wide')
    expect(bandOf(1440)).toBe('wide')
  })

  it('auto: narrow containers collapse by default, wide ones expand', () => {
    expect(autoCollapsed(320)).toBe(true)
    expect(autoCollapsed(768)).toBe(false)
    expect(autoCollapsed(1024)).toBe(false)
  })

  it('manual choices win per band; crossing the breakpoint never overrides a saved choice', () => {
    const prefs = { narrow: false } // user manually EXPANDED the narrow bar
    expect(effectiveCollapsed(320, prefs)).toBe(false)
    // Wide band has no manual choice → auto (expanded).
    expect(effectiveCollapsed(900, prefs)).toBe(false)
    // Moving back to narrow restores the manual expansion.
    expect(effectiveCollapsed(360, prefs)).toBe(false)

    const collapsedWide = applyManualToggle(prefs, 900, true)
    expect(effectiveCollapsed(900, collapsedWide)).toBe(true)
    expect(collapsedWide).toEqual({ narrow: false, wide: true })
    // The narrow manual expansion is untouched.
    expect(effectiveCollapsed(320, collapsedWide)).toBe(false)
  })
})

describe('expanded height limits', () => {
  it('standard height, narrow container: <= min(220, 40% of visual height)', () => {
    expect(expandedLimits(320, 1000).expandedMaxPx).toBe(220)
    expect(expandedLimits(320, 400).expandedMaxPx).toBe(160) // 40% of 400
    expect(expandedLimits(639, 600).expandedMaxPx).toBe(220)
  })

  it('wide container: fixed 240px', () => {
    expect(expandedLimits(768, 1000).expandedMaxPx).toBe(240)
    expect(expandedLimits(1024, 768).expandedMaxPx).toBe(240)
  })

  it('compact visual height (landscape/soft keyboard): <= 40% and keeps the 44px control row', () => {
    const limits = expandedLimits(768, 300)
    expect(limits.expandedMaxPx).toBe(120) // 40% of 300
    expect(limits.listMaxPx).toBe(76)
    // Control row still reachable even for tiny heights.
    expect(expandedLimits(768, 80).expandedMaxPx).toBe(44)
    expect(expandedLimits(320, 80).expandedMaxPx).toBe(44)
  })

  it('list height never goes negative', () => {
    expect(expandedLimits(320, 80).listMaxPx).toBe(0)
  })
})

describe('fold preference persistence', () => {
  function memoryStorage() {
    const map = new Map<string, string>()
    return {
      getItem(key: string) { return map.get(key) ?? null },
      setItem(key: string, value: string) { map.set(key, value) },
      dump: () => map,
    }
  }

  it('persists manual per-band choices into the store', () => {
    const storage = memoryStorage()
    const store = createFoldPrefsStore(storage)
    expect(store.collapsed(320)).toBe(true) // auto
    store.setManual(320, false) // manual expand on the narrow band
    expect(store.collapsed(320)).toBe(false)
    expect(store.collapsed(700)).toBe(false) // wide auto

    // A second store instance reads back the saved manual choice.
    const reloaded = createFoldPrefsStore(storage)
    expect(reloaded.collapsed(320)).toBe(false)
    expect(reloaded.collapsed(900)).toBe(false)
  })

  it('degrades to memory when storage throws (private mode)', () => {
    const broken: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem() { throw new Error('denied') },
      setItem() { throw new Error('denied') },
    }
    const store = createFoldPrefsStore(broken as never)
    expect(() => store.setManual(320, false)).not.toThrow()
    expect(store.collapsed(320)).toBe(false) // memory keeps working
    expect(store.collapsed(700)).toBe(false)
  })
})
