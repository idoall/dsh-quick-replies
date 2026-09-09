/**
 * dsh-quick-replies — shared text/limits/validate/import specs.
 */
import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_UTF8_BYTES, SCHEMA_VERSION } from '../../src/shared/limits.ts'
import { codePointLength, isBlank, utf8Bytes } from '../../src/shared/text.ts'
import { judgeItem, judgeSection, itemsOf } from '../../src/shared/validate.ts'
import { exportDocument, judgeImport, renderExport } from '../../src/shared/importExport.ts'
import { newReplyId } from '../../src/shared/id.ts'

describe('text helpers', () => {
  it('counts Unicode code points (astral emoji are one point)', () => {
    expect(codePointLength('abc')).toBe(3)
    expect(codePointLength('中文😀')).toBe(3) // 中 文 😀(astral pair)
    expect(codePointLength('')).toBe(0)
  })

  it('blank detection uses whitespace only', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('\t\n\u3000')).toBe(true)
    expect(isBlank(' 继续 ')).toBe(false)
  })

  it('UTF-8 byte length matches the import size gate', () => {
    expect(utf8Bytes('abc')).toBe(3)
    expect(utf8Bytes('中')).toBe(3)
    expect(utf8Bytes('😀')).toBe(4)
  })
})

describe('judgeSection / judgeItem', () => {
  const good = { schemaVersion: 1, items: [{ id: 'a1', label: '继续', content: '继续', enabled: true }] }

  it('accepts the canonical section', () => {
    expect(judgeSection(good).kind).toBe('ok')
  })

  it('rejects unknown versions (no silent downgrade)', () => {
    expect(judgeSection({ ...good, schemaVersion: 2 })).toEqual({ kind: 'unsupported-version', version: 2 })
    expect(judgeSection({ ...good, schemaVersion: '1' })).toEqual({ kind: 'unsupported-version', version: '1' })
  })

  it('rejects non-object, extra keys, and missing keys', () => {
    expect(judgeSection(null).kind).toBe('invalid')
    expect(judgeSection([1, 2])).toEqual({ kind: 'invalid', issue: 'not-object' })
    expect(judgeSection({ ...good, extra: 1 })).toEqual({ kind: 'invalid', issue: 'extra-top-level-key' })
    expect(judgeSection({ schemaVersion: 1 })).toEqual({ kind: 'invalid', issue: 'items-not-array' })
  })

  it('enforces count and per-item constraints in code points', () => {
    const tooMany = { schemaVersion: 1, items: Array.from({ length: 51 }, (_, i) => ({ id: `i${i}`, label: 'x', content: 'y', enabled: true })) }
    expect(judgeSection(tooMany)).toEqual({ kind: 'invalid', issue: 'too-many-items' })

    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: '', content: 'y', enabled: true }] })).toEqual({ kind: 'invalid', issue: 'item-label-invalid' })
    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: 'x'.repeat(41), content: 'y', enabled: true }] })).toEqual({ kind: 'invalid', issue: 'item-label-too-long' })
    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: 'x', content: '😀'.repeat(8001), enabled: true }] })).toEqual({ kind: 'invalid', issue: 'item-content-too-long' })
    // 8000 code points of astral emoji are allowed (not 8000 UTF-16 units).
    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: 'x', content: '😀'.repeat(8000), enabled: true }] }).kind).toBe('ok')
    // 8000 BMP chars are also within the limit.
    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: 'x', content: '中'.repeat(8000), enabled: true }] }).kind).toBe('ok')
  })

  it('rejects blank bodies and duplicate ids', () => {
    expect(judgeSection({ schemaVersion: 1, items: [{ id: 'a', label: 'x', content: '   ', enabled: true }] })).toEqual({ kind: 'invalid', issue: 'item-content-blank' })
    const dup = {
      schemaVersion: 1,
      items: [
        { id: 'a', label: 'x', content: 'y', enabled: true },
        { id: 'a', label: 'z', content: 'w', enabled: true },
      ],
    }
    expect(judgeSection(dup)).toEqual({ kind: 'invalid', issue: 'item-id-not-unique' })
  })

  it('judges single items with the same rules as full sections', () => {
    expect(judgeItem({ id: 'a', label: '继续', content: '继续', enabled: true })).toBeNull()
    expect(judgeItem({ id: 'a', label: 'x', content: '   ', enabled: true })).toBe('item-content-blank')
    expect(judgeItem({ id: 'a', label: 'x'.repeat(41), content: 'y', enabled: true })).toBe('item-label-too-long')
  })

  it('itemsOf narrows only valid sections', () => {
    expect(itemsOf(good)?.length).toBe(1)
    expect(itemsOf({ schemaVersion: 2, items: [] })).toBeUndefined()
    expect(itemsOf('nope')).toBeUndefined()
  })
})

