let dbState = null;
let editorLoaded = false;
let currentProfileId = null;
let profiles = [];

// ---------- Perfis ----------

function api(pathSuffix) {
  return `/api/profiles/${encodeURIComponent(currentProfileId)}${pathSuffix}`;
}

function populateProfileSelect() {
  const select = document.getElementById('profile-select');
  select.innerHTML = '';
  profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === currentProfileId) opt.selected = true;
    select.appendChild(opt);
  });
  document.getElementById('btn-delete-profile').disabled = profiles.length <= 1;
}

function applyActiveProfile() {
  const active = profiles.find(p => p.id === currentProfileId);
  document.title = active ? `Gerador de Currículo — ${active.name}` : 'Gerador de Currículo';
  document.querySelector('.app-header h1').textContent = active ? `Gerador de Currículo — ${active.name}` : 'Gerador de Currículo';
}

async function loadProfiles(preferredId) {
  const statusEl = document.getElementById('profile-status');
  try {
    const res = await fetch('/api/profiles');
    const items = await res.json();
    if (!res.ok) throw new Error(items.error || 'Erro desconhecido.');
    profiles = items;

    if (!profiles.length) {
      statusEl.textContent = 'Nenhum perfil encontrado. Crie um perfil pra começar.';
      statusEl.className = 'status error';
      currentProfileId = null;
      document.getElementById('profile-select').innerHTML = '';
      document.getElementById('btn-delete-profile').disabled = true;
      return;
    }

    statusEl.textContent = '';
    statusEl.className = 'status';
    const desired = preferredId && profiles.some(p => p.id === preferredId) ? preferredId : profiles[0].id;
    currentProfileId = desired;
    localStorage.setItem('activeProfileId', currentProfileId);
    populateProfileSelect();
    applyActiveProfile();
  } catch (err) {
    statusEl.textContent = `Erro ao carregar perfis: ${err.message}`;
    statusEl.className = 'status error';
  }
}

// Recarrega tudo que depende do perfil ativo — chamado toda vez que o
// usuário troca de perfil, cria um novo ou exclui o atual.
function refreshForProfileChange() {
  editorLoaded = false;
  dbState = null;
  document.getElementById('result-panel').classList.add('hidden');
  document.getElementById('outputs-preview-panel').classList.add('hidden');
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  if (activeTab === 'editor') loadDatabase();
  if (activeTab === 'outputs') loadResumesList();
}

document.getElementById('profile-select').addEventListener('change', e => {
  currentProfileId = e.target.value;
  localStorage.setItem('activeProfileId', currentProfileId);
  applyActiveProfile();
  refreshForProfileChange();
});

function showNewProfileModal() {
  document.getElementById('new-profile-name').value = '';
  document.getElementById('new-profile-status').textContent = '';
  document.getElementById('new-profile-modal').classList.remove('hidden');
  document.getElementById('new-profile-name').focus();
}

function hideNewProfileModal() {
  document.getElementById('new-profile-modal').classList.add('hidden');
}

document.getElementById('btn-new-profile').addEventListener('click', showNewProfileModal);
document.getElementById('btn-new-profile-cancel').addEventListener('click', hideNewProfileModal);

document.getElementById('new-profile-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-new-profile-confirm').click(); }
  if (e.key === 'Escape') { e.preventDefault(); hideNewProfileModal(); }
});

document.getElementById('btn-new-profile-confirm').addEventListener('click', async () => {
  const name = document.getElementById('new-profile-name').value.trim();
  const statusEl = document.getElementById('new-profile-status');
  if (!name) {
    statusEl.textContent = 'Informe um nome.';
    statusEl.className = 'status error';
    return;
  }
  statusEl.textContent = 'Criando...';
  statusEl.className = 'status';
  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    hideNewProfileModal();
    await loadProfiles(data.id);
    refreshForProfileChange();
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  }
});

document.getElementById('btn-delete-profile').addEventListener('click', async () => {
  const active = profiles.find(p => p.id === currentProfileId);
  if (!active) return;
  if (!confirm(`Excluir o perfil "${active.name}"? Isso apaga o banco de dados e todos os currículos gerados dele. Essa ação não pode ser desfeita.`)) return;

  const statusEl = document.getElementById('profile-status');
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(currentProfileId)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    await loadProfiles();
    refreshForProfileChange();
  } catch (err) {
    statusEl.textContent = `Erro ao excluir perfil: ${err.message}`;
    statusEl.className = 'status error';
  }
});

