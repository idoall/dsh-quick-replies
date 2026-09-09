/**
 * dsh-quick-replies — item CRUD operations (pure).
 *
 * Every list edit is expressed as a NEW whole-library array (array order IS
 * display order — no separate order field) and validated with the same strict
 * judge as imports. Save = add/update only; it never sends.
 */
import { judgeItem, type ValidationIssue } from '../../shared/validate.ts'
import type { QuickReply } from '../../shared/types.ts'

export interface ItemDraft {
  label: string
  content: string
  enabled: boolean
}

export type FieldIssue = Exclude<ValidationIssue, 'too-many-items'> | 'too-many-items' | null

/** Validate a draft the same way a stored item would be judged. */
export function judgeDraft(draft: ItemDraft, id: string): FieldIssue {
  const issue = judgeItem({ id, label: draft.label, content: draft.content, enabled: draft.enabled })
  return issue
}

/** Append a freshly-minted reply; returns the issue code when the draft is invalid. */
export function withNewId(items: QuickReply[], draft: ItemDraft, id: string): QuickReply[] | FieldIssue {
  const issue = judgeDraft(draft, id)
  if (issue !== null) return issue
  return [...items, { id, ...draft }]
}

export function updateItem(items: QuickReply[], id: string, draft: ItemDraft): QuickReply[] | FieldIssue {
  const issue = judgeDraft(draft, id)
  if (issue !== null) return issue
  const index = items.findIndex(item => item.id === id)
  if (index === -1) return items
  const next = items.slice()
  next[index] = { ...next[index]!, ...draft }
  return next
}

export function removeItem(items: QuickReply[], id: string): QuickReply[] {
  return items.filter(item => item.id !== id)
}

export function toggleItem(items: QuickReply[], id: string): QuickReply[] {
  return items.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item))
}

export function moveItem(items: QuickReply[], id: string, delta: -1 | 1): QuickReply[] {
  const index = items.findIndex(item => item.id === id)
  if (index === -1) return items
  const target = index + delta
  if (target < 0 || target >= items.length) return items
  const next = items.slice()
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row!)
  return next
}
