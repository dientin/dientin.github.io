#!/bin/sh
# Pone una versión nueva (fecha-hora) en index.html y version.json. Lo corre el hook pre-commit.
cd "$(git rev-parse --show-toplevel)" || exit 1
V=$(date +%Y%m%d%H%M%S)
sed -i -E "s/(app-version\" content=\")[^\"]*/\1$V/; s/(\?v=)[0-9]+/\1$V/g" index.html
printf '{"v":"%s"}\n' "$V" > version.json
git add index.html version.json
