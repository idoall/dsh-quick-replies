import { defineConfig } from 'vitest/config'

// Specs import src/ directly (never the built lib/ artifacts), so the suite
// runs with no build step. Projects split by runtime: shared/host logic runs
// in plain node; client logic and UI specs run in jsdom (React 18 + real
// react-dom, no host primitives needed).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'logic',
          include: [
            'tests/shared/**/*.spec.ts',
            'tests/host/**/*.spec.ts',
            'tests/client-logic/**/*.spec.ts',
          ],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'client-ui',
          include: ['tests/client-ui/**/*.spec.ts', 'tests/client-ui/**/*.spec.tsx'],
          environment: 'jsdom',
        },
      },
      {
        // Built-artifact lane: exercises the BUILT lib/client.js and
        // lib/index.js bundles (module shape, style tags, exports). Skips
        // cleanly when lib/ is absent.
        test: {
          name: 'compat',
          include: ['tests/compat/**/*.spec.ts'],
          environment: 'node',
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/shared/types.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
