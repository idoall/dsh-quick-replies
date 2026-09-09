/**
 * dsh-quick-replies — library export/import (V1: full-library JSON).
 *
 * Export produces the plain document {schemaVersion, items}. Import is
 * STRICTLY validated before anything is written (byte size, version, shape,
 * counts, lengths, id uniqueness) and is applied only as one atomic
 * "preview then confirm replace" step — an invalid file is refused whole,
 * never partially saved. The JSON text itself is the only accepted payload:
 * no expressions, no unknown structure, no side channels.
 */
import { MAX_IMPORT_UTF8_BYTES, SCHEMA_VERSION } from './limits.ts'
import { judgeSection, type ValidationIssue } from './validate.ts'
import { utf8Bytes } from './text.ts'
import type { QuickReplySettings } from './types.ts'

export type ImportIssue = 'too-large' | 'json-parse' | ValidationIssue

export type ImportJudgement =
  | { kind: 'ok'; data: QuickReplySettings; byteLength: number }
  | { kind: 'unsupported-version'; version: unknown }
  | { kind: 'invalid'; issue: ImportIssue }

/** Strictly read one import document. Nothing is written by this function. */
export function judgeImport(text: string): ImportJudgement {
  const byteLength = utf8Bytes(text)
  if (byteLength > MAX_IMPORT_UTF8_BYTES) return { kind: 'invalid', issue: 'too-large' }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return { kind: 'invalid', issue: 'json-parse' }
  }
  const judged = judgeSection(parsed)
  if (judged.kind !== 'ok') return judged
  return { kind: 'ok', data: judged.data, byteLength }
}

/** Render the current library as the export document text. */
export function renderExport(data: QuickReplySettings): string {
  return `${JSON.stringify(data, null, 2)}\n`
}

/** Build the export payload object (a detached copy — never the live store). */
export function exportDocument(items: QuickReplySettings['items']): QuickReplySettings {
  return { schemaVersion: SCHEMA_VERSION, items: items.map(item => ({ ...item })) }
}
