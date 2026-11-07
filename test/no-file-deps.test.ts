import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const script = join(__dirname, '..', 'scripts', 'no-file-deps.mjs')
let dir = ''
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = ''
})
function run(pkg: object) {
  dir = mkdtempSync(join(tmpdir(), 'acme-pkg-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  return spawnSync(process.execPath, [script, dir], { encoding: 'utf8' })
}

describe('scripts/no-file-deps.mjs, run before publishing', () => {
  it('refuses a dependency a registry cannot serve, and names it', () => {
    const r = run({ dependencies: { '@cauthyhq/js': 'file:../cauthy-sdk-js' }, peerDependencies: { react: '>=18' }, devDependencies: { '@cauthyhq/node': 'file:../cauthy-sdk-node' } })
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('@cauthyhq/js')
    expect(r.stderr).not.toContain('@cauthyhq/node')
  })

  it('refuses a link or a git checkout too', () => {
    expect(run({ optionalDependencies: { a: 'link:../a' } }).status).toBe(1)
    expect(run({ peerDependencies: { b: 'git+https://example.com/b.git' } }).status).toBe(1)
  })

  it('lets registry versions through', () => {
    const r = run({ dependencies: { '@cauthyhq/js': '^1.0.0' }, peerDependencies: { react: '>=18' } })
    expect(r.status).toBe(0)
  })
})
