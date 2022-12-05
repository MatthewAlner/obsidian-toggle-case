#!/usr/bin/env bash

OBSIDIAN_PLUGIN_PATH="$HOME/obsidian-vaults/Sandbox/.obsidian/plugins"
OBSIDIAN_PLUGIN_NAME="toggle-case"

rm -rf "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"
mkdir -p "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"
cp main.js styles.css manifest.json "${OBSIDIAN_PLUGIN_PATH:?}/${OBSIDIAN_PLUGIN_NAME:?}"
