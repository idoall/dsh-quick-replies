/**
 * dsh-quick-replies — small React hooks kit.
 *
 * Only framework-standard parts are used: useSyncExternalStore over the
 * plugin's observable stores, a ResizeObserver confined to the plugin's own
 * container (never DOM scanning), and the real visual-viewport height.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Observable plugin store exposing get()/subscribe() (sender, library, manage). */
export interface StoreLike<T> {
  get(): T
  subscribe(listener: () => void): () => void
}

/** Subscribe to a plugin store via useSyncExternalStore. */
export function useObservable<T>(store: StoreLike<T>): T {
  return useSyncExternalStore(
    (onChange) => store.subscribe(onChange),
    () => store.get(),
    () => store.get(),
  )
}

/** Observe one element's content width; undefined until the first measure. */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(): [{ current: T | null }, number | undefined] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState<number | undefined>(undefined)
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    if (typeof ResizeObserver !== 'function') {
      // No RO (older embed/private mode): fall back to offsetWidth on resize.
      const read = () => setWidth(element.clientWidth > 0 ? element.clientWidth : undefined)
      read()
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const next = Math.round(entry.contentRect.width)
        if (next > 0) setWidth(next)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/** Real visual-viewport height (soft keyboards/landscape); falls back to innerHeight. */
export function useVisualViewportHeight(): number {
  const read = (): number => {
    try {
      const vv = window.visualViewport
      if (vv !== null && vv !== undefined && typeof vv.height === 'number' && vv.height > 0) {
        return Math.round(vv.height)
      }
    } catch { /* older browsers */ }
    return window.innerHeight > 0 ? window.innerHeight : 800
  }
  const [height, setHeight] = useState<number>(read)
  useEffect(() => {
    const update = () => setHeight(read())
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined
    if (vv !== undefined && vv !== null) {
      vv.addEventListener('resize', update)
      vv.addEventListener('scroll', update)
    }
    window.addEventListener('resize', update)
    return () => {
      if (vv !== undefined && vv !== null) {
        vv.removeEventListener('resize', update)
        vv.removeEventListener('scroll', update)
      }
      window.removeEventListener('resize', update)
    }
  }, [])
  return height
}
