const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const { auth, db } = require('./firebase-admin');
const { generateResumeData, importResumeFromText, importDatabaseFromText, translateResume, generatePresentationScript, generateCoverLetter } = require('./claude-engine');
const { buildResume } = require('../scripts/build-resume');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROJECT_ROOT = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const PORT = 5175;

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use('/output', express.static(OUTPUT_DIR));
// Reaproveita as mesmas fontes do template do PDF (PT Serif + Lato) na UI do
// app, pra criar identidade visual coerente entre a ferramenta e o currículo
// que ela gera.
app.use('/fonts', express.static(path.join(PROJECT_ROOT, 'template', 'fonts')));

function slugify(text) {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40);
  return slug || 'curriculo';
}

// ---------- Autenticação: cada conta é dona de exatamente um banco de dados
// (users/{uid} no Firestore) e de uma pasta de currículos gerados
// (output/{uid}), isolados por conta. O uid vem de um token do Firebase
// verificado no servidor — nunca de algo que o cliente escolhe na URL. ----------

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    req.userEmail = decoded.email || '';
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

app.use('/api', requireAuth);

function userOutputDir(uid) {
  return path.join(OUTPUT_DIR, uid);
}

function blankDatabase() {
  return {
    personal: { name: '', age: 0, location: '', phone: '', email: '', github: '', linkedin: '', behance: '' },
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

// No primeiro acesso de uma conta nova, o documento Firestore ainda não
// existe — cria com o banco em branco (mesmo shape que o editor espera) e
// devolve, em vez de 404.
async function getOrCreateDatabase(uid, email) {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const created = { ...blankDatabase(), email, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await ref.set(created);
  return created;
}

app.get('/api/database', async (req, res) => {
  try {
    const data = await getOrCreateDatabase(req.uid, req.userEmail);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível ler o banco de dados: ${err.message}` });
  }
});

app.put('/api/database', async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object' || !incoming.personal || !incoming.projects) {
    res.status(400).json({ error: 'Formato inválido: campos "personal" e "projects" são obrigatórios.' });
    return;
  }
  try {
    await db.collection('users').doc(req.uid).set(
      { ...incoming, email: req.userEmail, updatedAt: new Date().toISOString() },
      { merge: false }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Falha ao salvar: ${err.message}` });
  }
});

// Lê um PDF de currículo já pronto e extrai fatos brutos (não texto já
// composto) pra popular o Editor do Banco. Não grava nada — devolve os dados
// pro front-end preencher o formulário, revisar e só então salvar (PUT acima).
app.post('/api/database/import', upload.single('resume'), async (req, res) => {
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
function uniqueSlug(uid, desiredSlug) {
  let slug = desiredSlug;
  let counter = 2;
  const dir = userOutputDir(uid);
  while (fs.existsSync(path.join(dir, `${slug}.pdf`)) || fs.existsSync(path.join(dir, `${slug}.json`))) {
    slug = `${desiredSlug}-${counter}`;
    counter++;
  }
  return slug;
}

async function saveResumeFiles(uid, slug, resolved) {
  const dir = userOutputDir(uid);
  const jsonPath = path.join(dir, `${slug}.json`);
  const pdfPath = path.join(dir, `${slug}.pdf`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(resolved, null, 2), 'utf8');
  await buildResume(jsonPath, pdfPath);
  return { jsonPath, pdfPath };
}

app.post('/api/resumes/generate', async (req, res) => {
  const { jobDescription, fileName, videoInstructions } = req.body || {};
  if (!jobDescription || !jobDescription.trim()) {
    res.status(400).json({ error: 'Cole a descrição da vaga antes de gerar.' });
    return;
  }

  try {
    const database = await getOrCreateDatabase(req.uid, req.userEmail);
    const { resolved, meta } = await generateResumeData(database, jobDescription, videoInstructions);
    const slug = fileName && fileName.trim()
      ? uniqueSlug(req.uid, slugify(fileName))
      : `${slugify(meta.slugHint)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (fileName && fileName.trim()) resolved.fileLabel = fileName.trim();
    await saveResumeFiles(req.uid, slug, resolved);

    res.json({
      slug,
      profile: meta.profile,
      language: resolved.language,
      projectsChosen: resolved.projects.map(p => p.name),
      resumo: meta.resumo,
      presentationScript: resolved.presentationScript || '',
      coverLetter: resolved.coverLetter || '',
      pdfUrl: `/output/${req.uid}/${slug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resumes', (req, res) => {
  try {
    const dir = userOutputDir(req.uid);
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
        pdfUrl: `/output/${req.uid}/${pdfFile}`
      };
    });

    items.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível listar os currículos: ${err.message}` });
  }
});

app.delete('/api/resumes/:slug', (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    [`${slug}.pdf`, `${slug}.json`].forEach(filename => {
      const filePath = path.join(userOutputDir(req.uid), filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: `Não foi possível excluir: ${err.message}` });
  }
});

// Edita o conteúdo de um currículo já gerado e re-renderiza o PDF no mesmo slug.
app.put('/api/resumes/:slug', async (req, res) => {
  const slug = path.basename(req.params.slug);
  const { fileName, ...resolved } = req.body || {};
  if (!resolved || typeof resolved !== 'object' || !resolved.personal || !resolved.title) {
    res.status(400).json({ error: 'Formato inválido: campos "personal" e "title" são obrigatórios.' });
    return;
  }
  try {
    const jsonPath = path.join(userOutputDir(req.uid), `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }

    // Se o nome do arquivo não mudou, sobrescreve no lugar (mesmo slug). Se
    // mudou, salva como um arquivo novo, mantendo o original intacto.
    const renamed = fileName && fileName.trim() && fileName.trim() !== slug;
    const targetSlug = renamed ? uniqueSlug(req.uid, slugify(fileName)) : slug;
    // Só atualiza o rótulo exibido na lista se o usuário de fato renomeou aqui —
    // caso contrário preserva o fileLabel que já veio junto de `resolved` (se houver).
    if (renamed) resolved.fileLabel = fileName.trim();

    await saveResumeFiles(req.uid, targetSlug, resolved);
    res.json({ ok: true, slug: targetSlug, pdfUrl: `/output/${req.uid}/${targetSlug}.pdf` });
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
app.post('/api/resumes/import', upload.single('resume'), async (req, res) => {
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
      ? uniqueSlug(req.uid, slugify(req.body.fileName))
      : `${slugify(meta.slugHint)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (req.body.fileName && req.body.fileName.trim()) resolved.fileLabel = req.body.fileName.trim();
    await saveResumeFiles(req.uid, slug, resolved);

    res.json({
      slug,
      title: resolved.title,
      language: resolved.language,
      pdfUrl: `/output/${req.uid}/${slug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Traduz um currículo já gerado pro outro idioma, salvando como uma nova
// entrada separada (não sobrescreve a versão original).
app.post('/api/resumes/:slug/translate', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const jsonPath = path.join(userOutputDir(req.uid), `${slug}.json`);
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

    await saveResumeFiles(req.uid, newSlug, translated);

    res.json({
      slug: newSlug,
      title: translated.title,
      language: translated.language,
      pdfUrl: `/output/${req.uid}/${newSlug}.pdf`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gera (ou regenera) só o roteiro de apresentação em vídeo pra um currículo já
// existente, usando instruções de vídeo opcionais. Não salva no disco — só
// devolve o texto pro usuário revisar/editar antes de clicar em Salvar.
app.post('/api/resumes/:slug/script', async (req, res) => {
  const slug = path.basename(req.params.slug);
  const { videoInstructions } = req.body || {};
  try {
    const jsonPath = path.join(userOutputDir(req.uid), `${slug}.json`);
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

// Gera (ou regenera) só a carta de apresentação pra um currículo já existente.
// Mesmo padrão da rota /script acima: não salva no disco, só devolve o texto
// pro usuário revisar/editar antes de clicar em Salvar.
app.post('/api/resumes/:slug/cover-letter', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const jsonPath = path.join(userOutputDir(req.uid), `${slug}.json`);
    if (!fs.existsSync(jsonPath)) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const resolved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const coverLetter = await generateCoverLetter(resolved);
    res.json({ coverLetter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alguns PDFs em output/<uid>/ não têm um .json correspondente (ex:
// adicionados manualmente, fora do fluxo normal do sistema). Essa rota extrai
// o texto do PDF já existente no disco e gera o .json estruturado pra esse
// mesmo slug, permitindo editar esse currículo dali pra frente.
app.post('/api/resumes/:slug/repair', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const pdfPath = path.join(userOutputDir(req.uid), `${slug}.pdf`);
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
    const jsonPath = path.join(userOutputDir(req.uid), `${slug}.json`);
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
