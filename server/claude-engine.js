const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');

const PROJECT_ROOT = path.join(__dirname, '..');
// Compor um currículo (ler o banco inteiro, escolher fatos, escrever tudo do
// zero) pode levar bem mais que os 60-90s de uma chamada simples — em testes
// reais já passou de 2 minutos. Timeout generoso pra não derrubar gerações
// válidas que só estão demorando.
const CLAUDE_TIMEOUT_MS = 240000;

// "education" passou de objeto único pra lista (pra suportar graduação +
// pós-graduação, mestrado etc). Isso normaliza dados salvos antes dessa
// mudança (ainda no formato antigo) pro formato novo, sem exigir migração.
function toEducationArray(education) {
  if (Array.isArray(education)) return education;
  if (education && (education.institution || education.degree || education.period)) return [education];
  return [];
}

const RESUME_SCHEMA = {
  type: 'object',
  properties: {
    language: { type: 'string', enum: ['pt', 'en'] },
    title: { type: 'string' },
    contactLocation: { type: 'string' },
    objective: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          location: { type: 'string' },
          role: { type: 'string' },
          period: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['company', 'role', 'period', 'description']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          stack: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' }
        },
        required: ['name', 'role', 'stack', 'description']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          period: { type: 'string' }
        },
        required: ['institution', 'degree', 'period']
      }
    },
    additionalEducation: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['institution', 'description']
      }
    },
    skills: { type: 'array', items: { type: 'string' } },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'string' }
        },
        required: ['name', 'level']
      }
    },
    presentationScript: { type: 'string' },
    meta: {
      type: 'object',
      properties: {
        profile: { type: 'string' },
        slugHint: { type: 'string' },
        resumo: { type: 'string' }
      },
      required: ['profile', 'slugHint', 'resumo']
    }
  },
  required: ['language', 'title', 'contactLocation', 'objective', 'experience', 'projects', 'education', 'additionalEducation', 'skills', 'languages', 'presentationScript', 'meta']
};

const RESUME_IMPORT_SCHEMA = {
  type: 'object',
  properties: {
    personal: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        location: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        github: { type: 'string' },
        linkedin: { type: 'string' },
        behance: { type: 'string' }
      },
      required: ['name']
    },
    language: { type: 'string', enum: ['pt', 'en'] },
    title: { type: 'string' },
    objective: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          location: { type: 'string' },
          role: { type: 'string' },
          period: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['company']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          stack: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' }
        },
        required: ['name']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          period: { type: 'string' }
        },
        required: ['institution']
      }
    },
    additionalEducation: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['institution']
      }
    },
    skills: { type: 'array', items: { type: 'string' } },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'string' }
        }
      }
    },
    portfolio: {
      type: 'object',
      properties: {
        github: { type: 'string' },
        behance: { type: 'string' }
      }
    },
    meta: {
      type: 'object',
      properties: { slugHint: { type: 'string' } },
      required: ['slugHint']
    }
  },
  required: ['personal', 'language', 'title', 'objective', 'experience', 'projects', 'education', 'skills', 'languages', 'meta']
};

const DATABASE_IMPORT_SCHEMA = {
  type: 'object',
  properties: {
    personal: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        location: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        github: { type: 'string' },
        linkedin: { type: 'string' },
        behance: { type: 'string' }
      },
      required: ['name']
    },
    background_facts: { type: 'array', items: { type: 'string' } },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          location: { type: 'string' },
          role: { type: 'string' },
          period: { type: 'string' },
          facts: { type: 'array', items: { type: 'string' } }
        },
        required: ['company', 'role', 'period', 'facts']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          stack: { type: 'array', items: { type: 'string' } },
          facts: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'name', 'stack', 'facts']
      }
    },
    skills: { type: 'array', items: { type: 'string' } },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          period: { type: 'string' }
        },
        required: ['institution']
      }
    },
    additional_education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['institution']
      }
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'string' }
        }
      }
    },
    portfolio: {
      type: 'object',
      properties: {
        github: { type: 'string' },
        behance: { type: 'string' },
        behance_note: { type: 'string' }
      }
    }
  },
  required: ['personal', 'background_facts', 'experience', 'projects', 'skills', 'education', 'languages']
};

const TRANSLATE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    objective: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: { role: { type: 'string' }, description: { type: 'string' } },
        required: ['role', 'description']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: { role: { type: 'string' }, description: { type: 'string' } },
        required: ['role', 'description']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: { degree: { type: 'string' } },
        required: ['degree']
      }
    },
    additionalEducation: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' } },
        required: ['description']
      }
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, level: { type: 'string' } },
        required: ['name', 'level']
      }
    },
    presentationScript: { type: 'string' }
  },
  required: ['title', 'objective', 'experience', 'projects', 'education', 'additionalEducation', 'languages', 'presentationScript']
};

