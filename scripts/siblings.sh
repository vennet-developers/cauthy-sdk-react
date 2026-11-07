#!/bin/sh
# Brings the sibling repositories this package depends on by `file:` while
# they are not on npm: each next to this checkout (../<name>), built. In CI it
# fetches them at the commits siblings.lock pins. Locally it uses the
# checkouts already there and never moves them; it builds one only when its
# dist/ is missing. A dependency that is no longer `file:` is skipped, so the
# script is harmless once the packages are published.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
parent=$(cd .. && pwd)
grep -v '^#' siblings.lock | while read -r name ref; do
  [ -n "$name" ] || continue
  grep -q "\"file:../$name\"" package.json || continue
  dir=$parent/$name
  if [ -n "${CI:-}" ]; then
    rm -rf "$dir"
    git init -q "$dir"
    git -C "$dir" fetch -q --depth 1 "https://github.com/vennet-developers/$name.git" "$ref"
    git -C "$dir" checkout -q FETCH_HEAD
    (cd "$dir" && npm ci --no-audit --no-fund && npm run build)
  elif [ ! -d "$dir" ]; then
    echo "../$name is missing: clone vennet-developers/$name next to this repository" >&2
    exit 2
  else
    have=$(git -C "$dir" rev-parse HEAD)
    [ "$have" = "$ref" ] || echo "note: ../$name is at $have; siblings.lock pins $ref" >&2
    [ -d "$dir/dist" ] || (cd "$dir" && { [ -d node_modules ] || npm ci --no-audit --no-fund; } && npm run build)
  fi
  echo "sibling: $name ready"
done
