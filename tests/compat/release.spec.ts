import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string): string => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const manifest = JSON.parse(read('package.json'))
const currentDsh = manifest.devDependencies['@deepseek-ai/dsh-settings'] as string
const tag = `v${manifest.version}`

describe('release consistency', () => {
  it('keeps both READMEs and bilingual release notes on the package and DSH versions', () => {
    for (const file of ['README.md', 'README.zh.md']) {
      const text = read(file)
      expect(text).toContain(`**\`${manifest.version}\`**`)
      expect(text).toContain(`**\`${currentDsh}\``)
    }
    const notes = read(`docs/releases/${tag}.md`)
    expect(notes).toContain(`<h3 id="cn-${tag}">`)
    expect(notes).toContain(`<h3 id="en-${tag}">`)
    expect(notes.split('---')[0]).toContain(currentDsh)
    expect(notes.split('---')[1]).toContain(currentDsh)
    expect(read('CHANGELOG.md')).toContain(`## ${manifest.version} —`)
  })

  it('declares each verified DSH prerelease in both engine and settings peer ranges', () => {
    const engine = manifest.dsh.engines.dsh as string
    const peer = manifest.peerDependencies['@deepseek-ai/dsh-settings'] as string
    expect(peer).toBe(engine)
    for (const version of [currentDsh, '0.2.1-rc.5']) {
      expect(engine.split(' || ')).toContain(version)
      expect(manifest.dsh.compatibility.dshReleases[version]).toBe('compatible')
    }
  })

  it('ships bilingual documentation and builds before artifact tests in release paths', () => {
    for (const file of ['README.md', 'README.zh.md', 'CHANGELOG.md']) {
      expect(manifest.files).toContain(file)
    }
    for (const file of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
      const workflow = read(file)
      expect(workflow.indexOf('- run: pnpm run build')).toBeGreaterThan(-1)
      expect(workflow.indexOf('- run: pnpm run build')).toBeLessThan(workflow.indexOf('- run: pnpm run test'))
    }
    expect(manifest.scripts.verify).toMatch(/^pnpm run build && pnpm run test/)
  })
})