// ---------- DOM helpers ----------

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  });
  [].concat(children).forEach(child => {
    if (child === null || child === undefined) return;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

function detailsBlock(titleText, onRemove) {
  const summaryChildren = [h('span', { class: 'subcard-title' }, [h('span', { class: 'chevron' }, '▸'), ' ' + titleText])];
  if (onRemove) {
    summaryChildren.push(h('button', {
      class: 'btn-remove',
      onclick: e => { e.preventDefault(); e.stopPropagation(); onRemove(); }
    }, 'Remover'));
  }
  const details = h('details', { class: 'subcard' });
  details.appendChild(h('summary', { class: 'subcard-header' }, summaryChildren));
  return details;
}

function field(labelText, value, onInput, opts = {}) {
  const wrap = h('label', { class: 'field' }, [h('span', {}, labelText)]);
  const tag = opts.textarea ? 'textarea' : 'input';
  const input = h(tag, opts.textarea ? { rows: String(opts.rows || 3) } : { type: opts.type || 'text' });
  input.value = value ?? '';
  input.addEventListener('input', e => onInput(e.target.value));
  wrap.appendChild(input);
  return wrap;
}

function linesField(labelText, items, onChange, rows) {
  return field(labelText, (items || []).join('\n'), v => {
    onChange(v.split('\n').map(s => s.trim()).filter(Boolean));
  }, { textarea: true, rows: rows || 6 });
}

// ---------- Normalização do banco (garante que campos existam) ----------

function ensure(obj, key, defaultVal) {
  if (obj[key] === undefined || obj[key] === null) obj[key] = defaultVal;
  return obj[key];
}

function normalizeDatabase(db) {
  db.personal = db.personal || {};
  ['name', 'location', 'phone', 'email', 'github', 'linkedin'].forEach(k => ensure(db.personal, k, ''));
  ensure(db.personal, 'age', 0);

  db.background_facts = db.background_facts || [];

  db.experience = db.experience || [];
  db.experience.forEach(exp => {
    exp.company = exp.company || '';
    exp.location = exp.location || '';
    exp.role = exp.role || '';
    exp.period = exp.period || '';
    exp.facts = exp.facts || [];
  });

  db.projects = db.projects || [];
  db.projects.forEach(proj => {
    proj.id = proj.id || '';
    proj.name = proj.name || '';
    proj.stack = proj.stack || [];
    proj.facts = proj.facts || [];
  });

  db.skills = db.skills || [];

  // "education" era um objeto único; agora é lista (pra suportar graduação +
  // pós-graduação, mestrado etc). Converte dados salvos no formato antigo.
  if (!Array.isArray(db.education)) {
    db.education = (db.education && (db.education.institution || db.education.degree || db.education.period))
      ? [db.education] : [];
  }
  db.education.forEach(edu => { ensure(edu, 'institution', ''); ensure(edu, 'period', ''); ensure(edu, 'degree', ''); });

  db.additional_education = db.additional_education || [];
  db.additional_education.forEach(ed => { ensure(ed, 'institution', ''); ensure(ed, 'description', ''); });

  db.languages = db.languages || [];
  db.languages.forEach(l => { ensure(l, 'name', ''); ensure(l, 'level', ''); });

  db.portfolio = db.portfolio || {};
  ensure(db.portfolio, 'github', '');
  ensure(db.portfolio, 'behance', '');
  ensure(db.portfolio, 'behance_note', '');

  return db;
}

// ---------- Seções do editor ----------

function renderPersonalSection() {
  const p = dbState.personal;
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Dados Pessoais')]);
  const grid = h('div', { class: 'field-grid' });
  grid.appendChild(field('Nome', p.name, v => p.name = v));
  grid.appendChild(field('Idade', p.age, v => p.age = Number(v) || 0, { type: 'number' }));
  grid.appendChild(field('Localização', p.location, v => p.location = v));
  grid.appendChild(field('Telefone', p.phone, v => p.phone = v));
  grid.appendChild(field('Email', p.email, v => p.email = v));
  grid.appendChild(field('GitHub', p.github, v => p.github = v));
  grid.appendChild(field('LinkedIn', p.linkedin, v => p.linkedin = v));
  card.appendChild(grid);
  return card;
}

function renderBackgroundSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Sobre Mim')]);
  const hint = h('p', { class: 'status' }, 'Fatos brutos sobre sua trajetória — um por linha. A IA usa esses fatos pra escrever um objetivo profissional novo a cada vaga, nunca um texto pronto.');
  card.appendChild(hint);
  card.appendChild(linesField('Fatos (um por linha)', dbState.background_facts, v => { dbState.background_facts = v; }, 10));
  return card;
}

function renderExperienceSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Experiências')]);

  dbState.experience.forEach((exp, idx) => {
    const block = detailsBlock(exp.company || `Experiência ${idx + 1}`, () => {
      dbState.experience.splice(idx, 1);
      renderEditor();
    });

    const grid = h('div', { class: 'field-grid' });
    grid.appendChild(field('Empresa', exp.company, v => exp.company = v));
    grid.appendChild(field('Local', exp.location, v => exp.location = v));
    grid.appendChild(field('Cargo', exp.role, v => exp.role = v));
    grid.appendChild(field('Período', exp.period, v => exp.period = v));
    block.appendChild(grid);

    block.appendChild(linesField('Fatos (um por linha)', exp.facts, v => { exp.facts = v; }));

    card.appendChild(block);
  });

  card.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => {
      dbState.experience.push({ company: '', location: '', role: '', period: '', facts: [] });
      renderEditor();
    }
  }, '+ Adicionar experiência'));

  return card;
}

function renderProjectsSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Projetos')]);

  dbState.projects.forEach((proj, idx) => {
    const block = detailsBlock(proj.name || `Projeto ${idx + 1}`, () => {
      dbState.projects.splice(idx, 1);
      renderEditor();
    });

    const topGrid = h('div', { class: 'field-grid' });
    topGrid.appendChild(field('ID', proj.id, v => proj.id = v));
    topGrid.appendChild(field('Nome', proj.name, v => proj.name = v));
    block.appendChild(topGrid);

    block.appendChild(field('Stack (separado por vírgula)', proj.stack.join(', '), v => {
      proj.stack = v.split(',').map(s => s.trim()).filter(Boolean);
    }));
    block.appendChild(linesField('Fatos (um por linha)', proj.facts, v => { proj.facts = v; }));

    card.appendChild(block);
  });

  card.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => {
      dbState.projects.push({ id: '', name: '', stack: [], facts: [] });
      renderEditor();
    }
  }, '+ Adicionar projeto'));

  return card;
}

function renderSkillsSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Habilidades')]);
  const hint = h('p', { class: 'status' }, 'Lista única com todas as habilidades (design e dev misturadas) — a IA escolhe as relevantes pra cada vaga.');
  card.appendChild(hint);
  card.appendChild(linesField('Uma habilidade por linha', dbState.skills, v => { dbState.skills = v; }, 14));
  return card;
}

function renderEducationSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Formação')]);
  const hint = h('p', { class: 'status' }, 'Graduação, pós-graduação, mestrado etc — uma entrada por diploma/título. Todos aparecem no currículo, sem filtro por vaga.');
  card.appendChild(hint);

  dbState.education.forEach((edu, idx) => {
    const block = detailsBlock(edu.institution || `Formação ${idx + 1}`, () => {
      dbState.education.splice(idx, 1);
      renderEditor();
    });
    const grid = h('div', { class: 'field-grid' });
    grid.appendChild(field('Instituição', edu.institution, v => edu.institution = v));
    grid.appendChild(field('Período', edu.period, v => edu.period = v));
    grid.appendChild(field('Curso', edu.degree, v => edu.degree = v));
    block.appendChild(grid);
    card.appendChild(block);
  });

  card.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { dbState.education.push({ institution: '', period: '', degree: '' }); renderEditor(); }
  }, '+ Adicionar formação'));

  return card;
}

function renderAdditionalEducationSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Formação Complementar')]);
  const hint = h('p', { class: 'status' }, 'Cursos, certificações ou formação continuada além da sua graduação/pós principal — aparece numa seção separada no currículo.');
  card.appendChild(hint);

  dbState.additional_education.forEach((ed, idx) => {
    const block = detailsBlock(ed.institution || `Curso ${idx + 1}`, () => {
      dbState.additional_education.splice(idx, 1);
      renderEditor();
    });
    block.appendChild(field('Instituição', ed.institution, v => ed.institution = v));
    block.appendChild(field('Descrição (curso, tema)', ed.description, v => ed.description = v, { textarea: true, rows: 2 }));
    card.appendChild(block);
  });

  card.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { dbState.additional_education.push({ institution: '', description: '' }); renderEditor(); }
  }, '+ Adicionar curso'));

  return card;
}