function buildImportPrompt(rawText) {
  return `Você vai ESTRUTURAR o texto abaixo (extraído de um PDF de currículo já existente) no formato JSON especificado pelo schema. NÃO reescreva, NÃO invente, NÃO melhore o conteúdo — apenas organize o texto já existente nos campos certos, corrigindo apenas artefatos óbvios de extração de PDF (quebras de linha no meio de uma frase, hifenização quebrada, espaços faltando entre palavras coladas).

## Texto extraído do PDF

${rawText}

## Instruções

1. Identifique o idioma predominante do texto ("pt" ou "en").
2. Extraia os dados pessoais (nome, idade se mencionada, localização, telefone, email, links de GitHub/LinkedIn/Behance) exatamente como aparecem. Campos que não aparecerem no texto, deixe como string vazia. ATENÇÃO: texto extraído de PDF só traz o texto visível dos links, não a URL de destino — se no texto aparecer só a palavra "GitHub" ou "LinkedIn" (sem um endereço tipo "github.com/..." ou "linkedin.com/..." junto), deixe o campo vazio em vez de usar essa palavra como se fosse a URL.
3. Extraia "title" (o cargo/subtítulo do currículo) e "objective" (o parágrafo de objetivo/resumo profissional) literalmente do texto, sem reescrever.
4. Extraia cada experiência profissional (empresa, local, cargo, período, descrição) na ordem em que aparecem.
5. Extraia cada projeto (nome, cargo/função no projeto, stack de tecnologias, descrição) na ordem em que aparecem.
6. "education": extraia CADA formação formal (graduação, pós-graduação, mestrado, doutorado — uma entrada por diploma/título) como { institution, degree, period }, na ordem em que aparecem. Se o currículo listar mais de uma, inclua todas, não só a primeira. Extraia também habilidades (lista) e idiomas (nome + nível) literalmente.
7. "additionalEducation": se o currículo tiver uma seção separada de cursos complementares, certificações ou formação continuada (distinta da formação formal do item 6 — ex: "Formação Complementar", "Cursos", "Certifications"), extraia cada item como { institution, description } literalmente. Se não existir essa seção, retorne lista vazia.
8. Extraia links de portfólio (GitHub, Behance) se mencionados, além dos já capturados em "personal" — mesma regra: só preencha se houver um endereço real no texto, não a palavra do link sozinha.
9. meta.slugHint: identificador curto pra nome de arquivo baseado no nome da pessoa ou título do currículo (só letras minúsculas, números e hífen, sem espaços/acentos).

Retorne o objeto preenchendo exatamente o schema fornecido. Se alguma seção não existir no texto original, retorne lista vazia ou campo vazio — nunca invente conteúdo que não está lá.`;
}

