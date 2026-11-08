import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const script = join(__dirname, '..', 'scripts', 'check-size.mjs')
let dir = ''
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})
function run(files: Record<string, string | Buffer>) {
  dir = mkdtempSync(join(tmpdir(), 'acme-dist-'))
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
  return spawnSync(process.execPath, [script, dir], { encoding: 'utf8' })
}

describe('scripts/check-size.mjs, the 45 kB gzip budget', () => {
  it('lets entries within the budget through, and says their size', () => {
    const r = run({ 'index.js': "'use client';\n".repeat(2000), 'index.mjs': 'export {}\n', 'index.js.map': randomBytes(200_000).toString('hex') })
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('dist/index.js')
    expect(r.stdout).toContain('budget 45 kB')
    expect(r.stdout).not.toContain('.map')
  })

  it('refuses an entry over it, and names it', () => {
    // Random bytes barely compress: 60 kB of them, as base64, stay over 45 kB gzipped.
    const r = run({ 'index.js': 'ok\n', 'index.mjs': randomBytes(60_000).toString('base64') })
    expect(r.status).toBe(1)
    expect(r.stdout).toContain('OVER dist/index.mjs')
  })

  it('refuses a dist with no JavaScript', () => {
    expect(run({ 'styles.css': 'a{}' }).status).toBe(1)
  })
})
