/**
 * dsh-quick-replies — Host half (installed package entry).
 *
 * A plain Cordis plugin loaded as the `dsh-quick-replies` loader row. On DSH
 * 0.1.7 its library schema is its `Config` — the settings form namespace IS the
 * Loader entry id, so there is nothing left to register at runtime — and its
 * only remaining job is the page policy that keeps the generic settings form
 * from duplicating the plugin's own management dialog.
 *
 * Every behavior (sending, CRUD, folding, management) lives in the browser half
 * (`./client` bundle) which the package.json `dsh.client` declaration mounts.
 */
import type { Context } from '@deepseek-ai/cordis'
import { installPagePolicy } from './settings.ts'

export const name = 'dsh-quick-replies'

/** The reply library's Config schema — also the `dsh-quick-replies` settings form. */
export { Config } from './settings.ts'
export type { QuickRepliesConfigShape } from './settings.ts'

/** No required services: settings presence is optional (see installPagePolicy). */
export const inject: string[] = []

export function apply(ctx: Context): void {
  installPagePolicy(ctx)
}