function renderLanguagesSection() {
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Idiomas')]);
  dbState.languages.forEach((lang, idx) => {
    const block = detailsBlock(lang.name || `Idioma ${idx + 1}`, () => {
      dbState.languages.splice(idx, 1);
      renderEditor();
    });
    const grid = h('div', { class: 'field-grid' });
    grid.appendChild(field('Nome', lang.name, v => lang.name = v));
    grid.appendChild(field('Nível', lang.level, v => lang.level = v));
    block.appendChild(grid);
    card.appendChild(block);
  });
  card.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { dbState.languages.push({ name: '', level: '' }); renderEditor(); }
  }, '+ Adicionar idioma'));
  return card;
}

function renderPortfolioSection() {
  const p = dbState.portfolio;
  const card = h('div', { class: 'card' }, [h('h3', {}, 'Portfólio')]);
  const grid = h('div', { class: 'field-grid' });
  grid.appendChild(field('GitHub', p.github, v => p.github = v));
  grid.appendChild(field('Behance', p.behance, v => p.behance = v));
  card.appendChild(grid);
  card.appendChild(field('Nota do Behance', p.behance_note, v => p.behance_note = v));
  return card;
}

const EDITOR_SECTIONS = [
  { key: 'personal', label: 'Dados Pessoais', render: renderPersonalSection },
  { key: 'background', label: 'Sobre Mim', render: renderBackgroundSection },
  { key: 'experience', label: 'Experiências', render: renderExperienceSection, count: () => dbState.experience.length },
  { key: 'projects', label: 'Projetos', render: renderProjectsSection, count: () => dbState.projects.length },
  { key: 'skills', label: 'Habilidades', render: renderSkillsSection, count: () => dbState.skills.length },
  { key: 'education', label: 'Formação', render: renderEducationSection, count: () => dbState.education.length },
  { key: 'additionalEducation', label: 'Formação Complementar', render: renderAdditionalEducationSection, count: () => dbState.additional_education.length },
  { key: 'languages', label: 'Idiomas', render: renderLanguagesSection, count: () => dbState.languages.length },
  { key: 'portfolio', label: 'Portfólio', render: renderPortfolioSection }
];

let activeEditorSection = EDITOR_SECTIONS[0].key;

function renderEditorNav() {
  const nav = document.getElementById('editor-nav');
  nav.innerHTML = '';
  EDITOR_SECTIONS.forEach(section => {
    const btn = h('button', {
      class: `editor-nav-item${section.key === activeEditorSection ? ' active' : ''}`,
      onclick: () => {
        activeEditorSection = section.key;
        renderEditorNav();
        renderEditorContent();
      }
    }, [section.label]);
    if (section.count) {
      btn.appendChild(h('span', { class: 'count' }, String(section.count())));
    }
    nav.appendChild(btn);
  });
}

function renderEditorContent() {
  const root = document.getElementById('editor-root');
  root.innerHTML = '';
  const section = EDITOR_SECTIONS.find(s => s.key === activeEditorSection);
  root.appendChild(section.render());
}

function renderEditor() {
  renderEditorNav();
  renderEditorContent();
}

async function loadDatabase() {
  const res = await fetch(api('/database'));
  const data = await res.json();
  dbState = normalizeDatabase(data);
  activeEditorSection = EDITOR_SECTIONS[0].key;
  renderEditor();
  editorLoaded = true;
}

// ---------- Wiring: Editor toolbar ----------

