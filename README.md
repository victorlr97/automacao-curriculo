# Gerador de Currículo

Gerador de currículos em PDF, adaptados por vaga, usando IA. Roda local, sem API paga.

## Como funciona

Cada perfil tem um banco de fatos (experiências, projetos, skills, formação etc). Você cola a descrição de uma vaga e a IA monta um currículo novo a partir desses fatos, escolhendo o que é relevante pra aquela vaga.

O motor de IA é a CLI do Claude Code (`claude -p ...`).

## Funcionalidades

- Múltiplos perfis, cada um com seu banco de fatos e seus currículos gerados
- Editor do banco de fatos, com importação a partir de um PDF de currículo existente
- Geração de currículo em PDF a partir da descrição da vaga (detecta pt/en)
- Preview e edição do currículo gerado, com re-renderização do PDF
- Tradução pt ↔ en
- Roteiro de vídeo de apresentação
- Carta de apresentação
- Galeria dos currículos já gerados por perfil

## Stack

- Backend: Node.js + Express, `puppeteer-core` (renderização do PDF), motor de IA via CLI do Claude Code
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4

## Pré-requisitos

- Node.js 22+
- Claude Code instalado e autenticado (`claude` no PATH)
- Google Chrome ou Microsoft Edge instalado

## Como rodar

```bash
npm install
cd client && npm install && cd ..
```

Desenvolvimento (server + client com hot reload):

```bash
npm run dev
```

Produção local:

```bash
npm run build
npm start
```

Ou, no Windows, duplo clique em `iniciar.bat`.

App em `http://localhost:5175`.

## Estrutura do projeto

- `client/` — SPA React (editor de fatos, workspace de geração, galeria de currículos)
- `server/` — API Express (`index.js`) e motor de IA (`claude-engine.js`)
- `scripts/` — renderização de PDF (`build-resume.js`, `render.js`)
- `template/fonts/` — fontes embutidas no PDF
- `data/profiles/<perfil>/` — banco de fatos por perfil (não versionado)
- `output/<perfil>/` — currículos gerados, PDF + JSON (não versionado)
- `.claude/commands/gerar-curriculo.md` — fluxo alternativo via Claude Code (`/gerar-curriculo`)

## Privacidade

`data/` e `output/` não são commitados (ver `.gitignore`).

## Roadmap

Próximos passos em [ROADMAP.md](ROADMAP.md).
