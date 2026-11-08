// Refuses to publish a package whose published dependencies a registry cannot
// serve: `file:`, `link:` or a git checkout. Such a package would install
// nowhere but here. Development dependencies are not published, so they may be local.
//
//   node scripts/no-file-deps.mjs [directory]     # default: the repository
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const local = /^(file:|link:|portal:|git\+|git:|github:|https?:)/
const bad = []
for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (local.test(String(spec))) bad.push(`${field}: ${name} ${spec}`)
  }
}
if (bad.length > 0) {
  console.error(`not publishable: these dependencies are not from the registry\n  ${bad.join('\n  ')}`)
  process.exit(1)
}
