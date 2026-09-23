/**
 * dsh-quick-replies — shared type surface.
 *
 * The reply library is a plain-JSON user-settings section owned by the Host
 * settings entry `dsh-quick-replies` (the plugin's own Loader entry id, whose
 * Host Config schema declares these fields as volatile). These are the ONLY
 * shapes the plugin reads or writes anywhere (Host half, client half,
 * import/export).
 */

/** One stored quick reply. Array order in the settings section IS display order. */
export interface QuickReply {
  /** Plugin-generated, stable, unique across the library. */
  id: string
  /** Short display title (1–40 Unicode code points). Full content lives separately. */
  label: string
  /** Full body sent verbatim when clicked (1–8000 code points, not all whitespace). */
  content: string
  /** Disabled entries stay stored but are not offered for sending. */
  enabled: boolean
}

/** The settings section value (the `dsh-quick-replies` entry's config). */
export interface QuickReplySettings {
  /** V1 only. A future version must be refused (no silent downgrade). */
  schemaVersion: 1
  items: QuickReply[]
}

/**
 * Storage-state view surfaced to the UI. `unavailable` means the settings entry
 * is not exposed to this client or the connection keeps preferences
 * process-local (memory mode): edits are disabled and the truth is clearly
 * labelled, but a previously confirmed snapshot may still be used for sending.
 */
export type LibraryStatus = 'loading' | 'ready' | 'unavailable'

/** What the bar is allowed to do right now (derived, never guessed). */
export type SendAvailability =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'unknown-result' }
  | { kind: 'blocked'; reason: string }

/** Import/export document (V1: full-library JSON, schemaVersion + items only). */
export interface QuickReplyExport {
  schemaVersion: 1
  items: QuickReply[]
}
