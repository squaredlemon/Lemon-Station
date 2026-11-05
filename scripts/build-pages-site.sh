#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
pages_root="$project_root/docs"
landing_root="$project_root/marketing-site"
app_root="$pages_root/test"

mkdir -p "$pages_root/assets" "$pages_root/downloads" "$app_root/assets" "$app_root/src/css" "$app_root/src/js"

cp "$landing_root/index.html" "$pages_root/index.html"
cp "$landing_root/styles.css" "$pages_root/styles.css"
cp "$landing_root/script.js" "$pages_root/script.js"
cp "$landing_root/assets/lemon-station-mark.svg" "$pages_root/assets/lemon-station-mark.svg"
cp "$landing_root/downloads/Lemon-Station.zip" "$pages_root/downloads/Lemon-Station.zip"

cp "$project_root/index.html" "$app_root/index.html"
cp "$project_root/assets/squaredlemon-profile.png" "$app_root/assets/squaredlemon-profile.png"
cp "$project_root/src/css/styles.css" "$app_root/src/css/styles.css"
cp "$project_root/src/js/"*.js "$app_root/src/js/"
: > "$pages_root/.nojekyll"

printf 'Prepared Cloudflare Pages site in %s\n' "$pages_root"
printf '  showcase: https://lemonstation.app/\n'
printf '  app test: https://lemonstation.app/test/\n'