function buildDatabaseImportPrompt(rawText) {
  return `Você vai EXTRAIR fatos brutos e reutilizáveis do texto abaixo (extraído de um PDF de currículo já pronto) pra popular um banco de dados de fatos — não um currículo final. A diferença importa: um currículo final tem parágrafos já compostos pra uma vaga específica; o banco de dados guarda os fatos separados em itens atômicos, que depois são recombinados e reescritos sob medida pra cada vaga nova. Por isso, ao contrário de simplesmente copiar o texto, aqui você precisa QUEBRAR parágrafos de descrição em fatos individuais (um por linha/item), preservando o conteúdo original — sem reescrever o estilo, sem inventar, sem melhorar, só reorganizando e separando.

## Texto extraído do PDF

${rawText}

## Instruções

1. Extraia os dados pessoais (nome, idade se mencionada, localização, telefone, email, links de GitHub/LinkedIn/Behance) exatamente como aparecem. Campos que não aparecerem no texto, deixe como string vazia. ATENÇÃO: texto extraído de PDF só traz o texto visível dos links, não a URL de destino — se aparecer só a palavra "GitHub" ou "LinkedIn" (sem um endereço tipo "github.com/..." junto), deixe o campo vazio em vez de usar a palavra como se fosse a URL.
2. "background_facts": 3-6 fatos gerais sobre a trajetória da pessoa como um todo (background, transição de carreira, anos de experiência, formação aplicada ao trabalho) — o tipo de fato que não pertence a uma experiência ou projeto específico, geralmente vindo do parágrafo de objetivo/resumo do currículo original, se houver. Nunca invente uma trajetória que o texto não sustente; se o currículo não tiver esse tipo de informação, retorne uma lista menor ou vazia.
3. "experience": para cada experiência profissional, extraia empresa, local, cargo e período literalmente. Para "facts", quebre a descrição em itens curtos e atômicos (uma responsabilidade ou entrega por item) — se a descrição original já é uma lista de bullets, é só transcrever cada bullet como um item; se é um parágrafo corrido, quebre em frases/fatos separados sem adicionar informação nova.
4. "projects": para cada projeto, extraia nome e stack de tecnologias literalmente. "id": um identificador curto em kebab-case baseado no nome do projeto (só letras minúsculas, números e hífen). Para "facts", mesma lógica da experiência: quebre a descrição em itens atômicos.
5. Extraia habilidades (lista simples, sem duplicar o que já apareceu como stack de projeto se fizer sentido consolidar) e idiomas (nome + nível) literalmente. "education": extraia CADA formação formal (graduação, pós-graduação, mestrado, doutorado — uma entrada por diploma/título) como { institution, degree, period }, na ordem em que aparecem. Se o currículo listar mais de uma, inclua todas, não só a primeira.
6. "additional_education": se o currículo tiver uma seção separada de cursos complementares, certificações ou formação continuada (distinta da formação formal do item 5 — ex: "Formação Complementar", "Cursos", "Certifications"), extraia cada item como { institution, description } literalmente. Se não existir essa seção, retorne lista vazia.
7. Extraia links de portfólio (GitHub, Behance, e uma nota sobre o que está publicado lá, se houver) além dos já capturados em "personal" — mesma regra: só preencha se houver um endereço real no texto.
8. Não traduza nada — mantenha o idioma original do texto extraído. A tradução acontece depois, na hora de gerar um currículo pra uma vaga específica.

Retorne o objeto preenchendo exatamente o schema fornecido. Se alguma seção não existir no texto original, retorne lista vazia ou campo vazio — nunca invente conteúdo que não está lá.`;
}

function buildTranslatePrompt(resolvedData, targetLanguage) {
  const targetLabel = targetLanguage === 'en' ? 'inglês' : 'português';
  const forTranslation = {
    title: resolvedData.title,
    objective: resolvedData.objective,
    experience: resolvedData.experience.map(e => ({ role: e.role, description: e.description })),
    projects: resolvedData.projects.map(p => ({ role: p.role, description: p.description })),
    education: resolvedData.education.map(edu => ({ degree: edu.degree })),
    additionalEducation: (resolvedData.additionalEducation || []).map(ed => ({ description: ed.description })),
    languages: resolvedData.languages,
    presentationScript: resolvedData.presentationScript || ''
  };

  return `Traduza o currículo abaixo para ${targetLabel}. Isso é uma TRADUÇÃO, não uma recomposição — preserve o sentido, os fatos e a estrutura de cada frase o máximo possível, adaptando pro idioma alvo de forma natural (não literal palavra-por-palavra, mas fiel ao conteúdo original).

## Currículo atual (idioma: ${resolvedData.language})

${JSON.stringify(forTranslation, null, 2)}

## Instruções

1. Traduza "title" e "objective".
2. Traduza TODAS as ${resolvedData.experience.length} experiências e ${resolvedData.projects.length} projetos, na mesma ordem e quantidade — não adicione, remova ou reordene itens — cada um com "role" e "description" traduzidos.
3. Traduza "degree" de TODOS os ${resolvedData.education.length} itens de "education", na mesma ordem e quantidade (institution e period não mudam, nem entram nesse payload).
4. Traduza "description" de TODOS os ${(resolvedData.additionalEducation || []).length} itens de "additionalEducation", na mesma ordem e quantidade (institution não muda, nem entra nesse payload).
5. Traduza cada item de "languages" (nome do idioma e nível, ex: "Português"/"Nativo" -> "Portuguese"/"Native", ou o inverso).
6. Mantenha o mesmo estilo direto e impessoal do texto original: sem "eu"/"I" ou "você"/"you", sem clichês de currículo gerado por IA, sem travessões em excesso.
7. Traduza "presentationScript" também, se não estiver vazio — essa parte É pra ser falada em primeira pessoa ("Meu nome é..."/"My name is..."). Não traduza palavra por palavra de um jeito que fique formal: mantenha frases curtas, contrações naturais do idioma alvo, sem listar 3+ itens em fileira, sem travessão, sem jargão corporativo. Se o texto original já tem alguma frase mais "escrita" demais, aproveite a tradução pra deixá-la mais natural de se falar. Se o texto original citar o nome de alguma empresa (ex: "Non Stop", "ISE"), remova na tradução e generalize (ex: "at a design agency") — esse campo nunca deve citar nomes literais de empresas. Se vier vazio, devolva vazio.

Retorne o objeto preenchendo exatamente o schema fornecido.`;
}

