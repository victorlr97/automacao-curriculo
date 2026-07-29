const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const { auth, db, bucket } = require('./firebase-admin');
const { generateResumeData, importResumeFromText, importDatabaseFromText, translateResume, generatePresentationScript, generateCoverLetter } = require('./claude-engine');
const { buildResume } = require('../scripts/build-resume');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROJECT_ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5175;

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
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
// (users/{uid} no Firestore) e dos currículos gerados por ela
// (users/{uid}/resumes/{slug} no Firestore + PDF no Storage), isolados por
// conta. O uid vem de um token do Firebase verificado no servidor — nunca de
// algo que o cliente escolhe na URL. ----------

// Enquanto o motor de IA for a CLI do Claude Code (assinatura pessoal, não
// API paga por token), o acesso fica restrito a uma lista de e-mails —
// gerenciada em config/allowlist no Firestore (ver scripts/manage-allowlist.js).
// Ter uma conta no Firebase Auth não basta: sem estar na lista, nenhuma rota
// /api responde, mesmo que o login em si tenha funcionado.
async function isEmailAllowed(email) {
  if (!email) return false;
  const snap = await db.collection('config').doc('allowlist').get();
  const emails = snap.exists ? snap.data().emails || [] : [];
  return emails.includes(email.toLowerCase());
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  try {
    const decoded = await auth.verifyIdToken(match[1]);
    const email = decoded.email || '';
    if (!(await isEmailAllowed(email))) {
      res.status(403).json({ error: 'Sua conta ainda não foi liberada pra usar o app. Entre em contato com o administrador.' });
      return;
    }
    req.uid = decoded.uid;
    req.userEmail = email;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

app.use('/api', requireAuth);

function resumesCollection(uid) {
  return db.collection('users').doc(uid).collection('resumes');
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
// existente acrescentando "-2", "-3" etc., em vez de usar timestamp — nomes
// escolhidos à mão devem ficar limpos e fáceis de achar.
async function uniqueSlug(uid, desiredSlug) {
  let slug = desiredSlug;
  let counter = 2;
  while ((await resumesCollection(uid).doc(slug).get()).exists) {
    slug = `${desiredSlug}-${counter}`;
    counter++;
  }
  return slug;
}

async function getSignedPdfUrl(uid, slug) {
  const [url] = await bucket.file(`resumes/${uid}/${slug}.pdf`).getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000
  });
  return url;
}

// Renderiza o PDF num diretório temporário (o disco do host pode ser
// efêmero — só precisa sobreviver à duração dessa request), sobe o PDF pro
// Storage e grava os dados resolvidos no Firestore. Nada fica em disco
// depois que essa função termina.
async function saveResumeFiles(uid, slug, resolved) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-'));
  try {
    const jsonPath = path.join(tmpDir, `${slug}.json`);
    const pdfPath = path.join(tmpDir, `${slug}.pdf`);
    fs.writeFileSync(jsonPath, JSON.stringify(resolved, null, 2), 'utf8');
    await buildResume(jsonPath, pdfPath);

    const pdfBuffer = fs.readFileSync(pdfPath);
    await bucket.file(`resumes/${uid}/${slug}.pdf`).save(pdfBuffer, { contentType: 'application/pdf' });
    await resumesCollection(uid).doc(slug).set({ ...resolved, generatedAt: new Date().toISOString() });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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
      ? await uniqueSlug(req.uid, slugify(fileName))
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
      pdfUrl: await getSignedPdfUrl(req.uid, slug)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/resumes', async (req, res) => {
  try {
    const snap = await resumesCollection(req.uid).orderBy('generatedAt', 'desc').get();
    const items = await Promise.all(snap.docs.map(async doc => {
      const data = doc.data();
      return {
        slug: doc.id,
        // Prioriza o nome que o usuário escolheu ao gerar/importar/editar
        // (fileLabel) sobre o título profissional do currículo (data.title) —
        // a lista deve mostrar o nome que a pessoa digitou, não o cargo da vaga.
        title: data.fileLabel || data.title || doc.id,
        language: data.language || null,
        presentationScript: data.presentationScript || '',
        generatedAt: data.generatedAt,
        pdfUrl: await getSignedPdfUrl(req.uid, doc.id)
      };
    }));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: `Não foi possível listar os currículos: ${err.message}` });
  }
});

app.get('/api/resumes/:slug/json', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const doc = await resumesCollection(req.uid).doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/resumes/:slug', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    await resumesCollection(req.uid).doc(slug).delete();
    await bucket.file(`resumes/${req.uid}/${slug}.pdf`).delete({ ignoreNotFound: true });
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
    const docRef = resumesCollection(req.uid).doc(slug);
    if (!(await docRef.get()).exists) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }

    // Se o nome do arquivo não mudou, sobrescreve no lugar (mesmo slug). Se
    // mudou, salva como uma entrada nova, mantendo a original intacta.
    const renamed = fileName && fileName.trim() && fileName.trim() !== slug;
    const targetSlug = renamed ? await uniqueSlug(req.uid, slugify(fileName)) : slug;
    // Só atualiza o rótulo exibido na lista se o usuário de fato renomeou aqui —
    // caso contrário preserva o fileLabel que já veio junto de `resolved` (se houver).
    if (renamed) resolved.fileLabel = fileName.trim();

    await saveResumeFiles(req.uid, targetSlug, resolved);
    if (renamed) {
      await docRef.delete();
      await bucket.file(`resumes/${req.uid}/${slug}.pdf`).delete({ ignoreNotFound: true });
    }
    res.json({ ok: true, slug: targetSlug, pdfUrl: await getSignedPdfUrl(req.uid, targetSlug) });
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
// nova entrada (Firestore + PDF no Storage) no mesmo formato usado pelo resto
// do sistema.
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
      ? await uniqueSlug(req.uid, slugify(req.body.fileName))
      : `${slugify(meta.slugHint)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    if (req.body.fileName && req.body.fileName.trim()) resolved.fileLabel = req.body.fileName.trim();
    await saveResumeFiles(req.uid, slug, resolved);

    res.json({
      slug,
      title: resolved.title,
      language: resolved.language,
      pdfUrl: await getSignedPdfUrl(req.uid, slug)
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
    const doc = await resumesCollection(req.uid).doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const resolved = doc.data();
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
      pdfUrl: await getSignedPdfUrl(req.uid, newSlug)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gera (ou regenera) só o roteiro de apresentação em vídeo pra um currículo já
// existente, usando instruções de vídeo opcionais. Não salva sozinho — só
// devolve o texto pro usuário revisar/editar antes de clicar em Salvar.
app.post('/api/resumes/:slug/script', async (req, res) => {
  const slug = path.basename(req.params.slug);
  const { videoInstructions } = req.body || {};
  try {
    const doc = await resumesCollection(req.uid).doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const presentationScript = await generatePresentationScript(doc.data(), videoInstructions);
    res.json({ presentationScript });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gera (ou regenera) só a carta de apresentação pra um currículo já existente.
// Mesmo padrão da rota /script acima: não salva sozinho, só devolve o texto
// pro usuário revisar/editar antes de clicar em Salvar.
app.post('/api/resumes/:slug/cover-letter', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    const doc = await resumesCollection(req.uid).doc(slug).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Currículo não encontrado.' });
      return;
    }
    const coverLetter = await generateCoverLetter(doc.data());
    res.json({ coverLetter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.platform === 'win32') {
    exec(`start "" http://localhost:${PORT}`);
  }
});
