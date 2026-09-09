/**
 * dsh-quick-replies — Host settings registration.
 *
 * The Host half only REGISTERS the `quick-replies` namespace: the schema plus
 * the composition `base` (the four built-in default replies) plus the strict
 * validator that the schemastery schema cannot express (code-point length
 * limits, id uniqueness, non-blank bodies). Writes go through the Host
 * settings document like any other user setting — the reply library is NOT
 * client-localStorage state.
 *
 * Optional composition: a deployment without a settings provider never runs
 * the inject callback and the plugin stays inert with no card (safe). A
 * registration failure (e.g. a hand-edited document that already fails the
 * strict validator) is contained and diagnosed instead of taking the plugin
 * or the Host down.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { DEFAULT_ITEMS, QR_NAMESPACE, SCHEMA_VERSION } from '../shared/limits.ts'
import type { QuickReply } from '../shared/types.ts'
import { assertSectionValid } from '../shared/validate.ts'

/** Schema-shape of the section: version is numeric here, literal 1 is enforced at runtime. */
export interface QuickRepliesSectionShape {
  schemaVersion: number
  items: QuickReply[]
}

/**
 * The wire schema. Kept deliberately loose on length (schemastery counts code
 * units, the product limits count code points); the strict validator below
 * carries those constraints, exactly the separation dsh-settings documents.
 */
export const SettingsSchema: z<QuickRepliesSectionShape> = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    content: z.string(),
    enabled: z.boolean(),
  })).default([]),
})

/** Serve the namespace while a settings provider is composed; inert otherwise. */
export function installSettings(ctx: Context): void {
  ctx.inject(['settings'], (sctx) => {
    try {
      sctx.settings.register(QR_NAMESPACE as SettingsNamespace, SettingsSchema, {
        // Composition `base`: fresh browsers see the four built-ins. Once the
        // user stores ANY section (even `items: []`) the built-ins never
        // return — deleting everything stays deleted.
        base: { items: DEFAULT_ITEMS.map(item => ({ ...item })) },
        applies: 'live',
        validate: (value) => { assertSectionValid(value) },
      })
    } catch (error) {
      console.error('[dsh-quick-replies] settings namespace registration failed:', error)
    }
  })
}
