#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
parent_dir=$(dirname "$project_root")
download_dir="$project_root/marketing-site/downloads"
temporary_archive="$download_dir/Lemon-Station.tmp.zip"
final_archive="$download_dir/Lemon-Station.zip"

mkdir -p "$download_dir"
rm -f "$temporary_archive"

cd "$parent_dir"
zip -X -r "$temporary_archive" \
    "Lemon-Hub-1.0/README.md" \
    "Lemon-Hub-1.0/.gitignore" \
    "Lemon-Hub-1.0/index.html" \
    "Lemon-Hub-1.0/main.js" \
    "Lemon-Hub-1.0/preload.js" \
    "Lemon-Hub-1.0/package.json" \
    "Lemon-Hub-1.0/package-lock.json" \
    "Lemon-Hub-1.0/assets" \
    "Lemon-Hub-1.0/src" \
    "Lemon-Hub-1.0/scripts" \
    "Lemon-Hub-1.0/supabase" \
    "Lemon-Hub-1.0/ai-worker" \
    -x '*/.DS_Store'

mv "$temporary_archive" "$final_archive"
printf 'Created %s\n' "$final_archive"
