const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { exec } = require('child_process');
const { auth, db, bucket } = require('./firebase-admin');
const {
  generateResumeData,
  importResumeFromText,
  importDatabaseFromText,
  translateResume,
  generatePresentationScript,
  generateCoverLetter,
  summarizeFeedback
} = require('./claude-engine');
const { buildResume } = require('../scripts/build-resume');
const { sendAccessRequestEmail } = require('./mailer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROJECT_ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 5175;
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
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

// Loga o erro completo (stack, stderr da CLI do Claude, mensagem do driver do
// Firebase etc.) só no servidor — nunca repassa detalhe interno pro cliente,
// pra não vazar caminho de arquivo, versão de dependência ou outro detalhe de
// infraestrutura pra quem só está autenticado (não necessariamente confiável).
function sendServerError(res, err, publicMessage) {
  console.error(publicMessage, err);
  res.status(500).json({ error: publicMessage });
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

// Só verifica o token do Firebase, sem checar a allowlist — usado por
// requireAuth (abaixo) e pela rota de pedido de acesso, que por definição é
// chamada por gente que ainda não está na allowlist.
async function verifyToken(req, res) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'Não autenticado.' });
    return null;
  }
  try {
    return await auth.verifyIdToken(match[1]);
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    return null;
  }
}

async function requireAuth(req, res, next) {
  const decoded = await verifyToken(req, res);
  if (!decoded) return;
  const email = decoded.email || '';
  if (!(await isEmailAllowed(email))) {
    res.status(403).json({ error: 'Sua conta ainda não foi liberada pra usar o app. Entre em contato com o administrador.' });
    return;
  }
  req.uid = decoded.uid;
  req.userEmail = email;
  next();
}

function isValidPastDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

// Pedido de acesso: chamada logo depois do cadastro no Firebase Auth, antes
// de a conta estar na allowlist — por isso usa verifyToken direto, sem passar
// por requireAuth/isEmailAllowed. Precisa ficar definida antes do
// app.use('/api', requireAuth) abaixo, senão cairia no bloqueio de allowlist
// antes de chegar aqui.
app.post('/api/access-requests', async (req, res) => {
  const decoded = await verifyToken(req, res);
  if (!decoded) return;

  const { firstName, lastName, dateOfBirth } = req.body || {};
  if (!firstName || !firstName.trim() || !lastName || !lastName.trim() || !isValidPastDateString(dateOfBirth)) {
    res.status(400).json({ error: 'Nome, sobrenome e data de nascimento (válida) são obrigatórios.' });
    return;
  }

  try {
    const uid = decoded.uid;
    const email = decoded.email || '';
    const token = crypto.randomBytes(24).toString('hex');
    await db.collection('accessRequests').doc(uid).set({
      uid,
      email,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      status: 'pending',
      token,
      createdAt: new Date().toISOString(),
      decidedAt: null
    });
    await sendAccessRequestEmail({ uid, email, firstName: firstName.trim(), lastName: lastName.trim(), dateOfBirth, token });
    res.json({ ok: true });
  } catch (err) {
    sendServerError(res, err, 'Não foi possível registrar o pedido de acesso.');
  }
});

function escHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderAdminPage(title, bodyHtml) {
  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 480px; margin: 60px auto; padding: 0 20px; color: #222; }
  h1 { font-size: 20px; }
  form { display: inline-block; margin: 16px 8px 0 0; }
  button { font-size: 15px; padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; }
  .approve { background: #1a5fb4; color: #fff; }
  .deny { background: #eee; color: #222; }
</style>
</head>
<body>
<h1>${escHtml(title)}</h1>
${bodyHtml}
</body>
</html>`;
}

// Mesma ideia de sendServerError, só que pras rotas HTML de admin (abertas
// direto de um link de e-mail, sem sessão do app) — loga o erro real no
// servidor e mostra uma página genérica, sem stack nem mensagem de driver.
function sendServerErrorPage(res, err, title, publicMessage) {
  console.error(title, err);
  res.status(500).send(renderAdminPage(title, `<p>${escHtml(publicMessage)}</p>`));
}

// Só mutação, sem checar token — usado pela rota autenticada do app (dono já
// verificado por requireOwner) e, por baixo, pelo fluxo por token do e-mail.
async function applyAccessDecision(uid, decision) {
  const ref = db.collection('accessRequests').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { outcome: 'not_found' };
  const data = snap.data();
  if (data.status !== 'pending') return { outcome: 'already_decided', data };

  await ref.set({ status: decision, decidedAt: new Date().toISOString() }, { merge: true });
  if (decision === 'approved') {
    const allowlistRef = db.collection('config').doc('allowlist');
    const allowlistSnap = await allowlistRef.get();
    const emails = allowlistSnap.exists ? allowlistSnap.data().emails || [] : [];
    const email = (data.email || '').toLowerCase();
    if (!emails.includes(email)) emails.push(email);
    await allowlistRef.set({ emails }, { merge: true });
  }
  return { outcome: 'decided', data: { ...data, status: decision } };
}

async function decideAccessRequestByToken(uid, token, decision) {
  const snap = await db.collection('accessRequests').doc(uid).get();
  if (!snap.exists || snap.data().token !== token) return { outcome: 'invalid' };
  return applyAccessDecision(uid, decision);
}

// Página de confirmação aberta a partir do link no e-mail — só mostra os
// dados e as ações possíveis, não muta nada sozinha (isso só acontece quando
// a pessoa efetivamente clica em "Sim"/"Não" aqui dentro). Fora de /api, por
// isso não passa pelo requireAuth: quem clica vem direto do cliente de
// e-mail, sem sessão nenhuma do app.
app.get('/admin/access-requests/:uid', async (req, res) => {
  const uid = req.params.uid;
  const token = String(req.query.token || '');
  try {
    const snap = await db.collection('accessRequests').doc(uid).get();
    if (!snap.exists || snap.data().token !== token) {
      res.status(403).send(renderAdminPage('Link inválido', '<p>Esse link não é válido.</p>'));
      return;
    }
    const data = snap.data();
    if (data.status !== 'pending') {
      const label = data.status === 'approved' ? 'aprovado' : 'recusado';
      res.send(renderAdminPage('Pedido já decidido', `<p>Esse pedido já foi <strong>${label}</strong> em ${escHtml(data.decidedAt)}.</p>`));
      return;
    }
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const qs = `?token=${encodeURIComponent(token)}`;
    res.send(renderAdminPage('Pedido de acesso', `
      <ul>
        <li><strong>Nome:</strong> ${escHtml(fullName)}</li>
        <li><strong>E-mail:</strong> ${escHtml(data.email)}</li>
        <li><strong>Data de nascimento:</strong> ${escHtml(data.dateOfBirth)}</li>
      </ul>
      <form method="POST" action="/admin/access-requests/${encodeURIComponent(uid)}/approve${qs}">
        <button type="submit" class="approve">Sim, liberar acesso</button>
      </form>
      <form method="POST" action="/admin/access-requests/${encodeURIComponent(uid)}/deny${qs}">
        <button type="submit" class="deny">Não, recusar</button>
      </form>
    `));
  } catch (err) {
    sendServerErrorPage(res, err, 'Erro', 'Ocorreu um erro ao carregar esse pedido. Tente novamente mais tarde.');
  }
});

async function handleEmailDecision(req, res, decision) {
  const uid = req.params.uid;
  const token = String(req.query.token || '');
  try {
    const result = await decideAccessRequestByToken(uid, token, decision);
    if (result.outcome === 'invalid') {
      res.status(403).send(renderAdminPage('Link inválido', '<p>Esse link não é válido.</p>'));
      return;
    }
    if (result.outcome === 'not_found') {
      res.status(404).send(renderAdminPage('Não encontrado', '<p>Esse pedido não existe (mais).</p>'));
      return;
    }
    if (result.outcome === 'already_decided') {
      res.send(renderAdminPage('Pedido já decidido', '<p>Esse pedido já tinha sido decidido antes — nada mudou.</p>'));
      return;
    }
    const fullName = `${result.data.firstName} ${result.data.lastName}`.trim();
    res.send(renderAdminPage(
      decision === 'approved' ? 'Acesso liberado' : 'Pedido recusado',
      `<p>${escHtml(fullName)} ${decision === 'approved' ? 'já pode usar o app.' : 'não foi liberado(a) — nada foi feito na conta.'}</p>`
    ));
  } catch (err) {
    sendServerErrorPage(res, err, 'Erro', 'Ocorreu um erro ao processar essa decisão. Tente novamente mais tarde.');
  }
}

app.post('/admin/access-requests/:uid/approve', (req, res) => handleEmailDecision(req, res, 'approved'));
app.post('/admin/access-requests/:uid/deny', (req, res) => handleEmailDecision(req, res, 'denied'));

app.use('/api', requireAuth);

// Rotas /api/admin/* — só o dono do app, verificado depois de requireAuth
// (então tanto autenticado+liberado quanto dono, nessa ordem).
function requireOwner(req, res, next) {
  if (req.userEmail !== OWNER_EMAIL) {
    res.status(403).json({ error: 'Acesso restrito.' });
    return;
  }
  next();
}

app.use('/api/admin', requireOwner);

app.get('/api/admin/access-requests', async (req, res) => {
  try {
    const snap = await db.collection('accessRequests').orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map(doc => doc.data()));
  } catch (err) {
    sendServerError(res, err, 'Não foi possível carregar os pedidos de acesso.');
  }
});

app.post('/api/admin/access-requests/:uid/decide', async (req, res) => {
  const { decision } = req.body || {};
  if (decision !== 'approved' && decision !== 'denied') {
    res.status(400).json({ error: 'Decisão inválida.' });
    return;
  }
  try {
    const result = await applyAccessDecision(req.params.uid, decision);
    if (result.outcome === 'not_found') {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    res.json({ ok: true, outcome: result.outcome });
  } catch (err) {
    sendServerError(res, err, 'Não foi possível processar a decisão.');
  }
});

app.get('/api/admin/feedback', async (req, res) => {
  try {
    const snap = await db.collection('feedback').orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const insightsSnap = await db.collection('config').doc('feedbackInsights').get();
    res.json({ items, insights: insightsSnap.exists ? insightsSnap.data() : null });
  } catch (err) {
    sendServerError(res, err, 'Não foi possível carregar o feedback.');
  }
});

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
    sendServerError(res, err, 'Não foi possível ler o banco de dados.');
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
    sendServerError(res, err, 'Falha ao salvar o banco de dados.');
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
    sendServerError(res, err, 'Não foi possível importar o PDF.');
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
  const { jobDescription, fileName } = req.body || {};
  if (!jobDescription || !jobDescription.trim()) {
    res.status(400).json({ error: 'Cole a descrição da vaga antes de gerar.' });
    return;
  }

  try {
    const database = await getOrCreateDatabase(req.uid, req.userEmail);
    const { resolved, meta } = await generateResumeData(database, jobDescription);
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
    sendServerError(res, err, 'Não foi possível gerar o currículo.');
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
    sendServerError(res, err, 'Não foi possível listar os currículos.');
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
    sendServerError(res, err, 'Não foi possível carregar esse currículo.');
  }
});

app.delete('/api/resumes/:slug', async (req, res) => {
  const slug = path.basename(req.params.slug);
  try {
    await resumesCollection(req.uid).doc(slug).delete();
    await bucket.file(`resumes/${req.uid}/${slug}.pdf`).delete({ ignoreNotFound: true });
    res.json({ ok: true });
  } catch (err) {
    sendServerError(res, err, 'Não foi possível excluir esse currículo.');
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
    sendServerError(res, err, 'Falha ao salvar o currículo.');
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
    sendServerError(res, err, 'Não foi possível importar o PDF.');
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
    sendServerError(res, err, 'Não foi possível traduzir esse currículo.');
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
    sendServerError(res, err, 'Não foi possível gerar o roteiro.');
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
    sendServerError(res, err, 'Não foi possível gerar a carta de apresentação.');
  }
});

// Evita duas regenerações do plano de feedback rodando ao mesmo tempo se dois
// envios chegarem próximos — a próxima chamada só roda depois que essa
// terminar (não enfileira, só ignora: o próximo feedback novo já dispara de
// novo, então não faz falta empilhar).
let feedbackRegenerating = false;

// Checagem de sanidade contra resposta degenerada da IA (ex: já vimos ela
// devolver algo tipo summary "teste" e suggestedActions ["a", "b"] — um
// resultado que passa na validação de schema mas não é uma análise de
// verdade). Sem isso, um resultado assim seria salvo como se fosse válido.
function looksLikeRealInsights(summary, suggestedActions) {
  if (typeof summary !== 'string' || summary.trim().length < 30) return false;
  if (!Array.isArray(suggestedActions) || suggestedActions.length === 0) return false;
  if (suggestedActions.some(action => typeof action !== 'string' || action.trim().length < 8)) return false;
  return true;
}

async function regenerateFeedbackInsights() {
  if (feedbackRegenerating) return;
  feedbackRegenerating = true;
  try {
    const snap = await db.collection('feedback').orderBy('createdAt', 'asc').get();
    const items = snap.docs.map(doc => doc.data());
    if (items.length === 0) return;
    const { summary, suggestedActions } = await summarizeFeedback(items);
    if (!looksLikeRealInsights(summary, suggestedActions)) {
      // Loga o resultado bruto pra dar pra investigar depois pelos logs do
      // Render, já que não sobrescrevemos o plano anterior com isso.
      console.error('Resultado da IA pra insights de feedback parece inválido:', JSON.stringify({ summary, suggestedActions }));
      throw new Error('A IA devolveu uma resposta que não parece uma análise válida — mantendo o plano anterior.');
    }
    await db.collection('config').doc('feedbackInsights').set({
      summary,
      suggestedActions,
      basedOnCount: items.length,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    // merge:true de propósito: se já existia um plano bom, ele fica — só
    // soma o aviso de que a última tentativa falhou, em vez de apagar o que
    // já funcionava.
    await db.collection('config').doc('feedbackInsights').set(
      { lastError: err.message, updatedAt: new Date().toISOString() },
      { merge: true }
    ).catch(() => {});
  } finally {
    feedbackRegenerating = false;
  }
}

app.post('/api/feedback', async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Escreva algo antes de enviar.' });
    return;
  }
  if (message.trim().length > 2000) {
    res.status(400).json({ error: 'Feedback muito longo (máximo 2000 caracteres).' });
    return;
  }
  try {
    await db.collection('feedback').add({
      uid: req.uid,
      email: req.userEmail,
      message: message.trim(),
      createdAt: new Date().toISOString()
    });
    // Não espera a IA terminar de regenerar o plano — quem mandou o feedback
    // não deve ficar preso esperando isso pra ver "Obrigado!" na tela.
    regenerateFeedbackInsights().catch(err => console.error('Falha ao regenerar insights de feedback:', err.message));
    res.json({ ok: true });
  } catch (err) {
    sendServerError(res, err, 'Não foi possível salvar o feedback.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  if (process.platform === 'win32') {
    exec(`start "" http://localhost:${PORT}`);
  }
});
