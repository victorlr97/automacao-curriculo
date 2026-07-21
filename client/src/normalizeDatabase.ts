import type { ProfileDatabase } from './types';

/** Garante que todos os campos existam, no formato atual — cobre bancos
 * salvos em versões anteriores do schema (ex.: `education` como objeto único
 * em vez de lista). Espelha `normalizeDatabase` do app.js original. */
export function normalizeDatabase(raw: ProfileDatabase): ProfileDatabase {
  const db = { ...raw };
  const personal = db.personal || ({} as ProfileDatabase['personal']);

  db.personal = {
    name: personal.name || '',
    location: personal.location || '',
    phone: personal.phone || '',
    email: personal.email || '',
    github: personal.github || '',
    linkedin: personal.linkedin || '',
    age: personal.age || 0
  };

  db.background_facts = db.background_facts || [];

  db.experience = (db.experience || []).map(exp => ({
    company: exp.company || '',
    location: exp.location || '',
    role: exp.role || '',
    period: exp.period || '',
    facts: exp.facts || []
  }));

  db.projects = (db.projects || []).map(proj => ({
    id: proj.id || '',
    name: proj.name || '',
    stack: proj.stack || [],
    facts: proj.facts || []
  }));

  db.skills = db.skills || [];

  const rawEducation = db.education as unknown;
  db.education = Array.isArray(rawEducation)
    ? rawEducation
    : rawEducation && typeof rawEducation === 'object'
      ? [rawEducation as ProfileDatabase['education'][number]]
      : [];
  db.education = db.education.map(edu => ({ institution: edu.institution || '', period: edu.period || '', degree: edu.degree || '' }));

  db.additional_education = (db.additional_education || []).map(ed => ({
    institution: ed.institution || '',
    description: ed.description || ''
  }));

  db.languages = (db.languages || []).map(l => ({ name: l.name || '', level: l.level || '' }));

  const portfolio = db.portfolio || ({} as ProfileDatabase['portfolio']);
  db.portfolio = {
    github: portfolio.github || '',
    behance: portfolio.behance || '',
    behance_note: portfolio.behance_note || ''
  };

  return db;
}

export function databaseHasContent(db: ProfileDatabase): boolean {
  return Boolean(db.personal?.name || db.experience.length || db.projects.length || db.skills.length);
}

export function blankDatabase(): ProfileDatabase {
  return {
    personal: { name: '', age: 0, location: '', phone: '', email: '', github: '', linkedin: '' },
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
