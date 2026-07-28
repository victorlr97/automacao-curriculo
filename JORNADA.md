# Jornada do projeto

Registro do processo de desenvolvimento do Gerador de Currículo, pra uso como case no portfólio. Atualizado conforme o projeto avança.

## Ponto de partida

O app já existia antes desse registro começar: front-end em React + TypeScript + Tailwind, back-end em Express, motor de IA via CLI do Claude Code (sem custo de API paga), renderização de PDF via Puppeteer. Rodava só local, uma pessoa só usando, sem conceito de conta — "perfil" era uma pasta em disco que qualquer um que soubesse o nome conseguia acessar.

## Organizando o roadmap

Quatro frentes estavam em mente sem ordem definida: deploy em produção, login multiusuário, um fluxo de IA no n8n, e migração pra API paga do Claude. A restrição que decidiu a ordem: sem pagar a API antes do projeto valer a pena de verdade — o motor de IA continua na CLI até lá. Ordem definida: Firebase (auth + dados) → deploy em beta fechado → n8n → API paga → UX/UI em paralelo com qualquer fase. Registrado em `ROADMAP.md`.

## Higiene do repositório

Três problemas apareceram numa auditoria rápida antes de mexer em qualquer coisa nova:

- Um `pnpm-lock.yaml` solto ao lado do `package-lock.json` — sobra de um `pnpm install` rodado por engano num projeto que é npm de ponta a ponta.
- A pasta `public/` (build gerado pelo Vite) estava versionada no git, causando diff de ruído a cada build.
- `.gitignore` incompleto pra segredos — sem entradas pra `.env` ou chaves de service account, que o Firebase ia exigir.

Solução: lockfile duplicado removido, `public/` desversionado e ignorado, `.gitignore` completado.

## README

O projeto não tinha documentação própria, só o boilerplate padrão do Vite. Criado um `README.md` explicando o que o app faz, como funciona e como rodar.

## Fase 1 — Login e banco multiusuário (Firebase)

Decisões tomadas antes de implementar:
- Firebase Auth (e-mail/senha) + Firestore, no plano gratuito Spark.
- Um modelo simplificado: 1 conta = 1 perfil, eliminando o seletor de múltiplos perfis que existia antes.
- PDFs continuam em disco local por enquanto — a migração pro Firebase Storage foi adiada de propósito pra Fase 2, quando disco local deixaria de fazer sentido de qualquer jeito.

Implementação: projeto Firebase criado, Firestore provisionado, regras de segurança publicadas, Admin SDK no servidor, middleware de autenticação em todas as rotas — o identificador do dono dos dados deixou de vir de um parâmetro na URL (`profileId`, que qualquer um podia adivinhar) e passou a vir do `uid` de um token assinado pelo Firebase, verificado no servidor a cada chamada.

Problemas encontrados:
- O `firebase-admin` instalado (versão 14) mudou a API — `admin.credential.cert()` não existe mais no import padrão; a lib virou modular (`firebase-admin/app`, `/auth`, `/firestore`). Corrigido trocando pros imports modulares.
- Durante o primeiro teste, um processo Node de uma tentativa anterior ainda segurava a porta 5175. Identificado via `Get-NetTCPConnection` e encerrado antes de subir a versão corrigida.

Validação: o fluxo completo foi testado via API REST do Firebase Auth (criação de conta de teste, banco de dados autocriado em branco no primeiro acesso, salvo, lido de volta, token inválido rejeitado com 401) sem precisar abrir navegador — a conta de teste foi removida depois de confirmar tudo.

Migração dos dados reais: escrito um script de uso único (`scripts/migrate-profile-to-firestore.js`) que lê o `database.json` antigo de um perfil e grava no Firestore sob o `uid` da conta nova, além de renomear a pasta de currículos gerados de `output/<profileId>/` pra `output/<uid>/`. Rodado com a conta real, dados confirmados no app.

## Fase 2 — hospedagem

O app tem duas dependências incomuns pra hospedagem: precisa de um Chrome de verdade rodando (Puppeteer, pra gerar o PDF) e da CLI do Claude Code autenticada com uma assinatura pessoal, não a API paga por token. Isso descarta hospedagens serverless/edge tradicionais (não rodam processo persistente nem spawnam CLI).