function presentationScriptStyleRules(name) {
  return `O MAIOR RISCO aqui é escrever uma versão em primeira pessoa do currículo escrito — isso soa robótico e ensaiado, e é exatamente o que você NÃO deve fazer. A diferença entre texto escrito e fala real é estrutural, não só de pronome:
- Frases CURTAS. A maioria das frases faladas tem 5-12 palavras. Se uma frase tem mais de duas vírgulas ou uma oração subordinada complexa, quebre em 2-3 frases menores.
- Contrações sempre que fizer sentido no idioma (em inglês: "I'm", "I've", "that's", "it's", não "I am", "I have"). Em português, use contrações naturais de fala ("pra" em vez de "para" ocasionalmente, mas frases curtas e diretas do jeito que alguém falaria numa entrevista).
- NUNCA liste 3+ itens numa fileira com vírgulas (tipo "X, Y, and Z" ou "focused on A, B, and C") — isso é como currículo escreve, não como boca fala. Se precisar mencionar várias coisas, quebre em frases separadas ou mencione só as 1-2 mais importantes.
- ZERO jargão corporativo/RH, mesmo o que soa neutro por escrito: nada de "remote-ready", "async collaboration", "feedback cycles", "production-ready", "brand direction", "reliable setup", "solid understanding of", "comfortable with/taking" repetido como muleta. Se a frase poderia aparecer literalmente num currículo por escrito, reescreva.
- Pense em como ${name} EXPLICARIA isso de improviso pra um recrutador numa chamada de vídeo, não em como faria a leitura de um currículo em voz alta. Tom de conversa real, não discurso decorado.
- Nada de travessão (—) pra intercalar oração — em fala isso quase nunca acontece; use ponto final e comece outra frase.
- Primeira pessoa ("Meu nome é ${name}..." / "My name is ${name}..."), mesmo idioma do resto do currículo, sem os clichês de IA já proibidos no resto do currículo (nada de "proven track record", "passionate about", etc.).
- NÃO cite o nome literal de empresas onde ${name} trabalhou — quem está assistindo o vídeo provavelmente nunca ouviu falar delas, então o nome próprio não ajuda em nada. Em vez disso, descreva o tipo/contexto de forma genérica (ex: "at a design agency in São Paulo", "for a small design studio", "numa agência de design em São Paulo") ou simplesmente omita o local de trabalho e vá direto pro que foi feito. O foco é sempre no que ${name} construiu/fez, não em onde. Essa regra vale só pro presentationScript — o currículo em PDF continua citando o nome real da empresa normalmente.
- Regra de travessão e listas é ABSOLUTA, não uma preferência: ZERO travessões e ZERO listas de 3+ itens separados por vírgula em todo o presentationScript, sem exceção. Se ao revisar o texto que você mesmo escreveu aparecer um "—" ou uma sequência tipo "X, Y, Z e W", reescreva aquela frase antes de responder.
- NÃO espelhe a linguagem da vaga colada pelo usuário. A vaga (ou as instruções de vídeo) servem só pra decidir O QUE enfatizar entre os fatos reais de ${name} — nunca como fonte de frases pra parafrasear como se fossem a experiência dessa pessoa. Se a vaga lista responsabilidades tipo "collaborate with marketing and content teams" ou "manage revisions and deadlines", NÃO transforme isso em frases sobre ${name} a menos que exista um fato correspondente no banco — caso contrário fica óbvio que é só uma reformulação do anúncio de vaga pra parecer compatível, o que soa falso. Fale só do que está de fato no banco de dados.
- CUIDADO ESPECIAL no parágrafo final (a parte de "por que eu me encaixo"): esse é o ponto onde mais se cai na tentação de listar de volta os requisitos da vaga um por um (ex: "I bring experience with brand guidelines, file preparation, and meeting deadlines" — isso é só reciclar a lista "Responsibilities/Qualifications" da vaga com outras palavras). Em vez disso, feche conectando 1-2 fatos CONCRETOS do banco (um projeto específico, uma habilidade real) ao motivo de ter interesse na vaga — não tente marcar todos os itens da lista de requisitos. É normal e esperado deixar vários requisitos da vaga sem resposta explícita nesse texto.`;
}

