# Roadmap

Última atualização: 2026-07-28

## Contexto e restrições

- Projeto de portfólio (product designer), hoje em teste 100% local.
- **Restrição financeira**: a migração para a API paga do Claude só acontece quando o projeto estiver "pra valer" (mais usuários, lançamento real, ou quando a situação financeira permitir). Até lá, o motor de IA continua sendo a CLI do Claude Code (via assinatura pessoal, sem custo por chamada).
- Banco de dados/autenticação: **Firebase** (Auth + Firestore), pelo free tier.
- Consequência prática: enquanto o motor de IA for a CLI local, qualquer deploy online deve ser **fechado/beta** (allowlist de convidados), nunca público — usar a assinatura pessoal pra servir desconhecidos pode estourar limite de uso e não é o uso pretendido da ferramenta.

## Ordem recomendada

1. Firebase (Auth + Firestore) — desbloqueia multiusuário sem custo.
2. Deploy em beta fechado — mantendo o motor atual (CLI), acesso restrito.
3. Fluxo de IA no n8n — prototipado com custo zero, só troca pra chamada paga quando validado.
4. Migração para a API paga do Claude — quando o projeto for lançado de verdade.
5. UX/UI — desacoplado da infra, pode entrar em paralelo com qualquer fase acima.

## Fases

### Fase 1 — Firebase (Auth + Dados) — concluída em 2026-07-28
- [x] Criar projeto Firebase (`automacao-curriculo-app`)
- [x] Configurar Firebase Auth (e-mail/senha)
- [x] Modelar Firestore — ajustado em relação ao plano original: como virou 1 conta = 1 perfil, o documento `users/{uid}` guarda o banco de fatos direto, sem subcoleções `profiles`/`resumes`
- [x] Migrar leitura/escrita do `database.json` local para Firestore
- [x] Migrar armazenamento dos PDFs gerados para Firebase Storage — feito na Fase 2 (ver abaixo), não ficou de fora como o plano original previa
- [x] Middleware de autenticação no Express (verificar token Firebase nas rotas `/api`)
- [x] Atualizar client para fluxo de login/logout

### Fase 2 — Deploy — concluída em 2026-07-28 (com uma pendência)
- [x] Escolher hospedagem — **Render**, não Oracle como cogitado inicialmente (menos trabalho de infra depois que os PDFs migraram pro Firebase Storage, que passou a ser necessário pelo disco efêmero do Render)
- [x] `server/index.js` — porta via `process.env.PORT`, bind em `0.0.0.0`
- [x] `server/index.js` — auto-open do navegador condicionado a `process.platform === 'win32'`
- [x] `scripts/build-resume.js` — Chrome via `@puppeteer/browsers` (`scripts/ensure-chrome.js`), com fallback pros caminhos do Windows em dev local
- [x] Currículos gerados migrados de disco local pra Firestore (`users/{uid}/resumes/{slug}`) + Storage (`resumes/{uid}/{slug}.pdf`, servido via signed URL)
- [x] Variáveis de ambiente e segredos configurados no Render (Secret Files pra chave da Admin SDK e sessão da CLI do Claude)
- [x] Testado ponta a ponta em produção: login, banco de fatos, geração de currículo com IA, PDF — tudo via conta de teste descartável
- [ ] **Restringir acesso (allowlist de e-mail/convite)** — ainda não feito. Hoje `https://automacao-curriculo.onrender.com` tem cadastro aberto pra qualquer e-mail; a razão original de manter isso fechado (a CLI do Claude roda sob a assinatura pessoal, um uso público sem controle pode estourar limite) continua valendo. Fica como próximo passo antes de compartilhar o link amplamente.
- [ ] Acompanhar uso da assinatura Claude Code pra não estourar limite — sem automação, é acompanhar manualmente por enquanto.

Detalhes técnicos e decisões (Blaze, Render, Storage) registrados no [JORNADA.md](JORNADA.md).

### Fase 3 — Fluxo de IA no n8n
- [ ] Desenhar o fluxo (leitura dos fatos → geração dos campos → validação → render do PDF)
- [ ] Prototipar mantendo custo zero
- [ ] Comparar qualidade/acerto do resultado com a abordagem atual

### Fase 4 — Migração para API paga do Claude
- [ ] Trocar `server/claude-engine.js` do spawn de CLI para `@anthropic-ai/sdk`
- [ ] Adicionar controle de custo (limite por usuário, cache de prompt)
- [ ] Conectar o fluxo n8n na API real

### Fase 5 — UX/UI (contínuo, em paralelo)
- [ ] Levantar pontos de fricção atuais no editor de banco de fatos e no workspace de geração
- [ ] Priorizar e aplicar melhorias incrementais

## Status

Fases 1 e 2 concluídas — app em produção em https://automacao-curriculo.onrender.com. Pendência de segurança antes de divulgar o link: restringir o cadastro (hoje está aberto). Próximo passo estrutural é a Fase 3 (fluxo de IA no n8n).