describe('import / export', () => {
  const library = {
    schemaVersion: SCHEMA_VERSION,
    items: [
      { id: 'qr_keep', label: '继续', content: '继续', enabled: true },
      { id: 'qr_emoji', label: '再来一遍', content: '😀'.repeat(10), enabled: false },
    ],
  }

  it('round-trips renderExport through judgeImport', () => {
    const text = renderExport(library)
    const judged = judgeImport(text)
    expect(judged.kind).toBe('ok')
    if (judged.kind !== 'ok') return
    expect(judged.data).toEqual(library)
    expect(judged.byteLength).toBe(utf8Bytes(text))
  })

  it('exportDocument detaches the payload', () => {
    const doc = exportDocument(library.items)
    expect(doc).toEqual(library)
    doc.items[0]!.label = 'changed'
    expect(library.items[0]!.label).toBe('继续')
  })

  it('rejects malformed JSON, oversized files, and foreign structure', () => {
    const issueOf = (text: string): string | null => {
      const judged = judgeImport(text)
      return judged.kind === 'invalid' ? judged.issue : null
    }
    expect(issueOf('{ nope')).toBe('json-parse')
    expect(issueOf('null')).toBe('not-object')
    expect(issueOf(JSON.stringify({ schemaVersion: 1, items: [], evil: true }))).toBe('extra-top-level-key')
    expect(issueOf(JSON.stringify({ schemaVersion: 1, items: [{ id: 'a', label: 'x', content: 'y', enabled: true, run: 'rm -rf' }] }))).toBe('item-extra-key')
    expect(judgeImport(JSON.stringify({ schemaVersion: 3, items: [] })).kind).toBe('unsupported-version')
    const huge = `{"schemaVersion":1,"items":${JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ id: `i${i}`, label: 'x', content: '中'.repeat(700), enabled: true })))}}`
    // Force byte overflow by padding beyond 1 MiB.
    const padded = `${huge}${' '.repeat(MAX_IMPORT_UTF8_BYTES)}`
    expect(issueOf(padded)).toBe('too-large')
  })

  it('rejects prototype-pollution keys in item records', () => {
    const issueOf = (text: string): string | null => {
      const judged = judgeImport(text)
      return judged.kind === 'invalid' ? judged.issue : null
    }
    const text = '{"schemaVersion":1,"items":[{"id":"a","label":"x","content":"y","enabled":true,"__proto__":{"polluted":true}}]}'
    expect(issueOf(text)).toBe('item-extra-key')
    // __proto__ as a top-level key is also refused.
    expect(issueOf('{"schemaVersion":1,"__proto__":{},"items":[]}')).toBe('extra-top-level-key')
  })
})

describe('id generation', () => {
  it('generates unique ids matching the id grammar', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i += 1) {
      const id = newReplyId()
      expect(id).toMatch(/^qr_[A-Za-z0-9]+$/)
      expect(seen.has(id)).toBe(false)
      seen.add(id)
    }
  })
})
