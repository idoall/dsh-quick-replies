/**
 * dsh-quick-replies — container-based fold logic (pure).
 *
 * Density decisions follow the PLUGIN CONTAINER width, never the user agent or
 * the full viewport: a 320px conversation column inside a 1440px viewport
 * folds exactly like a phone. Breakpoints:
 *
 * - container width < 640px ⇒ "narrow" band, auto-collapsed;
 * - container width >= 640px ⇒ "wide" band, auto-expanded.
 *
 * The browser remembers the user's MANUAL choice per band (narrow/wide), so an
 * automatic breakpoint crossing never overwrites a saved manual choice and
 * returning to a band restores what the user chose there.
 */
export const NARROW_BREAKPOINT_PX = 640
/** 44–52 CSS px one-line folded bar at 100% font size. */
export const CONTROL_ROW_MIN_PX = 44
export const EXPANDED_NARROW_MAX_PX = 220
export const EXPANDED_WIDE_MAX_PX = 240
export const STANDARD_HEIGHT_PX = 400

export type LayoutBand = 'narrow' | 'wide'

/** Per-band manual collapsed choice; undefined = the band uses auto behavior. */
export interface FoldPrefs {
  narrow?: boolean
  wide?: boolean
}

export function bandOf(widthPx: number): LayoutBand {
  return widthPx < NARROW_BREAKPOINT_PX ? 'narrow' : 'wide'
}

/** The band's automatic (no manual choice) collapsed state. */
export function autoCollapsed(widthPx: number): boolean {
  return widthPx < NARROW_BREAKPOINT_PX
}

/** Effective collapsed state: the saved manual choice wins, otherwise auto. */
export function effectiveCollapsed(widthPx: number, prefs: FoldPrefs): boolean {
  const band = bandOf(widthPx)
  return prefs[band] ?? autoCollapsed(widthPx)
}

/** Record one explicit manual toggle for the band the current width belongs to. */
export function applyManualToggle(prefs: FoldPrefs, widthPx: number, collapsed: boolean): FoldPrefs {
  const band = bandOf(widthPx)
  return { ...prefs, [band]: collapsed }
}

export interface ExpandedLimits {
  /** Max height of the WHOLE expanded zone (control row + list). */
  expandedMaxPx: number
  /** Max height left for the scrolling list after the control row. */
  listMaxPx: number
}

/**
 * Height caps (docs/REQUIREMENTS.md FR-06). `visualHeightPx` must be the
 * real visual-viewport height (the UI feeds window.visualViewport.height when
 * available) — layout-viewport `vh` alone is not enough for soft keyboards and
 * landscape phones.
 */
export function expandedLimits(containerWidthPx: number, visualHeightPx: number): ExpandedLimits {
  const band = bandOf(containerWidthPx)
  const height = Number.isFinite(visualHeightPx) && visualHeightPx > 0 ? visualHeightPx : Infinity
  let expandedMaxPx: number
  if (height < STANDARD_HEIGHT_PX) {
    // Landscape / soft keyboard: compact cap <= 40% of the visible height,
    // keeping the 44px control row reachable; never cover the input.
    expandedMaxPx = Math.max(CONTROL_ROW_MIN_PX, Math.floor(height * 0.4))
  } else if (band === 'narrow') {
    expandedMaxPx = Math.min(EXPANDED_NARROW_MAX_PX, Math.floor(height * 0.4))
  } else {
    expandedMaxPx = EXPANDED_WIDE_MAX_PX
  }
  return {
    expandedMaxPx,
    listMaxPx: Math.max(0, expandedMaxPx - CONTROL_ROW_MIN_PX),
  }
}
