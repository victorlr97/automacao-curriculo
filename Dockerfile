FROM node:22-slim

# Libs que o Chrome headless (Puppeteer) precisa em Debian — sem isso o
# binário baixado por scripts/ensure-chrome.js não roda.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# CLI do Claude Code — autenticada em runtime copiando a sessão pessoal de um
# secret montado (ver server/cloudrun-start.sh), não por login interativo.
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY client/package.json client/package-lock.json client/
RUN cd client && npm ci

# Chaves VITE_* precisam existir no momento do build do client — o Vite
# embute tudo no bundle estático (client/vite.config.ts -> outDir ../public),
# nunca lê nada disso em runtime. Fixas aqui (não em ARG/--build-arg): o
# `gcloud run deploy --source` com Dockerfile ignora --set-build-env-vars
# (isso só vale pra build via buildpacks, sem Dockerfile) — confirmado
# inspecionando o passo "docker build" do Cloud Build, sem nenhum --build-arg.
# Não tem problema esses valores ficarem fixos aqui: são as mesmas chaves
# públicas do client/.env, já visíveis em qualquer bundle JS de app Firebase —
# a segurança de verdade é via Firebase Auth + allowlist no servidor, não por
# esconder essas chaves.
ENV VITE_FIREBASE_API_KEY=AIzaSyDym1BI6S1J23ABjlHyW31BwO38U_cODk8
ENV VITE_FIREBASE_AUTH_DOMAIN=automacao-curriculo-app.firebaseapp.com
ENV VITE_FIREBASE_PROJECT_ID=automacao-curriculo-app
ENV VITE_FIREBASE_STORAGE_BUCKET=automacao-curriculo-app.firebasestorage.app
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=1025080784481
ENV VITE_FIREBASE_APP_ID=1:1025080784481:web:174327b5bdb31407c61c20
ENV VITE_OWNER_EMAIL=victorlopesr15@gmail.com

COPY . .
RUN chmod +x server/cloudrun-start.sh \
  && cd client && npm run build

# Baixa o Chrome uma vez, dentro da própria imagem (container imutável —
# ao contrário do disco efêmero do Render, o cache não some entre starts).
RUN node scripts/ensure-chrome.js

# O Chrome headless recusa rodar como root sem --no-sandbox; em vez de
# afrouxar isso, roda tudo como usuário sem privilégios.
RUN useradd --create-home --shell /bin/sh appuser \
  && chown -R appuser:appuser /app
ENV HOME=/home/appuser
USER appuser

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["./server/cloudrun-start.sh"]
