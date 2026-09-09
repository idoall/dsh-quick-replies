/**
 * dsh-quick-replies — Unicode text helpers.
 *
 * Length constraints are measured in Unicode CODE POINTS (not UTF-16 code
 * units, so astral emoji count as one) and emptiness is decided by Unicode
 * whitespace only — the plugin never trims stored bodies.
 */

/** Count Unicode code points of a string. */
export function codePointLength(text: string): number {
  let count = 0
  // for..of iterates code points (astral pairs as one unit).
  for (const _ of text) count += 1
  return count
}

/** Whether the text is empty or only Unicode whitespace (no trimming performed). */
export function isBlank(text: string): boolean {
  return text.trim().length === 0
}

/** UTF-8 byte length (matches the import size gate). */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Does this string exceed `max` code points? */
export function exceedsCodePoints(text: string, max: number): boolean {
  return codePointLength(text) > max
}
