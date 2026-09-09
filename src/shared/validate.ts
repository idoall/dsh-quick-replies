/**
 * dsh-quick-replies — strict library validation shared by every gate.
 *
 * One implementation is used by the Host registration validate hook, the
 * client store when mirroring the settings scope, and the import preview, so
 * a malformed section can never slip past one gate while another rejects it.
 * Values are treated as untrusted JSON (settings documents and imports can be
 * edited by hand or another browser), so every field is re-proved, unknown
 * structure is refused, and nothing is ever coerced.
 */
import {
  ID_PATTERN,
  MAX_CONTENT_CODE_POINTS,
  MAX_ID_LENGTH,
  MAX_ITEMS,
  MAX_LABEL_CODE_POINTS,
  MIN_CONTENT_CODE_POINTS,
  SCHEMA_VERSION,
} from './limits.ts'
import { codePointLength, isBlank } from './text.ts'
import type { QuickReply, QuickReplySettings } from './types.ts'

/** Stable machine reason codes (UI dictionaries translate them). */
export type ValidationIssue =
  | 'not-object'
  | 'unsupported-version'
  | 'extra-top-level-key'
  | 'missing-top-level-key'
  | 'items-not-array'
  | 'too-many-items'
  | 'item-not-object'
  | 'item-extra-key'
  | 'item-missing-key'
  | 'item-id-invalid'
  | 'item-id-not-unique'
  | 'item-label-invalid'
  | 'item-label-too-long'
  | 'item-content-invalid'
  | 'item-content-blank'
  | 'item-content-too-long'
  | 'item-enabled-invalid'

export type SettingsJudgement =
  | { kind: 'ok'; data: QuickReplySettings }
  | { kind: 'unsupported-version'; version: unknown }
  | { kind: 'invalid'; issue: ValidationIssue }

const ALLOWED_TOP_KEYS = new Set(['schemaVersion', 'items'])
const ALLOWED_ITEM_KEYS = new Set(['id', 'label', 'content', 'enabled'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return false
  }
  return true
}

function validId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  if (id.length === 0 || id.length > MAX_ID_LENGTH) return false
  return ID_PATTERN.test(id)
}

/**
 * Strictly judge one resolved settings section (untrusted). The section is a
 * record with exactly `schemaVersion` + `items`; items are strict records of
 * id/label/content/enabled meeting the V1 product limits.
 */
export function judgeSection(value: unknown): SettingsJudgement {
  if (!isRecord(value)) return { kind: 'invalid', issue: 'not-object' }
  if (!hasOnlyKeys(value, ALLOWED_TOP_KEYS)) return { kind: 'invalid', issue: 'extra-top-level-key' }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    // Present-but-unknown versions (including numeric 2+) and missing/wrong
    // versions are treated as incompatible — never coerced down to V1.
    return { kind: 'unsupported-version', version: value.schemaVersion }
  }
  const items = value.items
  if (!Array.isArray(items)) return { kind: 'invalid', issue: 'items-not-array' }
  if (items.length > MAX_ITEMS) return { kind: 'invalid', issue: 'too-many-items' }
  const seen = new Set<string>()
  for (const entry of items) {
    if (!isRecord(entry)) return { kind: 'invalid', issue: 'item-not-object' }
    if (!hasOnlyKeys(entry, ALLOWED_ITEM_KEYS)) return { kind: 'invalid', issue: 'item-extra-key' }
    const { id, label, content, enabled } = entry
    if (!validId(id)) return { kind: 'invalid', issue: 'item-id-invalid' }
    if (seen.has(id)) return { kind: 'invalid', issue: 'item-id-not-unique' }
    seen.add(id)
    if (typeof label !== 'string' || label.length === 0) return { kind: 'invalid', issue: 'item-label-invalid' }
    if (codePointLength(label) > MAX_LABEL_CODE_POINTS) return { kind: 'invalid', issue: 'item-label-too-long' }
    if (typeof content !== 'string' || content.length === 0) return { kind: 'invalid', issue: 'item-content-invalid' }
    if (codePointLength(content) < MIN_CONTENT_CODE_POINTS) return { kind: 'invalid', issue: 'item-content-invalid' }
    if (isBlank(content)) return { kind: 'invalid', issue: 'item-content-blank' }
    if (codePointLength(content) > MAX_CONTENT_CODE_POINTS) return { kind: 'invalid', issue: 'item-content-too-long' }
    if (typeof enabled !== 'boolean') return { kind: 'invalid', issue: 'item-enabled-invalid' }
  }
  return { kind: 'ok', data: value as unknown as QuickReplySettings }
}

/**
 * Single-item edits (create/update from the management form) are validated the
 * same way the import path is — never only by HTML maxlength.
 * @returns the issue code, or null when the item is acceptable.
 */
export function judgeItem(input: { id: string; label: string; content: string; enabled: boolean }): ValidationIssue | null {
  const wrapped: unknown = { schemaVersion: SCHEMA_VERSION, items: [input] }
  const judged = judgeSection(wrapped)
  if (judged.kind === 'ok') return null
  return judged.kind === 'invalid' ? judged.issue : 'item-content-invalid'
}

/** Throw helper used by the Host registration validate hook (dsh-settings contract). */
export function assertSectionValid(value: unknown): void {
  const judged = judgeSection(value)
  if (judged.kind === 'invalid') {
    throw new Error(`quick-replies: invalid library section (${judged.issue})`)
  }
  if (judged.kind === 'unsupported-version') {
    throw new Error(`quick-replies: unsupported library version ${String(judged.version)}`)
  }
}

/** Narrow one valid section into typed items; invalid sections become undefined. */
export function itemsOf(value: unknown): QuickReply[] | undefined {
  const judged = judgeSection(value)
  return judged.kind === 'ok' ? judged.data.items : undefined
}