Rotas avaliadas, nessa ordem, cada uma descartada por um motivo diferente:
- Rodar no próprio PC com um túnel gratuito (Cloudflare Tunnel) — custo zero, mas só fica no ar com o PC ligado. Descartada porque o objetivo virou "sempre online".
- Oracle Cloud Free Tier (VPS) — no ar 24/7, recursos "Always Free" que não cobram nunca. Descartada por exigir mais trabalho de infra (Linux, firewall, HTTPS manual) que a alternativa abaixo, pra um objetivo que é principalmente demonstrativo.
- Render — ficou inviável enquanto os PDFs dependiam de disco local (o disco do Render não sobrevive a um redeploy). Isso só deixou de ser um problema depois de decidir mover os currículos gerados pro Firebase (Firestore + Storage) — o que também tornou o Render viável de vez, sem precisar resolver os problemas de infra da Oracle.

Correção no meio do caminho: a informação inicial de que o Firebase Storage seria gratuito no plano Spark estava desatualizada — desde 3/fev/2026 o Storage exige o plano pago Blaze pra qualquer bucket, mesmo dentro da cota gratuita do Google Cloud Storage. Verificado por busca antes de seguir, e corrigido explicitamente com o usuário antes de continuar. Decisão: aceitar cadastrar cartão, com uso real esperado em $0 e um alerta de orçamento como rede de segurança.

Implementação:
- Currículos gerados (antes `output/<uid>/*.json` e `.pdf` em disco) migraram pra `users/{uid}/resumes/{slug}` no Firestore (metadados) + `resumes/{uid}/{slug}.pdf` no Storage (binário). O PDF é renderizado num diretório temporário só durante a geração e descartado depois de subir pro Storage.
- PDFs voltam pro client como signed URL do Storage (expira em 1h), não mais como caminho estático do servidor — isso também evitou o problema de um link `<a href>` não conseguir mandar o header de autenticação.
- Ajustes de ambiente pra sair do Windows: porta via `process.env.PORT`, bind em `0.0.0.0`, abertura automática do navegador condicionada a `process.platform === 'win32'`, Chrome do Puppeteer buscado via `@puppeteer/browsers` (baixa um binário compatível na primeira execução) em vez dos caminhos fixos do Windows.
- CLI do Claude Code instalada no build do Render (`npm install -g @anthropic-ai/claude-code`) e autenticada copiando a sessão local (`~/.claude/.credentials.json`) como Secret File do Render pro lugar esperado, em vez de um login interativo (que não existe num ambiente headless).

Validação: gerado um currículo real (Chrome + CLI do Claude + upload pro Storage) contra a URL pública do Render usando uma conta de teste descartável, confirmando o PDF acessível pela signed URL — conta e dados removidos depois.

Resultado: o primeiro deploy subiu sem erros — os pontos mais arriscados (caminho de montagem dos Secret Files, download do Chrome, PORT dinâmica) funcionaram de primeira.

Pendência conhecida, não resolvida ainda: o cadastro na URL pública está aberto pra qualquer e-mail. A intenção original de manter isso fechado (a CLI roda sob a assinatura pessoal, uso público descontrolado pode estourar limite) continua de pé — falta implementar a restrição antes de divulgar o link amplamente.

## Problemas e soluções (resumo)

| Problema | Solução |
|---|---|
| Gerenciador de pacotes duplicado (pnpm + npm) | Removido o lockfile solto, padronizado em npm |
| Build do client versionado no git, gerando diff de ruído | `public/` desversionado e adicionado ao `.gitignore` |
| `.gitignore` sem cobertura pra segredos | Adicionadas entradas pra `.env` e chaves de service account |
| Sem conta de usuário — dados acessíveis por qualquer um que soubesse o `profileId` | Firebase Auth + Firestore, dono dos dados derivado do token verificado no servidor |
| `firebase-admin` v14 quebrou a API usada nos exemplos comuns (`admin.credential.cert`) | Reescrito pra API modular (`firebase-admin/app`, `/auth`, `/firestore`) |
| Processo Node antigo segurando a porta durante teste | Identificado e encerrado via `Get-NetTCPConnection` |
| Hospedagem precisa de Chrome + CLI autenticada, o que exclui serverless/edge | Render, com Chrome baixado via `@puppeteer/browsers` e sessão da CLI injetada por Secret File |
| Disco do Render não sobrevive a redeploy — quebra a galeria de currículos | Currículos gerados migrados pra Firestore (metadados) + Storage (PDF) |
| Informação errada sobre o Storage ser gratuito no Spark | Verificado por busca, corrigido com o usuário, upgrade consciente pro Blaze |
| Link `<a href>` de PDF não manda header de autenticação | PDF servido via signed URL do Storage, não mais rota autenticada própria |

## Status atual

Fases 1 e 2 concluídas — app em produção em https://automacao-curriculo.onrender.com, testado ponta a ponta. Pendência: restringir o cadastro antes de divulgar o link.
