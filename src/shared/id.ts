/**
 * dsh-quick-replies — stable id generation.
 *
 * Ids are plugin-generated and stable for the lifetime of a reply (moves and
 * renames keep the id so export/import round-trips and cross-browser edits
 * address the same row). `crypto.randomUUID` is used when available; a
 * fallback keeps the plugin working in non-secure contexts (e.g. a LAN
 * address) without crashing.
 */
import { MAX_ID_LENGTH, ID_PATTERN } from './limits.ts'

function fallbackRandom(): string {
  // 16 random bytes as hex; good enough for collision resistance here.
  let out = ''
  for (let i = 0; i < 16; i += 1) {
    out += Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  }
  return out
}

/** Mint a new, stable, unique reply id. */
export function newReplyId(prefix = 'qr'): string {
  const rand = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : fallbackRandom()
  const id = `${prefix}_${rand}`
  // The fallback and any future id source must still satisfy the strict id
  // grammar used by validation/import.
  if (id.length > MAX_ID_LENGTH || !ID_PATTERN.test(id)) {
    throw new Error(`[dsh-quick-replies] generated id violates the id grammar: ${id}`)
  }
  return id
}
