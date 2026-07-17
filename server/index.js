const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const { generateResumeData, importResumeFromText, importDatabaseFromText, translateResume, generatePresentationScript } = require('./claude-engine');
const { buildResume } = require('../scripts/build-resume');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROJECT_ROOT = path.join(__dirname, '..');
const PROFILES_DIR = path.join(PROJECT_ROOT, 'data', 'profiles');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const PORT = 5175;

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use('/output', express.static(OUTPUT_DIR));

function slugify(text) {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40);
  return slug || 'curriculo';
}

// ---------- Perfis (cada perfil é uma pasta com seu próprio banco de dados
// e sua própria pasta de currículos gerados, isolados um do outro) ----------

function profileDir(profileId) {
  return path.join(PROFILES_DIR, profileId);
}
function profileDatabasePath(profileId) {
  return path.join(profileDir(profileId), 'database.json');
}
function profileBackupPath(profileId) {
  return path.join(profileDir(profileId), 'database.backup.json');
}
function profileOutputDir(profileId) {
  return path.join(OUTPUT_DIR, profileId);
}
function profileExists(profileId) {
  return fs.existsSync(profileDatabasePath(profileId));
}

function blankDatabase(name) {
  return {
    personal: { name: name || '', age: 0, location: '', phone: '', email: '', github: '', linkedin: '', behance: '' },
    background_facts: [],
    experience: [],
    projects: [],
    skills: [],
    education: [],
    additional_education: [],
    languages: [],
    portfolio: { github: '', behance: '', behance_note: '' }
  };
}

// Mesma lógica de "não sobrescrever" usada pra nomes de arquivo de currículo
// (uniqueSlug, abaixo), aplicada aqui pra pasta de perfil.
function uniqueProfileSlug(desiredSlug) {
  let slug = desiredSlug;
  let counter = 2;
  while (fs.existsSync(profileDir(slug))) {
    slug = `${desiredSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// Resolve :profileId em qualquer rota que o use, validando que o perfil
// existe antes de entrar no handler — evita repetir essa checagem em cada rota.
app.param('profileId', (req, res, next, id) => {
  const profileId = path.basename(id);
  if (!profileExists(profileId)) {
    res.status(404).json({ error: 'Perfil não encontrado.' });
    return;
  }
  req.profileId = profileId;
  next();
});

app.get('/api/profiles', (req, res) => {
  try {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
    const ids = fs.readdirSync(PROFILES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(profileExists);

    const items = ids.map(id => {
      let name = id;
      try {
        const data = JSON.parse(fs.readFileSync(profileDatabasePath(id), 'utf8'));
        name = (data.personal && data.personal.name) || id;
      } catch (err) { /* database.json corrompido ou incompleto: usa o id como nome */ }
      return { id, name };
    });

    items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível listar os perfis: ${err.message}` });
  }
});

app.post('/api/profiles', (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Informe um nome para o novo perfil.' });
    return;
  }
  try {
    const id = uniqueProfileSlug(slugify(name));
    fs.mkdirSync(profileDir(id), { recursive: true });
    fs.mkdirSync(profileOutputDir(id), { recursive: true });
    fs.writeFileSync(profileDatabasePath(id), JSON.stringify(blankDatabase(name.trim()), null, 2), 'utf8');
    res.json({ id, name: name.trim() });
  } catch (err) {
    res.status(500).json({ error: `Falha ao criar perfil: ${err.message}` });
  }
});

app.delete('/api/profiles/:profileId', (req, res) => {
  try {
    fs.rmSync(profileDir(req.profileId), { recursive: true, force: true });
    fs.rmSync(profileOutputDir(req.profileId), { recursive: true, force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Falha ao excluir perfil: ${err.message}` });
  }
});

app.get('/api/profiles/:profileId/database', (req, res) => {
  try {
    const data = fs.readFileSync(profileDatabasePath(req.profileId), 'utf8');
    res.type('application/json').send(data);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível ler o banco de dados: ${err.message}` });
  }
});

