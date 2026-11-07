#!/bin/sh
# The packages as Next.js's app router takes them: the tarball of
# @cauthyhq/js and of @cauthyhq/react installed into examples/next-acme,
# whose page renders the ready-made parts on the server (`next build`
# prerenders it). A part that touches the browser while rendering, or an
# entry without 'use client', fails the build.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
npm run build
pack=$(mktemp -d)
trap 'rm -rf "$pack"' EXIT
if grep -q '"file:../cauthy-sdk-js"' package.json; then
  (cd ../cauthy-sdk-js && npm pack --pack-destination "$pack" >/dev/null)
else
  npm pack "@cauthyhq/js@$(node -p "require('./package.json').dependencies['@cauthyhq/js']")" --pack-destination "$pack" >/dev/null
fi
npm pack --pack-destination "$pack" >/dev/null
mkdir -p "$pack/react"
tar -xzf "$pack"/cauthyhq-react-*.tgz -C "$pack/react"
# While @cauthyhq/js is a sibling (file:), the packed package.json names a
# local path; the example installs the js tarball itself.
node -e "const f=process.argv[1]; const p=require(f); p.dependencies['@cauthyhq/js']='*'; require('fs').writeFileSync(f, JSON.stringify(p, null, 2))" "$pack/react/package/package.json"

cd examples/next-acme
rm -rf node_modules/@cauthyhq .next
npm install --no-audit --no-fund
npm install --no-save --no-audit --no-fund "$pack"/cauthyhq-js-*.tgz
mkdir -p node_modules/@cauthyhq/react
cp -R "$pack/react/package/." node_modules/@cauthyhq/react/
NEXT_TELEMETRY_DISABLED=1 npx next build
echo "ssr: Next.js app router builds and prerenders the ready-made parts"
