#!/usr/bin/env bash

OBSIDIAN_PLUGIN_PATH="$HOME/obsidian-vaults/Sandbox/.obsidian/plugins"
OBSIDIAN_PLUGIN_NAME="toggle-case"

echo "running local deploy:"
echo "PATH: ${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"

rm -rf "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"
mkdir -p "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"
cp dist/main.js styles.css manifest.json "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"

printf "$(tput setaf 2)✓ Success: $(tput sgr0)%s.\n" "Restart Obsidian"