app.put('/api/profiles/:profileId/database', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || !incoming.personal || !incoming.projects) {
    res.status(400).json({ error: 'Formato inválido: campos "personal" e "projects" são obrigatórios.' });
    return;
  }
  try {
    fs.copyFileSync(profileDatabasePath(req.profileId), profileBackupPath(req.profileId));
    fs.writeFileSync(profileDatabasePath(req.profileId), JSON.stringify(incoming, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Falha ao salvar: ${err.message}` });
  }
});

// Lê um PDF de currículo já pronto e extrai fatos brutos (não texto já
// composto) pra popular o Editor do Banco desse perfil. Não grava nada em
// disco — devolve os dados pro front-end preencher o formulário, revisar e
// só então salvar (mesmo fluxo/backup do PUT acima).
app.post('/api/profiles/:profileId/database/import', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Envie um arquivo PDF.' });
    return;
  }
  try {
    const text = await extractTextFromPdfBuffer(req.file.buffer);
    if (!text.trim()) {
      res.status(400).json({ error: 'Não foi possível extrair texto desse PDF.' });
      return;
    }
    const resolved = await importDatabaseFromText(text);
    res.json(resolved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quando o usuário escolhe o nome do arquivo, evita sobrescrever um já
// existente (PDF ou JSON) acrescentando "-2", "-3" etc., em vez de usar
// timestamp — nomes escolhidos à mão devem ficar limpos e fáceis de achar.
function uniqueSlug(profileId, desiredSlug) {
  let slug = desiredSlug;
  let counter = 2;
  const dir = profileOutputDir(profileId);
  while (fs.existsSync(path.join(dir, `${slug}.pdf`)) || fs.existsSync(path.join(dir, `${slug}.json`))) {
    slug = `${desiredSlug}-${counter}`;
    counter++;
  }
  return slug;
}

async function saveResumeFiles(profileId, slug, resolved) {
  const dir = profileOutputDir(profileId);
  const jsonPath = path.join(dir, `${slug}.json`);
  const pdfPath = path.join(dir, `${slug}.pdf`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(resolved, null, 2), 'utf8');
  await buildResume(jsonPath, pdfPath);
  return { jsonPath, pdfPath };
}

app.post('/api/profiles/:profileId/generate', async (req, res) => {
  const { jobDescription, fileName, videoInstructions } = req.body || {};
  if (!jobDescription || !jobDescription.trim()) {
    res.status(400).json({ error: 'Cole a descrição da vaga antes de gerar.' });
    return;
  }

  try {
    const { resolved, meta } = await generateResumeData(profileDatabasePath(req.profileId), jobDescription, videoInstructions);
    const slug = fileName && fileName.trim()
      ? uniqueSlug(req.profileId, slugify(fileName))
      : `${slugify(meta.slugHint)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (fileName && fileName.trim()) resolved.fileLabel = fileName.trim();
    await saveResumeFiles(req.profileId, slug, resolved);

    res.json({
      slug,
      profile: meta.profile,
      language: resolved.language,
      projectsChosen: resolved.projects.map(p => p.name),
      resumo: meta.resumo,
      presentationScript: resolved.presentationScript || '',
      pdfUrl: `/output/${req.profileId}/${slug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profiles/:profileId/resumes', (req, res) => {
  try {
    const dir = profileOutputDir(req.profileId);
    fs.mkdirSync(dir, { recursive: true });
    const pdfFiles = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));

    const items = pdfFiles.map(pdfFile => {
      const slug = pdfFile.replace(/\.pdf$/, '');
      const jsonPath = path.join(dir, `${slug}.json`);
      const stat = fs.statSync(path.join(dir, pdfFile));

      let title = slug;
      let language = null;
      let presentationScript = '';
      if (fs.existsSync(jsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          // Prioriza o nome que o usuário escolheu ao gerar/importar/editar
          // (fileLabel) sobre o título profissional do currículo (data.title) —
          // a lista deve mostrar o nome que a pessoa digitou, não o cargo da vaga.
          title = data.fileLabel || data.title || title;
          language = data.language || null;
          presentationScript = data.presentationScript || '';
        } catch (err) { /* JSON corrompido ou incompleto: mantém os valores padrão */ }
      }

      return {
        slug,
        title,
        language,
        presentationScript,
        generatedAt: stat.mtime.toISOString(),
        pdfUrl: `/output/${req.profileId}/${pdfFile}`
      };
    });

    items.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível listar os currículos: ${err.message}` });
  }
});

app.delete('/api/profiles/:profileId/resumes/:slug', (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    [`${slug}.pdf`, `${slug}.json`].forEach(filename => {
      const filePath = path.join(profileOutputDir(req.profileId), filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Não foi possível excluir: ${err.message}` });
  }
});

// Edita o conteúdo de um currículo já gerado e re-renderiza o PDF no mesmo slug.
app.put('/api/profiles/:profileId/resumes/:slug', async (req, res) => {
  const slug = path.basename(req.params.slug);
  const { fileName, ...resolved } = req.body || {};
  if (!resolved || typeof resolved !== 'object' || !resolved.personal || !resolved.title) {
    res.status(400).json({ error: 'Formato inválido: campos "personal" e "title" são obrigatórios.' });
    return;
  }
  try {
    const jsonPath = path.join(profileOutputDir(req.profileId), `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }

    // Se o nome do arquivo não mudou, sobrescreve no lugar (mesmo slug). Se
    // mudou, salva como um arquivo novo, mantendo o original intacto.
    const renamed = fileName && fileName.trim() && fileName.trim() !== slug;
    const targetSlug = renamed ? uniqueSlug(req.profileId, slugify(fileName)) : slug;
    // Só atualiza o rótulo exibido na lista se o usuário de fato renomeou aqui —
    // caso contrário preserva o fileLabel que já veio junto de `resolved` (se houver).
    if (renamed) resolved.fileLabel = fileName.trim();

    await saveResumeFiles(req.profileId, targetSlug, resolved);
    res.json({ ok: true, slug: targetSlug, pdfUrl: `/output/${req.profileId}/${targetSlug}.pdf` });
  } catch (err) {
    res.status(500).json({ error: `Falha ao salvar: ${err.message}` });
  }
});

async function extractTextFromPdfBuffer(buffer) {
  const parser = new PDFParse({ data: buffer });
  const extracted = await parser.getText();
  await parser.destroy();
  return extracted.text || '';
}

// Importa um PDF de currículo externo, estrutura o conteúdo via IA e gera uma
// nova entrada (JSON + PDF) no mesmo formato usado pelo resto do sistema.
app.post('/api/profiles/:profileId/resumes/import', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Envie um arquivo PDF.' });
    return;
  }
  try {
    const text = await extractTextFromPdfBuffer(req.file.buffer);
    if (!text.trim()) {
      res.status(400).json({ error: 'Não foi possível extrair texto desse PDF.' });
      return;
    }

    const { resolved, meta } = await importResumeFromText(text);
    const slug = req.body.fileName && req.body.fileName.trim()
      ? uniqueSlug(req.profileId, slugify(req.body.fileName))
      : `${slugify(meta.slugHint)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (req.body.fileName && req.body.fileName.trim()) resolved.fileLabel = req.body.fileName.trim();
    await saveResumeFiles(req.profileId, slug, resolved);

    res.json({
      slug,
      title: resolved.title,
      language: resolved.language,
      pdfUrl: `/output/${req.profileId}/${slug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Traduz um currículo já gerado pro outro idioma, salvando como uma nova
// entrada separada (não sobrescreve a versão original).
app.post('/api/profiles/:profileId/resumes/:slug/translate', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const jsonPath = path.join(profileOutputDir(req.profileId), `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const resolved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const targetLanguage = resolved.language === 'en' ? 'pt' : 'en';

    const translated = await translateResume(resolved, targetLanguage);
    const baseSlug = slug.replace(/-(pt|en)-\d{4}-\d{2}-\d{2}T.+$/, '').replace(/-\d{4}-\d{2}-\d{2}T.+$/, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newSlug = `${baseSlug}-${targetLanguage}-${timestamp}`;

    await saveResumeFiles(req.profileId, newSlug, translated);

    res.json({
      slug: newSlug,
      title: translated.title,
      language: translated.language,
      pdfUrl: `/output/${req.profileId}/${newSlug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gera (ou regenera) só o roteiro de apresentação em vídeo pra um currículo já
// existente, usando instruções de vídeo opcionais. Não salva no disco — só
// devolve o texto pro usuário revisar/editar antes de clicar em Salvar.
app.post('/api/profiles/:profileId/resumes/:slug/script', async (req, res) => {
  const slug = path.basename(req.params.slug);
  const { videoInstructions } = req.body || {};
  try {
    const jsonPath = path.join(profileOutputDir(req.profileId), `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const resolved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const presentationScript = await generatePresentationScript(resolved, videoInstructions);
    res.json({ presentationScript });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alguns PDFs em output/<perfil>/ não têm um .json correspondente (ex:
// adicionados manualmente, fora do fluxo normal do sistema). Essa rota extrai
// o texto do PDF já existente no disco e gera o .json estruturado pra esse
// mesmo slug, permitindo editar esse currículo dali pra frente.
app.post('/api/profiles/:profileId/resumes/:slug/repair', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const pdfPath = path.join(profileOutputDir(req.profileId), `${slug}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({ error: 'PDF não encontrado.' });
      return;
    }

    const text = await extractTextFromPdfBuffer(fs.readFileSync(pdfPath));
    if (!text.trim()) {
      res.status(400).json({ error: 'Não foi possível extrair texto desse PDF.' });
      return;
    }

    const { resolved } = await importResumeFromText(text);
    const jsonPath = path.join(profileOutputDir(req.profileId), `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(resolved, null, 2), 'utf8');

    res.json({ ok: true, resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Feche esta janela para encerrar o servidor.');
  exec(`start "" http://localhost:${PORT}`);
});