function buildPrompt(database, jobDescription, videoInstructions) {
  const name = (database.personal && database.personal.name) || 'a pessoa candidata';
  return `Você vai COMPOR um currículo NOVO e específico para a vaga abaixo, a partir de fatos brutos sobre a carreira de ${name}. Isso não é uma escolha entre currículos prontos — é uma composição livre: leia todos os fatos disponíveis e decida você mesmo quais usar, como combiná-los e como redigir o texto final, de acordo com o que essa vaga específica pede.

Um exemplo pra deixar claro o tipo de liberdade que você tem: se a vaga for "Desenvolvedor Full Stack Pleno, diferencial: noção de design gráfico" e o banco trouxer experiência tanto técnica quanto visual, o currículo ideal NÃO é o texto genérico de full stack nem o texto genérico de design — é um texto novo que menciona a arquitetura técnica dos projetos E explicitamente a contribuição visual/design nesses mesmos projetos, no mesmo parágrafo. Você deve ser capaz de montar esse tipo de combinação (e qualquer outra que os fatos do banco permitam) sempre que a vaga pedir.

Regra inegociável: nunca invente fatos, tecnologias, empresas ou qualificações que não estejam no banco abaixo. Fora isso, você tem total liberdade para escolher, combinar e redigir.

## Banco de dados (fatos brutos — fonte única de verdade)

${JSON.stringify(database, null, 2)}

## Vaga colada pelo usuário

${jobDescription}

## Instruções específicas pro vídeo (fornecidas pelo usuário, separadas da vaga)

${videoInstructions && videoInstructions.trim() ? videoInstructions : '(nenhuma — use a estrutura padrão descrita no item sobre presentationScript)'}

## Como compor o currículo

1. Leia a vaga com atenção: identifique não só a área principal (design / front-end / full stack / outra) mas também diferenciais específicos que ela pede (ex: "full stack com noção de design", "front-end com forte senso visual", "designer com noções de código"). O currículo final deve refletir essas nuances específicas, não só a categoria mais óbvia.
2. Identifique o idioma da vaga ("pt" ou "en") — todo o texto final deve ser escrito nesse idioma, mesmo que os fatos no banco estejam em português.
3. "title": escreva o cargo/título pretendido que reflita o que a vaga pede (pode citar múltiplas frentes se a vaga for híbrida, ex: "Desenvolvedor Full Stack com Background em Design").
4. "contactLocation": decida como apresentar a localização no bloco de contato, com base no contexto da vaga. database.personal.location traz a cidade exata ("Juiz de Fora - MG"). Para vagas nacionais (em português, empresas brasileiras) mantenha a cidade exata como está. Para vagas internacionais/remotas em inglês, onde a cidade específica no Brasil não significa nada pro leitor, prefira generalizar pra algo como "Brazil" e, se fizer sentido pelo contexto (ex: menção a fuso americano, horário de trabalho, "US-based team"), complementar com uma nota curta de disponibilidade de fuso (ex: "Brazil — available for US time zone overlap" ou "Brazil (GMT-3), overlapping with US business hours"). Use julgamento: nem toda vaga em inglês é necessariamente remota/internacional (pode ser uma multinacional com escritório no Brasil, aí a cidade exata ainda pode ser relevante) — leia o contexto da vaga antes de decidir.
5. "objective": escreva um parágrafo NOVO que seja um objetivo profissional de verdade, não um resumo de habilidades reformulado como prosa. A diferença importa: um resumo de skills apenas relista o que a pessoa sabe fazer (ex: "Fluent in AI-first workflows: Claude Code is part of the daily process for X, Y, and Z" é isso — uma lista de ferramentas/competências com verbo de "domina/usa" como estrutura da frase). Um objetivo de verdade parte de quem ela é (1 frase curta) e declara o que ela busca/pretende contribuir NESSA vaga específica, ancorado em no máximo 1-2 fatos de background_facts (não uma varredura de todos os 5) e conectado explicitamente a uma característica real da vaga — não apenas "sei usar as ferramentas que a vaga pede". Use construção nominal/impessoal (ver regra 8: "Busca contribuir com..." em vez de "Busco..."), ecoando 2-3 palavras-chave literais da vaga. Máximo 3-4 frases curtas.
6. "experience": para cada item de database.experience, decida se ele agrega algo relevante pra essa vaga — se não agregar nada (ex: uma experiência de social media numa vaga puramente técnica de backend), pode omitir a experiência inteira. Para os que ficarem, escreva "description" como 2-3 frases curtas e diretas (não lista) combinando os "facts" mais relevantes pra vaga; pode omitir fatos irrelevantes, nunca inventar novos. Use "role" e "period" exatamente como estão no banco (são fatos históricos, não mudam).
7. "projects": escolha os 2-3 projetos de database.projects mais relevantes, comparando stack + facts de cada um com os requisitos da vaga. Para cada um, escreva um "role" específico pra essa vaga (ex: "Desenvolvedor Full Stack", "Design de Produto", ou algo combinado tipo "Desenvolvedor Full Stack com Contribuição Visual" se a vaga pedir esse tipo de mistura) e uma "description" de 2-4 frases curtas combinando os facts relevantes — técnicos e/ou visuais, conforme a vaga pedir, sem se limitar a "só o lado dev" ou "só o lado design" quando ambos importam. "stack" deve ser o subconjunto do stack do projeto mais relevante (não precisa listar tudo).

8. Estilo de escrita — isso é tão importante quanto o conteúdo: escreva do jeito direto e factual que já aparece nos "facts" do banco, não como um discurso de marketing pessoal. EVITE ativamente clichês de currículo gerado por IA, como: "proven track record", "passionate about", "leverage cutting-edge", "seamlessly bridge the gap between X and Y", "rigorous visual sensibility", "spearheaded", "combines X with Y" como fórmula repetida, ou qualquer frase que soe genérica/motivacional em vez de concreta. NÃO termine experiências e projetos diferentes com a mesma frase de fechamento (tipo "ensuring design fidelity" ou "bridging design and development" repetido várias vezes) — cada descrição deve variar de estrutura e soar como um relato direto do que foi construído, não uma fórmula copiada. Prefira frases curtas e concretas a períodos longos cheios de adjetivos. **Evite travessões (—) para intercalar frases** — isso é um tique claro de texto gerado por IA; use no máximo um travessão em todo o texto do currículo, preferindo pontuação simples (ponto, vírgula) pra separar ideias. **Escreva sempre na forma impessoal/nominal padrão de currículo** (ex: "Criação de peças gráficas...", "Desenvolvimento da plataforma...", "Responsável por...", "Atuação em...") — NUNCA em primeira pessoa ("eu", "minha", "uso", "busco", "tenho", "desenvolvi") nem segunda pessoa ("você"), e sem precisar recorrer ao nome da pessoa ou a pronomes pessoais como sujeito explícito. Isso vale em "objective" também: em vez de "Busco contribuir...", use algo como "Busca contribuir..." ou reformule pra construção nominal. Isso vale nos dois idiomas (em inglês, prefira formas como "Led...", "Built...", "Experience in..." sem "I/my").
9. "skills": database.skills é UMA lista única com todas as habilidades de ${name}, técnicas e visuais misturadas. Julgue cada habilidade pela relevância real àquela vaga específica — não pegue "todas as de design" ou "todas as de dev" automaticamente por categoria. Ordene as mais relevantes primeiro. Máximo ~12 itens.
10. "education": database.education é uma lista (pode ter mais de uma formação formal — graduação, pós-graduação, mestrado etc). Inclua TODOS os itens, na mesma ordem do banco — formação formal não é filtrada por relevância como experience/projects, é sempre mostrada. Para cada item, adapte degree pro idioma certo, mantendo os fatos (institution e period não mudam).
11. "additionalEducation": se database.additional_education existir, decida quais itens agregam pra essa vaga (geralmente vale manter todos, já que cursos complementares reforçam credibilidade sem ocupar muito espaço — mas pode omitir os claramente irrelevantes se a lista for longa). Institution não muda; adapte description pro idioma certo. Se o banco não tiver esse campo, retorne lista vazia.
12. "languages": adapte name e level pro idioma certo (ex: "Português (Nativo)" -> "Portuguese (Native)" se a vaga for em inglês).
13. "presentationScript": muitas vagas internacionais pedem um vídeo curto de apresentação, às vezes com um roteiro específico do que cobrir (perguntas, pontos obrigatórios, duração pedida). Se o usuário forneceu "Instruções específicas pro vídeo" (ver seção abaixo), use isso como guia principal — responda aos pontos pedidos, na ordem pedida, sempre baseado em fatos reais do banco (nunca invente uma resposta pra um ponto sem fato correspondente; nesse caso responda de forma genérica e honesta em vez de inventar, ou simplesmente não force uma resposta artificial). Se a vaga pedir uma duração diferente do padrão, siga a duração pedida. Se NÃO houver instruções específicas, use a estrutura padrão: quem é ${name} (nome + resumo de background), a trajetória profissional até aqui (ex: uma transição de carreira, se os fatos do banco indicarem uma), 1-2 projetos ou experiências mais relevantes pra ESSA vaga específica, e por que esse perfil se encaixa na vaga. Duração alvo nesse caso: 30 segundos a 2 minutos falado (aproximadamente 90 a 260 palavras).

${presentationScriptStyleRules(name)}
14. meta.profile: uma descrição curta e específica do perfil que você montou pra essa vaga (não precisa ser uma das 3 categorias clássicas — pode ser algo como "Full Stack com diferencial em Design Gráfico" se for o caso real). meta.slugHint: identificador curto pra nome de arquivo (baseado na empresa se aparecer na vaga, senão no cargo — só letras minúsculas, números e hífen, sem espaços/acentos). meta.resumo: 1-2 frases em português explicando as escolhas feitas (aparece pro usuário na interface, não entra no PDF).

Retorne o objeto preenchendo exatamente o schema fornecido.`;
}

