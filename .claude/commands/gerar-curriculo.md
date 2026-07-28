---
description: Compõe um currículo em PDF novo para uma vaga específica, combinando os fatos do banco de dados local (sem API paga)
argument-hint: <cole aqui a descrição completa da vaga>
---

Você vai COMPOR um currículo NOVO e específico para a vaga abaixo, a partir dos fatos brutos de um perfil em `data/profiles/<perfil>/database.json`. Isso não é escolher entre currículos prontos — é composição livre: leia todos os fatos disponíveis e decida você mesmo quais usar, como combiná-los e como redigir o texto final, de acordo com o que essa vaga específica pede.

**Nunca invente** fatos, tecnologias, empresas ou qualificações que não estejam no banco. Fora isso, você tem total liberdade para escolher, combinar e redigir.

## Vaga colada pelo usuário

$ARGUMENTS

## Como compor o currículo

0. Identifique o perfil: liste as pastas em `data/profiles/`. Se houver só uma, use-a diretamente. Se houver mais de uma, pergunte ao usuário qual perfil usar (mostrando `personal.name` de cada `database.json`) antes de continuar. Todo o resto das instruções abaixo se refere a esse `database.json` do perfil escolhido — chame o nome dessa pessoa de `${name}` (ex: `database.personal.name`).
1. Leia o `database.json` do perfil escolhido por completo.
2. Leia a vaga com atenção: identifique a área principal (design / front-end / full stack / outra, conforme o que o banco desse perfil realmente cobre) e também diferenciais específicos que ela pede. O currículo deve refletir essas nuances, não só a categoria mais óbvia.
3. Identifique o idioma da vaga ("pt" ou "en") — todo o texto final vai nesse idioma, mesmo que os fatos no banco estejam em português.
4. `title`: cargo/título pretendido que reflita o que a vaga pede (pode combinar frentes se a vaga for híbrida).
4.1. `personal.location`: `database.personal.location` traz a cidade exata. Pra vagas nacionais (PT, empresas brasileiras) mantenha como está. Pra vagas internacionais/remotas em inglês, onde a cidade específica não significa nada pro leitor, prefira generalizar pra "Brazil" (ou o país correspondente, se o banco for de outro país) e, se o contexto pedir (menção a fuso americano, "US-based team", horário de trabalho), complementar com uma nota de disponibilidade de fuso (ex: "Brazil — available for US time zone overlap"). Use julgamento — nem toda vaga em inglês é remota/internacional.
5. `objective`: parágrafo NOVO usando os fatos de `background_facts` relevantes pra essa vaga, ecoando 2-3 palavras-chave literais da vaga. Máximo 3-4 frases curtas.
6. `experience`: para cada item de `database.experience`, decida se agrega algo relevante — se não agregar nada, pode omitir a experiência inteira. Para os que ficarem, escreva `description` como 2-3 frases curtas e diretas combinando os `facts` mais relevantes (pode omitir fatos irrelevantes, nunca inventar novos). Use `role` e `period` exatamente como estão no banco.
7. `projects`: escolha os 2-3 projetos de `database.projects` mais relevantes (compare stack + facts com os requisitos da vaga). Para cada um, escreva `role` específico pra essa vaga e `description` de 2-4 frases curtas combinando os facts relevantes — técnicos e/ou visuais, sem se limitar a "só dev" ou "só design" quando ambos importam. `stack` é o subconjunto mais relevante do stack do projeto.
8. Estilo de escrita — tão importante quanto o conteúdo: escreva do jeito direto e factual dos `facts` do banco, não como discurso de marketing pessoal. EVITE clichês de currículo gerado por IA ("proven track record", "passionate about", "leverage cutting-edge", "seamlessly bridge the gap between X and Y", "rigorous visual sensibility", "spearheaded", fórmulas tipo "combines X with Y" repetidas). NÃO termine experiências/projetos diferentes com a mesma frase de fechamento — cada descrição deve variar de estrutura e soar como um relato direto do que foi construído. Frases curtas e concretas, não períodos longos cheios de adjetivos. **Evite travessões (—) pra intercalar frases** — é um tique de texto gerado por IA; no máximo um travessão em todo o currículo. **Escreva sempre na forma impessoal/nominal padrão de currículo** ("Criação de...", "Desenvolvimento de...", "Responsável por...") — NUNCA em primeira pessoa ("eu", "uso", "busco") nem segunda pessoa ("você"), sem recorrer ao nome da pessoa ou a pronomes pessoais como sujeito explícito. Vale em `objective` também (nada de "Busco contribuir..." — reformule pra construção nominal). Vale nos dois idiomas.
9. `skills`: `database.skills` é uma lista única (pode misturar categorias diferentes). Julgue cada habilidade pela relevância real à vaga — não pegue "todas as de uma categoria" automaticamente. Ordene as mais relevantes primeiro, máximo ~12.
10. `education`: `database.education` é uma lista (pode ter mais de uma formação formal — graduação, pós-graduação, mestrado etc). Inclua TODOS os itens, na mesma ordem do banco — formação formal não é filtrada por relevância como experience/projects. Para cada item, adapte `degree` pro idioma certo (institution/period não mudam). `additionalEducation`: se `database.additional_education` existir, decida quais itens agregam pra essa vaga (geralmente vale manter todos — cursos complementares reforçam credibilidade sem ocupar muito espaço; pode omitir os claramente irrelevantes se a lista for longa). `institution` não muda; adapte `description` pro idioma certo. Se o banco não tiver esse campo, retorne lista vazia. `languages`: adapte name/level pro idioma certo.
11. `presentationScript`: muitas vagas internacionais pedem um vídeo curto de apresentação. Escreva um roteiro pra `${name}` gravar, cobrindo quem essa pessoa é, sua trajetória profissional relevante até aqui (ex: uma transição de carreira, só se os fatos do banco indicarem uma — não invente esse arco se não existir), 1-2 projetos/experiências mais relevantes pra ESSA vaga específica, e por que esse perfil se encaixa na vaga. 30s a 2min falado (~90-260 palavras). O risco aqui é escrever uma versão em primeira pessoa do currículo — isso soa robótico. Frases curtas (5-12 palavras), contrações naturais ("I'm", "I've"), NUNCA listar 3+ itens em fileira com vírgulas, zero jargão corporativo ("remote-ready", "async collaboration", "feedback cycles", "production-ready"), ZERO travessões (regra absoluta, revise o texto antes de responder e reescreva qualquer frase com "—" ou lista de 3+ itens). NÃO cite o nome literal de empresas onde `${name}` trabalhou — quem assiste não vai conhecer; generalize o contexto (ex: "at a design agency") ou omita e vá direto pro que foi feito. Essa regra é só pro presentationScript — o PDF continua com os nomes reais. NÃO espelhe a linguagem da vaga colada — ela serve só pra decidir o que enfatizar entre os fatos reais do banco, nunca como fonte de frases pra parafrasear (se a vaga pede algo que não é um fato explícito no banco, não vire uma frase sobre a pessoa). Cuidado especial no parágrafo final ("por que eu me encaixo") — é onde mais se cai na tentação de listar de volta os requisitos da vaga; feche conectando 1-2 fatos concretos do banco ao interesse na vaga, sem tentar marcar cada item da lista de requisitos. Pense em como `${name}` explicaria isso de improviso numa chamada, não como leria um currículo em voz alta. Primeira pessoa, mesmo idioma do resto.
12. `coverLetter`: carta de apresentação curta pra mandar junto com o currículo (email ou formulário de candidatura). Estrutura de carta de verdade: saudação breve (ex: "Prezados," ou personalizada com o nome da empresa, se a vaga citar) → 1-2 parágrafos curtos de corpo → despedida breve + nome (ex: "Atenciosamente,\n${name}"). LIMITE de 500 caracteres NO TOTAL (saudação + corpo + despedida + nome, espaços e pontuação inclusos) — mantenha saudação/despedida curtas pra sobrar espaço pro corpo. O corpo PRECISA citar pelo menos 1 fato concreto e nomeado do banco (um projeto real, uma tecnologia real, uma experiência real) conectado ao que a vaga pede — proibido preencher com autoelogio vazio tipo "possuo o perfil necessário", "tenho grande interesse na vaga", "fico à inteira disposição", "venho candidatar-me à vaga"; quem lê já sabe que é uma candidatura, não gaste espaço dizendo o óbvio. Não é um resumo do `objective` nem uma versão condensada do currículo. Mesmas regras de estilo do item 8 (sem clichês de IA, no máximo um travessão, nunca inventar fatos). Mesmo idioma do resto do currículo.
13. Copie `personal` e `portfolio` de `database.json` sem alterar.

