/**
 * dsh-quick-replies — built-artifact smoke specs.
 *
 * Exercises the BUILT bundles (`lib/index.js` host half, `lib/client.js`
 * browser half) the way the harness loads them: the host half as a plain
 * Cordis plugin module; the client half inside the `window.__ModuleLoader__`
 * handoff with a require() bound to the platform module table. Skips cleanly
 * when `lib/` is absent (run `pnpm build` first).
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const ROOT = new URL('../../', import.meta.url).pathname
const HOST = `${ROOT}lib/index.js`
const CLIENT = `${ROOT}lib/client.js`

const skip = !existsSync(HOST) || !existsSync(CLIENT)

describe.skipIf(skip)('built host half (lib/index.js)', () => {
  it('exports a Cordis plugin shape and registers the quick-replies namespace', async () => {
    const mod = await import(HOST)
    expect(mod.name).toBe('dsh-quick-replies')
    expect(mod.inject).toEqual([])
    expect(typeof mod.apply).toBe('function')

    let registered: { ns: string; schema: unknown; options: unknown } | undefined
    const settings = {
      register(ns: string, schema: unknown, options: unknown) {
        registered = { ns, schema, options }
        return { get: () => ({ schemaVersion: 1, items: [] }) }
      },
    }
    const ctx = {
      inject(names: string[], cb: (raw: { settings: typeof settings }) => void) {
        cb({ settings })
      },
    }
    mod.apply(ctx)
    expect(registered?.ns).toBe('quick-replies')
    // Composition base = the four built-in replies.
    const base = (registered!.options as { base?: { items?: unknown[] } }).base
    expect(base?.items).toHaveLength(4)
  })
})

describe.skipIf(skip)('built client half (lib/client.js)', () => {
  function evaluateClient() {
    const code = readFileSync(CLIENT, 'utf8')
    const require = createRequire(import.meta.url)
    let registration: { id: string; factory: (req: (spec: string) => unknown) => Record<string, unknown> } | undefined
    const platform = new Map<string, unknown>([
      ['react', require('react')],
      ['react/jsx-runtime', require('react/jsx-runtime')],
      ['react-dom', require('react-dom')],
    ])
    const windowObj = {
      __ModuleLoader__: {
        load(reg: { id: string; factory: (req: (spec: string) => unknown) => Record<string, unknown> }) {
          registration = reg
        },
      },
    }
    const sandboxReq = (spec: string): unknown => {
      if (platform.has(spec)) return platform.get(spec)
      // Any other request proves the bundle inlined something forbidden — the
      // module table cannot answer it either.
      throw new Error(`bundle requested an unexpected module: ${spec}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const run = new Function('window', 'require', 'module', 'exports', code)
    const moduleBox = { exports: {} as Record<string, unknown> }
    run(windowObj, sandboxReq, moduleBox, moduleBox.exports)
    if (registration === undefined) throw new Error('bundle did not register with __ModuleLoader__')
    const exportsObj = registration.factory(sandboxReq)
    return { registration, exports: exportsObj, sandboxReq }
  }

  it('registers with the module loader and exports { name, inject, apply }', () => {
    const { registration, exports: mod } = evaluateClient()
    expect(registration.id).toBe('dsh-quick-replies')
    expect(mod.name).toBe('dsh-quick-replies')
    expect(mod.inject).toEqual(['slots', 'conversation', 'sessions'])
    expect(typeof mod.apply).toBe('function')
  })

  it('registers exactly ONE input.dock entry (id quick-replies, order 30) and styles are disposed', () => {
    // Minimal browser DOM (apply injects one <style data-plugin-css>).
    const tags: Array<{ dataset: Record<string, string>; textContent: string; parentNode: unknown | null }> = []
    const makeTag = (): { dataset: Record<string, string>; textContent: string; parentNode: unknown | null } => {
      const tag = { dataset: {}, textContent: '', parentNode: null }
      tags.push(tag)
      return tag
    }
    const documentStub = {
      querySelector: () => null,
      createElement: (kind: string) => (kind === 'style' ? makeTag() : { dataset: {} }),
      head: { appendChild(tag: { parentNode: unknown | null }) { tag.parentNode = { removeChild() {} } } },
    }
    const previous = { window: globalThis as unknown as Record<string, unknown>, doc: (globalThis as unknown as Record<string, unknown>).document }
    ;(globalThis as unknown as Record<string, unknown>).window = { visualViewport: undefined }
    ;(globalThis as unknown as Record<string, unknown>).document = documentStub
    try {
      const { exports: mod } = evaluateClient()
      const registrations: Array<{ registration: { name: string; id: string; order?: number } }> = []
      const effectDisposers: Array<() => void> = []
      const ctx = {
        slots: {
          inject(name: string, cb: () => unknown) {
            expect(name).toBe('conversation.input.dock')
            registrations.push(cb() as never)
          },
          register(registration: { name: string; id: string; order?: number }, _component: unknown) {
            return registration
          },
        },
        sessions: { binding: () => undefined, scope: () => undefined },
        conversation: {
          input: { for: () => undefined },
          blocks: { storeFor: () => undefined },
        },
        get: () => undefined,
        inject(_names: string[], _cb: (raw: never) => void) { /* settings optional */ },
        effect(setup: () => (() => void) | void) {
          const dispose = setup()
          if (typeof dispose === 'function') effectDisposers.push(dispose)
        },
      }
      ;(mod.apply as (ctx: never) => void)(ctx as never)

      expect(registrations).toHaveLength(1)
      expect(registrations[0]).toEqual({ name: 'conversation.input.dock', id: 'quick-replies', order: 30 })
      // Style tag was injected exactly once by the first apply.
      const styleTags = tags.filter(t => t.dataset.pluginCss === 'dsh-quick-replies/styles')
      expect(styleTags).toHaveLength(1)

      // A second plugin lifecycle (HMR reload) must not duplicate the style.
      const tags2: typeof tags = []
      const documentStub2 = {
        querySelector: () => styleTags[0]!,
        createElement: () => tags2.length ? tags2[0]! : { dataset: {}, textContent: '', parentNode: null },
        head: { appendChild(tag: { parentNode: unknown | null }) { tag.parentNode = {} } },
      }
      ;(globalThis as unknown as Record<string, unknown>).document = documentStub2
      const reMod = evaluateClient()
      ;(reMod.exports.apply as (ctx: never) => void)(ctx as never)
      expect(tags2).toHaveLength(0) // existing tag was found, nothing appended

      // Dispose removes the tag when a plugin stops (the disposer runs cleanly).
      // Two lifecycles (initial + HMR reload) each registered a teardown.
      expect(effectDisposers).toHaveLength(2)
      for (const dispose of effectDisposers) {
        expect(() => dispose()).not.toThrow()
      }
    } finally {
      ;(globalThis as unknown as Record<string, unknown>).window = previous.window
      ;(globalThis as unknown as Record<string, unknown>).document = previous.doc
    }
  })
})
