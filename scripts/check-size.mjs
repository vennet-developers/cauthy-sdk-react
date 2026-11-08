#!/usr/bin/env node
// The bundle budget: every JavaScript entry npm publishes stays at or under
// 45 kB gzipped, measured on the files as shipped. React and @cauthyhq/js are
// not in it: they are the application's own copies (tsup's `external`).
// Run after `npm run build`.
//
//   node scripts/check-size.mjs [dist directory]
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const BUDGET = 45_000 // bytes, gzipped
const dist = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '../dist'))
const entries = readdirSync(dist).filter((f) => /\.(c|m)?js$/.test(f)).sort()
if (entries.length === 0) {
  console.error('size: dist holds no JavaScript: run npm run build first')
  process.exit(1)
}
let over = false
for (const f of entries) {
  const size = gzipSync(readFileSync(join(dist, f)), { level: 9 }).length
  const ok = size <= BUDGET
  over ||= !ok
  console.log(`${ok ? 'ok  ' : 'OVER'} dist/${f}: ${(size / 1000).toFixed(2)} kB gzipped (budget ${BUDGET / 1000} kB)`)
}
if (over) {
  console.error('size: over the bundle budget')
  process.exit(1)
}
console.log('size: within the bundle budget')