## Formato de saída

Monte o objeto final neste formato exato e salve em `output/<perfil>/<slug-da-empresa-ou-vaga>.json` (usando o mesmo identificador de pasta do perfil escolhido no passo 0):

```json
{
  "personal": { "name": "...", "age": 28, "location": "...", "phone": "...", "email": "...", "github": "...", "linkedin": "..." },
  "language": "pt",
  "title": "...",
  "objective": "...",
  "experience": [{ "company": "...", "location": "...", "role": "...", "period": "...", "description": "..." }],
  "projects": [{ "name": "...", "role": "...", "stack": ["..."], "description": "..." }],
  "education": [{ "institution": "...", "degree": "...", "period": "..." }],
  "additionalEducation": [{ "institution": "...", "description": "..." }],
  "skills": ["..."],
  "languages": [{ "name": "...", "level": "..." }],
  "presentationScript": "...",
  "coverLetter": "...",
  "portfolio": { "github": "...", "behance": "..." }
}
```

Depois:
1. Rode no terminal: `node scripts/build-resume.js output/<perfil>/<slug>.json output/<perfil>/<slug>.pdf`
2. Reporte ao usuário, de forma breve: qual perfil foi usado, o perfil/combinação identificada pra vaga (em texto livre, ex: "Full Stack com diferencial em Design Gráfico"), quais projetos foram escolhidos e por quê, e o caminho do PDF gerado.
