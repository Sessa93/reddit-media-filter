#!/usr/bin/env bash
# Zips only the files the extension needs into dist/ and prints the zip's path.
# The zip can be unpacked and loaded, or uploaded to the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
out="dist/reddit-media-filter-$version.zip"

rm -rf dist
mkdir dist
zip -qrX "$out" manifest.json background.js src popup icons -x '*.DS_Store'

# Fail if the manifest points at a file that did not make it into the zip.
missing=$(node -e '
  const m = require("./manifest.json");
  const wanted = [
    m.background.service_worker,
    m.action.default_popup,
    ...Object.values(m.icons),
    ...Object.values(m.action.default_icon),
    ...m.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])]),
  ];
  const zipped = new Set(process.argv.slice(1));
  console.log(wanted.filter((f) => !zipped.has(f)).join(" "));
' $(unzip -Z1 "$out"))
if [ -n "$missing" ]; then
  echo "Missing from $out: $missing" >&2
  exit 1
fi

echo "$out"
