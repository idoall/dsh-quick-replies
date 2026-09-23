/**
 * dsh-quick-replies — product limits and identity constants.
 *
 * These are V1 PRODUCT limits for the plugin's own library (the requirements
 * document is explicit that they must not be presented as DSH server-side
 * limits). They are shared verbatim by the Host Config schema, the client
 * store, and the import validator so every gate counts the same way.
 */
import type { QuickReply } from './types.ts'

/**
 * Settings namespace owning the reply library.
 *
 * DSH 0.1.7 identifies a settings form by the Loader entry id
 * (`docs/subsystems/settings.md`), so this is the plugin's own bundle-patch id
 * — `cordis.patch.yml` must keep inserting `id: dsh-quick-replies`. It was
 * `quick-replies` while 0.1.6 registered an independent namespace at runtime.
 */
export const QR_NAMESPACE = 'dsh-quick-replies' as const

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
 * are the `items` default of the Host Config schema, which is the composition
 * `base` layer a fresh profile resolves to — but once the user stores ANY
 * `items` value (including an explicit empty list) the stored array replaces
 * them wholesale and they never come back.
 */
export const DEFAULT_ITEMS: readonly QuickReply[] = [
  { id: 'qr-default-continue', label: '继续', content: '继续', enabled: true },
  { id: 'qr-default-interrupted-continue', label: '中断了请继续', content: '中断了请继续', enabled: true },
  { id: 'qr-default-what-next', label: '下一步该做什么？', content: '下一步该做什么？', enabled: true },
  { id: 'qr-default-restarted-continue', label: '已重启请继续', content: '已重启请继续', enabled: true },
]
