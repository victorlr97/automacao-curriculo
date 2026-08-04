# Gerador de Currículo

Gerador de currículos em PDF, adaptados por vaga, usando IA.

## Como funciona

Cada conta tem um banco de fatos (experiências, projetos, skills, formação etc). Você cola a descrição de uma vaga e a IA monta um currículo novo a partir desses fatos, escolhendo o que é relevante pra aquela vaga.

O motor de IA é a CLI do Claude Code (`claude -p ...`), não a API paga por token.

## Funcionalidades

- Login por e-mail/senha, uma conta por pessoa
- Editor do banco de fatos, com importação a partir de um PDF de currículo existente
- Geração de currículo em PDF a partir da descrição da vaga (detecta pt/en)
- Preview e edição do currículo gerado, com re-renderização do PDF
- Tradução pt ↔ en
- Roteiro de vídeo de apresentação
- Carta de apresentação
- Galeria dos currículos já gerados

## Stack

- Backend: Node.js + Express, `puppeteer-core` (renderização do PDF), motor de IA via CLI do Claude Code
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- Dados: Firebase Auth (login), Firestore (banco de fatos e metadados dos currículos), Firebase Storage (PDFs gerados)
- Deploy: Render (`render.yaml`)

## Pré-requisitos

- Node.js 22+
- Claude Code instalado e autenticado (`claude` no PATH)
- Google Chrome ou Microsoft Edge instalado (em produção o Chrome é baixado automaticamente, ver `scripts/ensure-chrome.js`)
- Um projeto Firebase com Auth (e-mail/senha), Firestore e Storage habilitados

## Como rodar

```bash
npm install
cd client && npm install && cd ..
```

Configurar o Firebase:
- `client/.env` com as chaves `VITE_FIREBASE_*` do seu projeto (ver `client/src/lib/firebase.ts`) e `VITE_OWNER_EMAIL` (seu e-mail, só pra mostrar o item "Admin" no menu — o bloqueio real é no servidor)
- `server/firebase-service-account.json` — chave da Admin SDK, baixada do console do Firebase

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
- `server/` — API Express (`index.js`), motor de IA (`claude-engine.js`), integração com Firebase (`firebase-admin.js`)
- `scripts/` — renderização de PDF (`build-resume.js`, `render.js`) e scripts de migração de dados
- `template/fonts/` — fontes embutidas no PDF
- `firestore.rules`, `storage.rules` — regras de segurança do Firebase
- `render.yaml` — configuração de deploy no Render
- `.claude/commands/gerar-curriculo.md` — fluxo alternativo via Claude Code (`/gerar-curriculo`)

## Dados

Banco de fatos, currículos gerados e PDFs ficam no Firebase (Firestore + Storage), isolados por conta. Nada fica em disco além de arquivos temporários durante a geração de um PDF.

## Roadmap

Próximos passos em [ROADMAP.md](ROADMAP.md). Processo de desenvolvimento e decisões em [JORNADA.md](JORNADA.md).
