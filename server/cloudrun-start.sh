#!/bin/sh
set -e

# ANTHROPIC_API_KEY chega como variável de ambiente, vinda do Secret Manager
# — nada a montar aqui.
export PUPPETEER_EXECUTABLE_PATH="$(node scripts/ensure-chrome.js)"

exec node server/index.js
