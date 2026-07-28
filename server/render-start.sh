#!/bin/sh
set -e

# A CLI do Claude Code espera a sessão em ~/.claude/.credentials.json. Esse
# arquivo vem via Secret File do Render (sessão pessoal copiada da máquina
# local) — sem ele a CLI pediria login interativo, que não existe aqui.
mkdir -p "$HOME/.claude"
if [ -f /etc/secrets/claude-credentials.json ]; then
  cp /etc/secrets/claude-credentials.json "$HOME/.claude/.credentials.json"
fi

export PUPPETEER_EXECUTABLE_PATH="$(node scripts/ensure-chrome.js)"

exec node server/index.js
