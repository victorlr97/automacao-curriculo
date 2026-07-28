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

## Fase 2 — hospedagem (em andamento)

O app tem duas dependências incomuns pra hospedagem: precisa de um Chrome de verdade rodando (Puppeteer, pra gerar o PDF) e da CLI do Claude Code autenticada com uma assinatura pessoal, não a API paga por token. Isso descarta hospedagens serverless/edge tradicionais (não rodam processo persistente nem spawnam CLI).

Três rotas avaliadas até agora:
- Rodar no próprio PC com um túnel gratuito (Cloudflare Tunnel) — custo zero, sem cadastro novo, mas só fica no ar com o PC ligado.
- Oracle Cloud Free Tier (VPS) — no ar 24/7 independente do PC, recursos "Always Free" que não cobram nunca (cartão exigido só pra verificação de identidade), mas mais trabalho de infra: adaptar de Windows pra Linux, reautenticar ou copiar a sessão da CLI.
- Cloud Run (dentro do ecossistema Firebase) — também 24/7, mas exige colocar o projeto no plano pago Blaze (cartão com risco real de cobrança acima da cota gratuita) e migrar os PDFs pro Storage antes, já que o disco lá é efêmero.

Decisão ainda em aberto no momento desse registro.

## Problemas e soluções (resumo)

| Problema | Solução |
|---|---|
| Gerenciador de pacotes duplicado (pnpm + npm) | Removido o lockfile solto, padronizado em npm |
| Build do client versionado no git, gerando diff de ruído | `public/` desversionado e adicionado ao `.gitignore` |
| `.gitignore` sem cobertura pra segredos | Adicionadas entradas pra `.env` e chaves de service account |
| Sem conta de usuário — dados acessíveis por qualquer um que soubesse o `profileId` | Firebase Auth + Firestore, dono dos dados derivado do token verificado no servidor |
| `firebase-admin` v14 quebrou a API usada nos exemplos comuns (`admin.credential.cert`) | Reescrito pra API modular (`firebase-admin/app`, `/auth`, `/firestore`) |
| Processo Node antigo segurando a porta durante teste | Identificado e encerrado via `Get-NetTCPConnection` |
| Hospedagem precisa de Chrome + CLI autenticada, o que exclui serverless/edge | Em avaliação: self-host com túnel vs. Oracle Free Tier vs. Cloud Run |

## Status atual

Fase 1 concluída e em uso com dados reais. Fase 2 (hospedagem) em decisão.
