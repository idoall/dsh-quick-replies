/**
 * dsh-quick-replies — status/message rendering helpers.
 *
 * Everything user-facing goes through the bilingual dictionary; semantic
 * results (adapter outcomes, refusal codes, storage notes, import issues) are
 * mapped here once so components stay thin.
 */
import { t } from '../i18n.ts'
import type { FailureTone, Refusal, SendResult, RequestMode } from '../send/faces.ts'
import type { StorageNote } from '../settings/libraryStore.ts'
import type { FieldIssue } from '../manage/ops.ts'

export function submittedText(mode: RequestMode): string {
  return mode === 'steer' ? t('bar.status.sent.steer') : t('bar.status.sent.queue')
}

export function failureText(tone: FailureTone, detail?: string): string {
  switch (tone) {
    case 'business':
      return t('bar.status.failure.business', { detail: detail ?? t('issue.generic', { code: 'refused' }) })
    case 'unknown':
      return t('bar.status.failure.unknown')
    case 'cancelled':
      return t('bar.status.failure.cancelled')
  }
}

export function sendResultText(result: SendResult): string {
  if (result.kind === 'submitted') return submittedText(result.mode)
  return failureText(result.tone, result.detail)
}

export function refusalText(refusal: Refusal): string {
  switch (refusal.code) {
    case 'no-session':
    case 'no-session-face':
    case 'session-removed':
    case 'session-not-open':
      return t('bar.note.unavailable')
    case 'session-blank':
      return t('bar.note.blank')
    case 'subagent-session':
      return t('bar.note.subagent')
    case 'disconnected':
      return t('bar.blocked.disconnected')
    case 'composer-blocked':
      return t('bar.blocked.composer')
    case 'input-busy':
      return t('bar.status.submitting')
    case 'item-disabled':
      return t('bar.status.failure.cancelled')
  }
}

export function storageNoteText(note: StorageNote): string {
  switch (note) {
    case 'ok': return ''
    case 'memory': return t('storage.note.memory')
    case 'readonly': return t('storage.note.readonly')
    case 'unavailable': return t('storage.note.unavailable')
    case 'unsupported-version': return t('storage.note.unsupported-version')
    case 'invalid-section': return t('storage.note.invalid-section')
  }
}

export function fieldIssueText(issue: FieldIssue): string | null {
  switch (issue) {
    case null: return null
    case 'item-label-invalid': return t('form.issue.label.blank')
    case 'item-label-too-long': return t('form.issue.label.too-long', { max: 40 })
    case 'item-content-invalid':
    case 'item-content-blank': return t('form.issue.content.blank')
    case 'item-content-too-long': return t('form.issue.content.too-long', { max: 8000 })
    case 'item-enabled-invalid': return t('form.issue.content.blank')
    case 'too-many-items': return t('issue.too-many-items', { max: 50 })
    default: return t('issue.generic', { code: issue })
  }
}

export function importIssueText(issue: string): string {
  switch (issue) {
    case 'json-parse': return t('import.issue.json-parse')
    case 'too-large': return t('import.issue.too-large')
    default: return t('issue.generic', { code: issue })
  }
}
