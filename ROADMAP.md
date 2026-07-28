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
- [ ] Migrar armazenamento dos PDFs gerados para Firebase Storage — adiado de propósito pra Fase 2; por enquanto PDFs continuam em `output/<uid>/` local, isolados por conta via o middleware de autenticação
- [x] Middleware de autenticação no Express (verificar token Firebase nas rotas `/api`)
- [x] Atualizar client para fluxo de login/logout

### Fase 2 — Deploy (beta fechado)
- [ ] Escolher hospedagem (precisa suportar Puppeteer + spawn de processo CLI)
- [ ] `server/index.js` — bindar em `0.0.0.0` em vez de `127.0.0.1` (linha ~468)
- [ ] `server/index.js` — ler porta de `process.env.PORT` em vez de fixa em 5175 (linha ~15)
- [ ] `server/index.js` — condicionar o auto-open do navegador (`exec('start ...')`, linha ~471) a ambiente local, hoje é comando Windows-only
- [ ] `scripts/build-resume.js` — `CHROME_CANDIDATES` só tem caminhos Windows; adaptar pro Chromium do ambiente de produção (Linux) ou path via variável de ambiente
- [ ] Configurar variáveis de ambiente/segredos
- [ ] Restringir acesso (allowlist de e-mail/convite, não link público)
- [ ] Acompanhar uso da assinatura Claude Code pra não estourar limite

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

Fase 1 concluída (login por e-mail/senha + Firestore em produção no Firebase). Próximo passo é a Fase 2 (deploy em beta fechado).
