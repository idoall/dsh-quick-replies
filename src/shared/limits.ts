/**
 * dsh-quick-replies — product limits and identity constants.
 *
 * These are V1 PRODUCT limits for the plugin's own library (the requirements
 * document is explicit that they must not be presented as DSH server-side
 * limits). They are shared verbatim by the Host schema/validator, the client
 * store, and the import validator so every gate counts the same way.
 */
import type { QuickReply } from './types.ts'

/** Host settings namespace for the reply library (lowercase-hyphen). */
export const QR_NAMESPACE = 'quick-replies' as const

/** Library document schema version (V1). */
export const SCHEMA_VERSION = 1 as const

/** Upper bound of stored replies. */
export const MAX_ITEMS = 50

/** Display title: 1–40 Unicode code points. */
export const MAX_LABEL_CODE_POINTS = 40

/** Full body: 1–8000 Unicode code points. */
export const MIN_CONTENT_CODE_POINTS = 1
export const MAX_CONTENT_CODE_POINTS = 8000

/** Imported/exported JSON document size cap (UTF-8 bytes). */
export const MAX_IMPORT_UTF8_BYTES = 1024 * 1024

/** Generated id: 1–64 chars from a safe character class. */
export const MAX_ID_LENGTH = 64
export const ID_PATTERN = /^[A-Za-z0-9._:-]+$/

/**
 * The four built-in default replies (pure text, no automation meaning). They
 * compose as the settings namespace `base` layer, so a browser that never
 * wrote the namespace sees them — but once the user stores ANY section
 * (including an explicit empty `items` list) they never come back.
 */
export const DEFAULT_ITEMS: readonly QuickReply[] = [
  { id: 'qr-default-continue', label: '继续', content: '继续', enabled: true },
  { id: 'qr-default-interrupted-continue', label: '中断了请继续', content: '中断了请继续', enabled: true },
  { id: 'qr-default-what-next', label: '下一步该做什么？', content: '下一步该做什么？', enabled: true },
  { id: 'qr-default-restarted-continue', label: '已重启请继续', content: '已重启请继续', enabled: true },
]
