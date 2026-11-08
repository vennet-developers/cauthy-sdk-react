#!/bin/sh
# The package as Next.js's app router takes it: the tarball of
# @cauthyhq/react, with @cauthyhq/js from npm, installed into examples/next-acme,
# whose page renders the ready-made parts on the server (`next build`
# prerenders it). A part that touches the browser while rendering, or an
# entry without 'use client', fails the build.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
npm run build
pack=$(mktemp -d)
trap 'rm -rf "$pack"' EXIT
npm pack --pack-destination "$pack" >/dev/null
mkdir -p "$pack/react"
tar -xzf "$pack"/cauthyhq-react-*.tgz -C "$pack/react"
js=$(node -p "require('./package.json').dependencies['@cauthyhq/js']")

cd examples/next-acme
rm -rf node_modules/@cauthyhq .next
npm install --no-audit --no-fund
npm install --no-save --no-audit --no-fund "@cauthyhq/js@$js"
mkdir -p node_modules/@cauthyhq/react
cp -R "$pack/react/package/." node_modules/@cauthyhq/react/
NEXT_TELEMETRY_DISABLED=1 npx next build
echo "ssr: Next.js app router builds and prerenders the ready-made parts"
