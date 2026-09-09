/**
 * dsh-quick-replies — Host half (installed package entry).
 *
 * A plain Cordis plugin loaded as the `dsh-quick-replies` loader row. Its one
 * job is registering the per-user `quick-replies` settings namespace; every
 * behavior (sending, CRUD, folding, management) lives in the browser half
 * (`./client` bundle) which the package.json `dsh.client` declaration mounts.
 */
import type { Context } from '@deepseek-ai/cordis'
import { installSettings } from './settings.ts'

export const name = 'dsh-quick-replies'

/** No required services: settings presence is optional (see installSettings). */
export const inject: string[] = []

export function apply(ctx: Context): void {
  installSettings(ctx)
}