function runClaude(prompt, schema) {
  return new Promise((resolve, reject) => {
    // O prompt vai via stdin (não como argumento de CLI) para evitar o limite de
    // tamanho de linha de comando do Windows, já que o prompt embute o banco de
    // dados inteiro e pode passar de 8-10KB facilmente.
    const args = [
      '-p',
      '--output-format', 'json',
      '--json-schema', JSON.stringify(schema),
      '--tools', '',
      '--no-session-persistence',
      '--model', 'sonnet',
      // "low" era ~62% mais rápido, mas Victor notou currículos saindo mais
      // genéricos/repetitivos com esse nível — a tarefa de compor um texto sob
      // medida pra cada vaga se beneficia de mais raciocínio do que "low" dava.
      '--effort', 'high'
    ];

    const child = spawn('claude', args, { cwd: PROJECT_ROOT });
    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Tempo limite ao chamar o Claude Code CLI (mais de 120s).'));
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('error', err => {
      clearTimeout(timeout);
      reject(new Error(`Não foi possível iniciar o Claude Code CLI: ${err.message}`));
    });

    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Claude Code CLI encerrou com erro (código ${code}): ${stderr || stdout}`));
        return;
      }
      let envelope;
      try {
        envelope = JSON.parse(stdout);
      } catch (err) {
        reject(new Error(`Resposta do Claude Code CLI não é um JSON válido: ${err.message}`));
        return;
      }
      if (envelope.is_error || !envelope.structured_output) {
        reject(new Error(`Claude Code CLI não retornou saída estruturada válida: ${envelope.result || stdout}`));
        return;
      }
      resolve(envelope.structured_output);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function generateResumeData(databasePath, jobDescription, videoInstructions) {
  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  database.education = toEducationArray(database.education);
  const prompt = buildPrompt(database, jobDescription, videoInstructions);
  const structured = await runClaude(prompt, RESUME_SCHEMA);

  const resolved = {
    personal: {
      ...database.personal,
      location: structured.contactLocation || database.personal.location
    },
    language: structured.language,
    title: structured.title,
    objective: structured.objective,
    experience: structured.experience,
    projects: structured.projects,
    education: structured.education,
    additionalEducation: structured.additionalEducation || [],
    skills: structured.skills,
    languages: structured.languages,
    presentationScript: structured.presentationScript || '',
    portfolio: database.portfolio
  };

  return { resolved, meta: structured.meta };
}

async function importResumeFromText(rawText) {
  const prompt = buildImportPrompt(rawText);
  const structured = await runClaude(prompt, RESUME_IMPORT_SCHEMA);

  const resolved = {
    personal: {
      name: structured.personal.name || '',
      age: structured.personal.age || 0,
      location: structured.personal.location || '',
      phone: structured.personal.phone || '',
      email: structured.personal.email || '',
      github: structured.personal.github || '',
      linkedin: structured.personal.linkedin || '',
      behance: structured.personal.behance || ''
    },
    language: structured.language,
    title: structured.title || '',
    objective: structured.objective || '',
    experience: structured.experience || [],
    projects: structured.projects || [],
    education: structured.education || [],
    additionalEducation: structured.additionalEducation || [],
    skills: structured.skills || [],
    languages: structured.languages || [],
    presentationScript: '',
    portfolio: structured.portfolio || { github: '', behance: '' }
  };

  return { resolved, meta: structured.meta };
}

async function importDatabaseFromText(rawText) {
  const prompt = buildDatabaseImportPrompt(rawText);
  const structured = await runClaude(prompt, DATABASE_IMPORT_SCHEMA);

  return {
    personal: {
      name: structured.personal.name || '',
      age: structured.personal.age || 0,
      location: structured.personal.location || '',
      phone: structured.personal.phone || '',
      email: structured.personal.email || '',
      github: structured.personal.github || '',
      linkedin: structured.personal.linkedin || '',
      behance: structured.personal.behance || ''
    },
    background_facts: structured.background_facts || [],
    experience: structured.experience || [],
    projects: structured.projects || [],
    skills: structured.skills || [],
    education: structured.education || [],
    additional_education: structured.additional_education || [],
    languages: structured.languages || [],
    portfolio: structured.portfolio || { github: '', behance: '', behance_note: '' }
  };
}

async function translateResume(resolvedData, targetLanguage) {
  resolvedData.education = toEducationArray(resolvedData.education);
  const prompt = buildTranslatePrompt(resolvedData, targetLanguage);
  const translated = await runClaude(prompt, TRANSLATE_SCHEMA);

  return {
    ...resolvedData,
    language: targetLanguage,
    title: translated.title,
    objective: translated.objective,
    experience: resolvedData.experience.map((exp, i) => ({
      ...exp,
      role: translated.experience[i] ? translated.experience[i].role : exp.role,
      description: translated.experience[i] ? translated.experience[i].description : exp.description
    })),
    projects: resolvedData.projects.map((proj, i) => ({
      ...proj,
      role: translated.projects[i] ? translated.projects[i].role : proj.role,
      description: translated.projects[i] ? translated.projects[i].description : proj.description
    })),
    education: resolvedData.education.map((edu, i) => ({
      ...edu,
      degree: translated.education[i] ? translated.education[i].degree : edu.degree
    })),
    additionalEducation: (resolvedData.additionalEducation || []).map((ed, i) => ({
      ...ed,
      description: translated.additionalEducation[i] ? translated.additionalEducation[i].description : ed.description
    })),
    languages: translated.languages,
    presentationScript: translated.presentationScript || ''
  };
}

const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    presentationScript: { type: 'string' }
  },
  required: ['presentationScript']
};

function buildScriptPrompt(resolvedData, videoInstructions) {
  const name = (resolvedData.personal && resolvedData.personal.name) || 'a pessoa candidata';
  const context = {
    title: resolvedData.title,
    objective: resolvedData.objective,
    experience: resolvedData.experience.map(e => ({ role: e.role, description: e.description })),
    projects: resolvedData.projects.map(p => ({ name: p.name, role: p.role, description: p.description })),
    skills: resolvedData.skills
  };

  return `Você vai escrever (ou reescrever) só o roteiro de apresentação em vídeo pra ${name}, com base no currículo já montado abaixo. Isso é usado quando a vaga pede um vídeo curto de apresentação como parte da candidatura.

## Currículo já montado (idioma: ${resolvedData.language})

${JSON.stringify(context, null, 2)}

## Instruções específicas pro vídeo (fornecidas pelo usuário)

${videoInstructions && videoInstructions.trim() ? videoInstructions : '(nenhuma — use a estrutura padrão)'}

## Como escrever

Se houver instruções específicas pro vídeo acima, siga essa estrutura como guia principal — responda aos pontos pedidos, na ordem pedida, sempre baseado nos fatos do currículo acima (nunca invente uma resposta pra um ponto sem fato correspondente). Se NÃO houver instruções específicas, use a estrutura padrão: quem é ${name} (nome + resumo de background), a trajetória profissional relevante até aqui, 1-2 projetos/experiências mais relevantes, e por que esse perfil se encaixa. Duração alvo nesse caso: 30 segundos a 2 minutos falado (~90-260 palavras). Escreva no idioma "${resolvedData.language}".

${presentationScriptStyleRules(name)}

Retorne o objeto preenchendo exatamente o schema fornecido.`;
}

async function generatePresentationScript(resolvedData, videoInstructions) {
  const prompt = buildScriptPrompt(resolvedData, videoInstructions);
  const structured = await runClaude(prompt, SCRIPT_SCHEMA);
  return structured.presentationScript;
}

module.exports = {
  generateResumeData,
  importResumeFromText,
  importDatabaseFromText,
  translateResume,
  generatePresentationScript,
  buildPrompt,
  RESUME_SCHEMA
};
