#!/bin/sh
# What npm would publish, checked before it is: the build, the export map,
# the types under both module systems, the 'use client' mark Next.js reads,
# the entry loading under require and import, the stylesheet, the bundle
# budget (45 kB gzipped, React and @cauthyhq/js excluded), the licence files,
# nothing of the tests or of a real tenant in the tarball, and npm's own dry run.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

npm run build
# publint reads the package as npm would publish it. While @cauthyhq/js is the
# sibling checkout (file:), it is linted with the registry range Task 33 puts
# there instead; release.yml refuses to publish the file: one.
lint=$(mktemp -d)
npm pack --pack-destination "$lint" >/dev/null
tar -xzf "$lint"/cauthyhq-react-*.tgz -C "$lint"
node -e "const f=process.argv[1]; const p=require(f); const v=require('@cauthyhq/js/package.json').version; if (String(p.dependencies['@cauthyhq/js']).startsWith('file:')) p.dependencies['@cauthyhq/js']='^'+v; require('fs').writeFileSync(f, JSON.stringify(p, null, 2))" "$lint/package/package.json"
npx publint --strict "$lint/package"
rm -rf "$lint"
npx attw --pack . --profile node16 --exclude-entrypoints ./styles.css
for f in dist/index.js dist/index.mjs; do
  head -c 13 "$f" | grep -qx "'use client';" || { echo "$f does not start with 'use client';" >&2; exit 1; }
done
node -e "require('@cauthyhq/react')"
node --input-type=module -e "await import('@cauthyhq/react')"
test -f dist/styles.css || { echo "dist/styles.css is missing" >&2; exit 1; }
node scripts/check-size.mjs
if node -e "const p=require('./package.json'); process.exit(Object.values(p.dependencies ?? {}).some((v) => String(v).startsWith('file:')) ? 0 : 1)"; then
  echo "note: @cauthyhq/js is still the sibling checkout (file:); release.yml refuses to publish until Task 33" >&2
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
npm pack --pack-destination "$tmp" >/dev/null
tar -xzf "$tmp"/cauthyhq-react-*.tgz -C "$tmp"
if find "$tmp/package" \( -name '*.test.*' -o -name '*.spec.*' -o -path '*e2e*' -o -path '*examples*' -o -name 'compat*' \) | grep -q .; then
  echo "the tarball carries tests or examples" >&2
  exit 1
fi
for f in LICENSE NOTICE dist/styles.css; do
  [ -f "$tmp/package/$f" ] || { echo "the tarball lacks $f" >&2; exit 1; }
done
sh "$root/scripts/check-fixtures.sh" "$tmp/package"
# prepublishOnly refuses a file: dependency, as it should; while @cauthyhq/js
# is the sibling, the dry run skips it (the build above already ran).
if grep -q '"file:' package.json; then npm publish --dry-run --ignore-scripts; else npm publish --dry-run; fi
echo "package: ready to publish"
