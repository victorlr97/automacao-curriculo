import { auth } from './lib/firebase';
import type {
  ApiErrorBody,
  GenerateResumeResponse,
  ImportResumeResponse,
  ProfileDatabase,
  ResolvedResume,
  ResumeListItem,
  TranslateResumeResponse,
  UpdateResumeResponse
} from './types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(await authHeaders()), ...(init.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiErrorBody).error || 'Erro desconhecido.');
  return data as T;
}

function postJson<T>(url: string, body: unknown): Promise<T> {
  return requestJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function putJson<T>(url: string, body: unknown): Promise<T> {
  return requestJson<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ---------- Banco de dados (Editor do Banco) ----------

export function getDatabase(): Promise<ProfileDatabase> {
  return requestJson('/api/database');
}

export function saveDatabase(db: ProfileDatabase): Promise<{ ok: true }> {
  return putJson('/api/database', db);
}

export function importDatabaseFromPdf(file: File): Promise<ProfileDatabase> {
  const formData = new FormData();
  formData.append('resume', file);
  return requestJson('/api/database/import', { method: 'POST', body: formData });
}

// ---------- Gerar currículo ----------

export interface GenerateResumePayload {
  jobDescription: string;
  videoInstructions: string;
  fileName: string;
}

export function generateResume(payload: GenerateResumePayload): Promise<GenerateResumeResponse> {
  return postJson('/api/resumes/generate', payload);
}

// ---------- Meus Currículos ----------

export function getResumes(): Promise<ResumeListItem[]> {
  return requestJson('/api/resumes');
}

export function deleteResume(slug: string): Promise<{ ok: true }> {
  return requestJson(`/api/resumes/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

// "education" passou de objeto único pra lista (pra suportar graduação +
// pós-graduação, mestrado etc). Normaliza currículos salvos antes dessa
// mudança, ainda no formato antigo.
function normalizeResolvedResume(data: ResolvedResume): ResolvedResume {
  const rawEducation = data.education as unknown;
  const education = Array.isArray(rawEducation)
    ? rawEducation
    : rawEducation && typeof rawEducation === 'object'
      ? [rawEducation as ResolvedResume['education'][number]]
      : [];
  return { ...data, education, additionalEducation: data.additionalEducation || [], coverLetter: data.coverLetter || '' };
}

/** Busca o JSON estruturado do currículo (Firestore, por slug). Lança se não existir. */
export async function getResumeJson(slug: string): Promise<ResolvedResume> {
  const data = await requestJson<ResolvedResume>(`/api/resumes/${encodeURIComponent(slug)}/json`);
  return normalizeResolvedResume(data);
}

export function updateResume(slug: string, data: ResolvedResume & { fileName: string }): Promise<UpdateResumeResponse> {
  return putJson(`/api/resumes/${encodeURIComponent(slug)}`, data);
}

export function importResumeFromPdf(file: File, fileName: string): Promise<ImportResumeResponse> {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('fileName', fileName);
  return requestJson('/api/resumes/import', { method: 'POST', body: formData });
}

export function translateResume(slug: string): Promise<TranslateResumeResponse> {
  return requestJson(`/api/resumes/${encodeURIComponent(slug)}/translate`, { method: 'POST' });
}

export function generateScript(slug: string, videoInstructions: string): Promise<{ presentationScript: string }> {
  return postJson(`/api/resumes/${encodeURIComponent(slug)}/script`, { videoInstructions });
}

export function generateCoverLetter(slug: string): Promise<{ coverLetter: string }> {
  return postJson(`/api/resumes/${encodeURIComponent(slug)}/cover-letter`, {});
}