document.getElementById('btn-save-db').addEventListener('click', async () => {
  const statusEl = document.getElementById('editor-status');
  statusEl.textContent = 'Salvando...';
  statusEl.className = 'status';
  try {
    const res = await fetch(api('/database'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbState)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    statusEl.textContent = 'Alterações salvas com sucesso.';
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  }
});

document.getElementById('btn-reload-db').addEventListener('click', () => {
  loadDatabase();
  document.getElementById('editor-status').textContent = 'Alterações descartadas — dados recarregados do arquivo.';
  document.getElementById('editor-status').className = 'status';
});

function databaseHasContent(db) {
  return Boolean((db.personal && db.personal.name) || db.experience.length || db.projects.length || db.skills.length);
}

document.getElementById('db-import-file-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('db-import-status');

  if (dbState && databaseHasContent(dbState)) {
    const proceed = confirm('Isso substitui os dados abertos no editor pelos fatos extraídos do PDF (nada é salvo em disco ainda — dá pra revisar e descartar depois). Continuar?');
    if (!proceed) { e.target.value = ''; return; }
  }

  statusEl.textContent = 'Extraindo fatos do PDF... (pode levar até 1 minuto)';
  statusEl.className = 'status';
  try {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await fetch(api('/database/import'), { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');

    dbState = normalizeDatabase(data);
    activeEditorSection = EDITOR_SECTIONS[0].key;
    renderEditor();
    editorLoaded = true;
    statusEl.textContent = `Extraído do PDF: ${dbState.experience.length} experiência(s), ${dbState.projects.length} projeto(s), ${dbState.skills.length} habilidade(s). Revise os campos e clique em "Salvar alterações" pra confirmar.`;
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  } finally {
    e.target.value = '';
  }
});

// ---------- Wiring: Gerar Currículo ----------

document.getElementById('btn-generate').addEventListener('click', async () => {
  const jobDescription = document.getElementById('job-description').value.trim();
  const videoInstructions = document.getElementById('video-instructions-input').value.trim();
  const fileName = document.getElementById('file-name-input').value.trim();
  const statusEl = document.getElementById('generate-status');
  const btn = document.getElementById('btn-generate');

  if (!jobDescription) {
    statusEl.textContent = 'Cole a descrição da vaga primeiro.';
    statusEl.className = 'status error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Gerando... (geralmente 30-60s)';
  statusEl.textContent = '';
  statusEl.className = 'status';

  try {
    const res = await fetch(api('/generate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription, videoInstructions, fileName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    showResult(data);
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gerar PDF';
  }
});

function showResult(data) {
  document.getElementById('result-panel').classList.remove('hidden');
  document.getElementById('result-profile').textContent = data.profile;
  document.getElementById('result-language').textContent = data.language === 'en' ? 'Inglês' : 'Português';
  document.getElementById('result-projects').textContent = data.projectsChosen.join(', ');
  document.getElementById('result-summary').textContent = data.resumo;
  document.getElementById('result-download').href = data.pdfUrl;
  document.getElementById('result-preview').src = data.pdfUrl;

  const scriptBlock = document.getElementById('result-script-block');
  if (data.presentationScript) {
    scriptBlock.classList.remove('hidden');
    document.getElementById('result-script-text').textContent = data.presentationScript;
  } else {
    scriptBlock.classList.add('hidden');
  }
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  } catch (err) {
    alert('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
  }
}

document.getElementById('btn-copy-result-script').addEventListener('click', e => {
  copyToClipboard(document.getElementById('result-script-text').textContent, e.target);
});

// ---------- Wiring: Meus Currículos ----------

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function loadResumesList() {
  const root = document.getElementById('resumes-list');
  root.innerHTML = '';
  try {
    const res = await fetch(api('/resumes'));
    const items = await res.json();
    if (!res.ok) throw new Error(items.error || 'Erro desconhecido.');
    renderResumesList(items);
    return items;
  } catch (err) {
    root.appendChild(h('p', { class: 'status error' }, `Erro ao carregar: ${err.message}`));
    return [];
  }
}

async function loadResumesListAndSelect(slug) {
  const items = await loadResumesList();
  const idx = items.findIndex(it => it.slug === slug);
  if (idx === -1) return;
  const row = document.querySelectorAll('.resume-item')[idx];
  if (row) selectResume(items[idx], row);
}

function renderResumesList(items) {
  const root = document.getElementById('resumes-list');
  root.innerHTML = '';

  if (!items.length) {
    root.appendChild(h('p', { class: 'status' }, 'Nenhum currículo gerado ainda. Gere um na aba "Gerar Currículo".'));
    return;
  }

  items.forEach(item => {
    const row = h('div', { class: 'resume-item' }, [
      h('div', {
        onclick: () => selectResume(item, row)
      }, [
        h('div', { class: 'resume-item-title' }, item.title),
        h('div', { class: 'resume-item-meta' }, `${formatDateTime(item.generatedAt)} · ${item.language === 'en' ? 'Inglês' : 'Português'}`)
      ]),
      h('button', {
        class: 'resume-item-delete',
        onclick: async e => {
          e.stopPropagation();
          if (!confirm(`Excluir "${item.title}"? Essa ação não pode ser desfeita.`)) return;
          await fetch(api(`/resumes/${encodeURIComponent(item.slug)}`), { method: 'DELETE' });
          document.getElementById('outputs-preview-panel').classList.add('hidden');
          loadResumesList();
        }
      }, 'Excluir')
    ]);
    root.appendChild(row);
  });
}

let currentResumeItem = null;

function selectResume(item, rowEl) {
  document.querySelectorAll('.resume-item').forEach(el => el.classList.remove('active'));
  rowEl.classList.add('active');
  currentResumeItem = item;

  document.getElementById('outputs-preview-panel').classList.remove('hidden');
  document.getElementById('outputs-download').href = item.pdfUrl;
  document.getElementById('outputs-preview').src = item.pdfUrl;
  document.getElementById('outputs-preview').classList.remove('hidden');
  document.getElementById('resume-edit-form').classList.add('hidden');
  document.getElementById('resume-edit-form').innerHTML = '';
  document.getElementById('outputs-action-status').textContent = '';
  document.getElementById('btn-edit-resume').textContent = 'Editar';
  document.getElementById('btn-translate-resume').textContent =
    item.language === 'en' ? 'Traduzir para Português' : 'Traduzir para Inglês';

  const scriptBlock = document.getElementById('outputs-script-block');
  if (item.presentationScript) {
    scriptBlock.classList.remove('hidden');
    document.getElementById('outputs-script-text').textContent = item.presentationScript;
  } else {
    scriptBlock.classList.add('hidden');
  }
}

document.getElementById('btn-copy-outputs-script').addEventListener('click', e => {
  copyToClipboard(document.getElementById('outputs-script-text').textContent, e.target);
});

function showResumePreview() {
  document.getElementById('outputs-preview').classList.remove('hidden');
  document.getElementById('resume-edit-form').classList.add('hidden');
  document.getElementById('btn-edit-resume').textContent = 'Editar';
}

// ---------- Editar currículo já gerado ----------

let editingResumeData = null;
let editingFileName = '';
let editingVideoInstructions = '';

document.getElementById('btn-edit-resume').addEventListener('click', async () => {
  const editBtn = document.getElementById('btn-edit-resume');
  const formEl = document.getElementById('resume-edit-form');
  const statusEl = document.getElementById('outputs-action-status');

  if (!formEl.classList.contains('hidden')) {
    showResumePreview();
    return;
  }
  if (!currentResumeItem) return;

  statusEl.textContent = 'Carregando...';
  statusEl.className = 'status';
  try {
    const res = await fetch(currentResumeItem.pdfUrl.replace(/\.pdf$/, '.json'));
    if (!res.ok) {
      statusEl.textContent = '';
      statusEl.appendChild(h('span', {}, 'Esse currículo não tem dados estruturados salvos (foi adicionado como PDF, sem passar pelo sistema). '));
      statusEl.appendChild(h('button', {
        class: 'btn-secondary',
        onclick: repairAndEditResume
      }, 'Extrair conteúdo e editar'));
      return;
    }
    editingResumeData = await res.json();
    statusEl.textContent = '';
    document.getElementById('outputs-preview').classList.add('hidden');
    formEl.classList.remove('hidden');
    editBtn.textContent = 'Ver PDF';
    renderResumeEditForm();
  } catch (err) {
    statusEl.textContent = `Erro ao carregar: ${err.message}`;
    statusEl.className = 'status error';
  }
});

async function repairAndEditResume() {
  const statusEl = document.getElementById('outputs-action-status');
  statusEl.textContent = 'Extraindo conteúdo do PDF... (pode levar até 1 minuto)';
  statusEl.className = 'status';
  try {
    const res = await fetch(api(`/resumes/${encodeURIComponent(currentResumeItem.slug)}/repair`), { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    editingResumeData = data.resolved;
    statusEl.textContent = '';
    document.getElementById('outputs-preview').classList.add('hidden');
    document.getElementById('resume-edit-form').classList.remove('hidden');
    document.getElementById('btn-edit-resume').textContent = 'Ver PDF';
    renderResumeEditForm();
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  }
}

function renderResumeEditForm() {
  const d = editingResumeData;
  d.additionalEducation = d.additionalEducation || [];
  // "education" era um objeto único; currículos gerados antes dessa mudança
  // ainda podem ter esse formato antigo salvo em disco.
  if (!Array.isArray(d.education)) {
    d.education = (d.education && (d.education.institution || d.education.degree || d.education.period))
      ? [d.education] : [];
  }
  const root = document.getElementById('resume-edit-form');
  root.innerHTML = '';

  editingFileName = currentResumeItem.slug;
  const nameGrid = h('div', { class: 'field-grid' });
  nameGrid.appendChild(field('Nome do arquivo (PDF/JSON)', editingFileName, v => { editingFileName = v; }));
  root.appendChild(nameGrid);
  root.appendChild(h('p', { class: 'status' }, 'Se mudar o nome do arquivo, salva como um currículo novo (o original continua intacto). Se deixar igual, sobrescreve o mesmo arquivo.'));

  const grid = h('div', { class: 'field-grid' });
  grid.appendChild(field('Título (aparece no currículo)', d.title, v => d.title = v));
  root.appendChild(grid);
  root.appendChild(field('Objetivo', d.objective, v => d.objective = v, { textarea: true, rows: 5 }));
  root.appendChild(field('Texto de apresentação (vídeo, opcional)', d.presentationScript, v => d.presentationScript = v, { textarea: true, rows: 5 }));

  const scriptGenBlock = h('div', { class: 'subcard' });
  scriptGenBlock.appendChild(field('Instruções do vídeo (opcional)', editingVideoInstructions, v => { editingVideoInstructions = v; }, { textarea: true, rows: 3 }));
  const scriptGenStatus = h('p', { class: 'status' });
  const scriptGenBtn = h('button', {
    class: 'btn-secondary',
    onclick: async e => {
      e.preventDefault();
      scriptGenBtn.disabled = true;
      scriptGenBtn.textContent = 'Gerando roteiro... (pode levar até 1 minuto)';
      scriptGenStatus.textContent = '';
      scriptGenStatus.className = 'status';
      try {
        const res = await fetch(api(`/resumes/${encodeURIComponent(currentResumeItem.slug)}/script`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoInstructions: editingVideoInstructions })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
        d.presentationScript = data.presentationScript;
        renderResumeEditForm();
      } catch (err) {
        scriptGenStatus.textContent = `Erro: ${err.message}`;
        scriptGenStatus.className = 'status error';
      } finally {
        scriptGenBtn.disabled = false;
        scriptGenBtn.textContent = d.presentationScript ? 'Regenerar roteiro' : 'Gerar roteiro';
      }
    }
  }, d.presentationScript ? 'Regenerar roteiro' : 'Gerar roteiro');
  scriptGenBlock.appendChild(scriptGenBtn);
  scriptGenBlock.appendChild(scriptGenStatus);
  root.appendChild(scriptGenBlock);

  root.appendChild(h('h4', {}, 'Experiências'));
  d.experience.forEach((exp, idx) => {
    const block = detailsBlock(exp.company || `Experiência ${idx + 1}`, () => {
      d.experience.splice(idx, 1);
      renderResumeEditForm();
    });
    const g = h('div', { class: 'field-grid' });
    g.appendChild(field('Empresa', exp.company, v => exp.company = v));
    g.appendChild(field('Local', exp.location, v => exp.location = v));
    g.appendChild(field('Cargo', exp.role, v => exp.role = v));
    g.appendChild(field('Período', exp.period, v => exp.period = v));
    block.appendChild(g);
    block.appendChild(field('Descrição', exp.description, v => exp.description = v, { textarea: true }));
    root.appendChild(block);
  });
  root.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { d.experience.push({ company: '', location: '', role: '', period: '', description: '' }); renderResumeEditForm(); }
  }, '+ Adicionar experiência'));

  root.appendChild(h('h4', {}, 'Projetos'));
  d.projects.forEach((proj, idx) => {
    const block = detailsBlock(proj.name || `Projeto ${idx + 1}`, () => {
      d.projects.splice(idx, 1);
      renderResumeEditForm();
    });
    const g = h('div', { class: 'field-grid' });
    g.appendChild(field('Nome', proj.name, v => proj.name = v));
    g.appendChild(field('Cargo', proj.role, v => proj.role = v));
    block.appendChild(g);
    block.appendChild(field('Stack (separado por vírgula)', (proj.stack || []).join(', '), v => {
      proj.stack = v.split(',').map(s => s.trim()).filter(Boolean);
    }));
    block.appendChild(field('Descrição', proj.description, v => proj.description = v, { textarea: true }));
    root.appendChild(block);
  });
  root.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { d.projects.push({ name: '', role: '', stack: [], description: '' }); renderResumeEditForm(); }
  }, '+ Adicionar projeto'));

  root.appendChild(h('h4', {}, 'Formação'));
  d.education.forEach((edu, idx) => {
    const block = detailsBlock(edu.institution || `Formação ${idx + 1}`, () => {
      d.education.splice(idx, 1);
      renderResumeEditForm();
    });
    const g = h('div', { class: 'field-grid' });
    g.appendChild(field('Instituição', edu.institution, v => edu.institution = v));
    g.appendChild(field('Curso', edu.degree, v => edu.degree = v));
    g.appendChild(field('Período', edu.period, v => edu.period = v));
    block.appendChild(g);
    root.appendChild(block);
  });
  root.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { d.education.push({ institution: '', degree: '', period: '' }); renderResumeEditForm(); }
  }, '+ Adicionar formação'));

  root.appendChild(h('h4', {}, 'Formação Complementar'));
  d.additionalEducation.forEach((ed, idx) => {
    const block = detailsBlock(ed.institution || `Curso ${idx + 1}`, () => {
      d.additionalEducation.splice(idx, 1);
      renderResumeEditForm();
    });
    block.appendChild(field('Instituição', ed.institution, v => ed.institution = v));
    block.appendChild(field('Descrição', ed.description, v => ed.description = v, { textarea: true, rows: 2 }));
    root.appendChild(block);
  });
  root.appendChild(h('button', {
    class: 'btn-add',
    onclick: () => { d.additionalEducation.push({ institution: '', description: '' }); renderResumeEditForm(); }
  }, '+ Adicionar curso'));

  root.appendChild(h('h4', {}, 'Habilidades'));
  root.appendChild(linesField('Uma por linha', d.skills, v => { d.skills = v; }, 8));

  root.appendChild(h('h4', {}, 'Idiomas'));
  d.languages.forEach((lang, idx) => {
    const g = h('div', { class: 'field-grid' });
    g.appendChild(field('Nome', lang.name, v => lang.name = v));
    g.appendChild(field('Nível', lang.level, v => lang.level = v));
    root.appendChild(g);
  });

  root.appendChild(h('button', {
    class: 'btn-primary',
    onclick: saveResumeEdits
  }, 'Salvar e Regenerar PDF'));
}

