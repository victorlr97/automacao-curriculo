#!/bin/sh
set -e

# A CLI do Claude Code espera a sessão em ~/.claude/.credentials.json. Esse
# arquivo vem de um secret do Secret Manager, montado como volume no Cloud
# Run em /secrets/claude-credentials.json (sessão pessoal, mesma usada no
# Render) — sem ele a CLI pediria login interativo, que não existe aqui.
mkdir -p "$HOME/.claude"
if [ -f /secrets/claude-credentials.json ]; then
  # `cp` recusa copiar esse arquivo: o Cloud Run monta secrets como um
  # symlink trocado atomicamente por baixo, e o coreutils `cp` detecta essa
  # troca em pleno voo e aborta ("as it was replaced while being copied").
  # `cat` + redirecionamento não tem esse problema.
  cat /secrets/claude-credentials.json > "$HOME/.claude/.credentials.json"
fi

export PUPPETEER_EXECUTABLE_PATH="$(node scripts/ensure-chrome.js)"

exec node server/index.js
