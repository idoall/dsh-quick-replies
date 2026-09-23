/**
 * dsh-quick-replies — Host half: the reply library's Config form.
 *
 * DSH 0.1.7 replaced `ctx.settings.register(namespace, schema, options)` with
 * Config-derived forms: `ctx.settings.describe()` projects the VOLATILE fields
 * of each active Loader entry's own `Config`, and the form namespace IS the
 * entry id (`docs/subsystems/settings.md`, "Identity and values"). There is no
 * registration call left to make — this plugin's `Config` IS its library
 * schema, and the Host half's remaining job is the one page policy below.
 *
 * Two facts the browser half depends on are fixed here:
 *
 * - The namespace is the bundle patch's entry id — `dsh-quick-replies`
 *   (`QR_NAMESPACE`), not the pre-0.1.7 `quick-replies` name.
 * - `schemaVersion` and `items` are `.volatile()`, so a library edit is
 *   committed into the running references and emits one `loader/volatile-update`
 *   instead of remounting the plugin (`docs/cordis-tutorial/05-config.md`,
 *   "Volatile fields"). A remount would restart the bar on every chip edit.
 *
 * The schema stays deliberately loose on length and uniqueness: schemastery
 * counts code units while the product limits count code points, and the
 * plugin's own strict judge (`../shared/validate.ts`) runs in the client. A
 * tight Host schema would make one hand-edited field reject the whole entry at
 * activation — the one failure this plugin must not have.
 */
import type {} from '@deepseek-ai/dsh-settings'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { DEFAULT_ITEMS, SCHEMA_VERSION } from '../shared/limits.ts'
import type { QuickReply } from '../shared/types.ts'

/** Shape of the `dsh-quick-replies` config section (the settings form view). */
export interface QuickRepliesConfigShape {
  /** Library document schema version (V1); the client refuses anything newer. */
  schemaVersion: number
  /** The stored replies, in display order. */
  items: QuickReply[]
}

/**
 * The reply library's Config schema; also the settings form's field set.
 *
 * Every field is volatile, so `settings.mutate` commits a new library into the
 * running references without a remount. The `items` default carries the four
 * built-in replies, which is the composition `base` a fresh profile shows and
 * what a field clear reverts to — deleting every chip stores `items: []`, which
 * is a user override and never falls back to the built-ins.
 *
 * The explicit annotation is load-bearing in two ways: without it the inferred
 * schema type references schemastery's internal `Dict` from cosmokit, which the
 * emitted `.d.ts` cannot name (TS2883) and the build fails; and the second type
 * argument has to admit the volatile wrapper, because a `.volatile()` field's
 * output is a stable reference rather than the bare value the input side takes.
 */
export const Config: z<QuickRepliesConfigShape, Record<string, unknown>> = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION).volatile(),
  items: z.array(z.object({
    id: z.string(),
    label: z.string(),
    content: z.string(),
    enabled: z.boolean(),
  })).default([...DEFAULT_ITEMS]).volatile(),
})

/**
 * Suppress the auto-generated settings page for this entry.
 *
 * `autoGenerate` defaults to true, which would put a second, generic form for
 * the reply array beside the plugin's own management dialog. Registering the
 * policy is the documented move for a plugin that owns its preference UI
 * (`ui-theme`, `ui-chat`, `ui-conversation` all do exactly this), and the
 * namespace row stays in `settings.describe()` either way — the browser half
 * still reads and writes it.
 *
 * Guarded twice: a deployment without the settings service never runs the
 * inject callback (the plugin stays inert with no card), and a refused policy
 * registration is contained instead of taking the plugin down.
 *
 * @param ctx - Host plugin context owning the entry's page policy.
 */
export function installPagePolicy(ctx: Context): void {
  try {
    ctx.inject(['settings'], (child) => {
      child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
    })
  } catch (error) {
    console.error('[dsh-quick-replies] settings page policy registration failed:', error)
  }
}