async function saveResumeEdits() {
  const statusEl = document.getElementById('outputs-action-status');
  statusEl.textContent = 'Salvando e gerando PDF...';
  statusEl.className = 'status';
  // Libera o PDF atual da pré-visualização antes de sobrescrever o arquivo,
  // pra reduzir a chance do navegador ainda estar com ele aberto/travado.
  document.getElementById('outputs-preview').src = 'about:blank';
  try {
    const res = await fetch(api(`/resumes/${encodeURIComponent(currentResumeItem.slug)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingResumeData, fileName: editingFileName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    const savedAsNew = data.slug !== currentResumeItem.slug;
    await loadResumesListAndSelect(data.slug);
    const finalStatusEl = document.getElementById('outputs-action-status');
    finalStatusEl.textContent = savedAsNew
      ? `Salvo como um novo arquivo: "${data.slug}" (o original continua intacto).`
      : 'Salvo! PDF atualizado.';
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  }
}

// ---------- Traduzir currículo ----------

document.getElementById('btn-translate-resume').addEventListener('click', async () => {
  if (!currentResumeItem) return;
  const btn = document.getElementById('btn-translate-resume');
  const statusEl = document.getElementById('outputs-action-status');
  const originalLabel = btn.textContent;

  btn.disabled = true;
  btn.textContent = 'Traduzindo... (pode levar até 1 minuto)';
  statusEl.textContent = '';

  try {
    const res = await fetch(api(`/resumes/${encodeURIComponent(currentResumeItem.slug)}/translate`), { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    statusEl.textContent = `Traduzido com sucesso: "${data.title}"`;
    await loadResumesListAndSelect(data.slug);
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

// ---------- Importar currículo externo (PDF) ----------

document.getElementById('import-file-input').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('import-status');
  statusEl.textContent = 'Importando... (pode levar até 1 minuto)';
  statusEl.className = 'status';

  try {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('fileName', document.getElementById('import-file-name').value.trim());
    const res = await fetch(api('/resumes/import'), { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
    statusEl.textContent = `Importado: "${data.title}"`;
    await loadResumesListAndSelect(data.slug);
  } catch (err) {
    statusEl.textContent = `Erro: ${err.message}`;
    statusEl.className = 'status error';
  } finally {
    e.target.value = '';
    document.getElementById('import-file-name').value = '';
  }
});

// ---------- Wiring: Tabs ----------

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  if (tab === 'editor' && !editorLoaded) loadDatabase();
  if (tab === 'outputs') loadResumesList();
}

// ---------- Inicialização ----------

(async function init() {
  await loadProfiles(localStorage.getItem('activeProfileId'));
})();
