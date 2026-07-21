import type {
  ApiErrorBody,
  GenerateResumeResponse,
  ImportResumeResponse,
  Profile,
  ProfileDatabase,
  ResolvedResume,
  ResumeListItem,
  TranslateResumeResponse,
  UpdateResumeResponse
} from './types';

function profileUrl(profileId: string, suffix: string): string {
  return `/api/profiles/${encodeURIComponent(profileId)}${suffix}`;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

// ---------- Perfis ----------

export function getProfiles(): Promise<Profile[]> {
  return requestJson('/api/profiles');
}

export function createProfile(name: string): Promise<Profile> {
  return postJson('/api/profiles', { name });
}

export function deleteProfile(profileId: string): Promise<{ ok: true }> {
  return requestJson(`/api/profiles/${encodeURIComponent(profileId)}`, { method: 'DELETE' });
}

// ---------- Banco de dados (Editor do Banco) ----------

export function getDatabase(profileId: string): Promise<ProfileDatabase> {
  return requestJson(profileUrl(profileId, '/database'));
}

export function saveDatabase(profileId: string, db: ProfileDatabase): Promise<{ ok: true }> {
  return putJson(profileUrl(profileId, '/database'), db);
}

export function importDatabaseFromPdf(profileId: string, file: File): Promise<ProfileDatabase> {
  const formData = new FormData();
  formData.append('resume', file);
  return requestJson(profileUrl(profileId, '/database/import'), { method: 'POST', body: formData });
}

// ---------- Gerar currículo ----------

export interface GenerateResumePayload {
  jobDescription: string;
  videoInstructions: string;
  fileName: string;
}

export function generateResume(profileId: string, payload: GenerateResumePayload): Promise<GenerateResumeResponse> {
  return postJson(profileUrl(profileId, '/generate'), payload);
}

// ---------- Meus Currículos ----------

export function getResumes(profileId: string): Promise<ResumeListItem[]> {
  return requestJson(profileUrl(profileId, '/resumes'));
}

export function deleteResume(profileId: string, slug: string): Promise<{ ok: true }> {
  return requestJson(profileUrl(profileId, `/resumes/${encodeURIComponent(slug)}`), { method: 'DELETE' });
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
  return { ...data, education, additionalEducation: data.additionalEducation || [] };
}

/** Busca o JSON estruturado ao lado do PDF (mesmo slug). Lança se não existir
 * (currículo adicionado manualmente, sem passar pelo sistema — ver repairResume). */
export async function getResumeJson(pdfUrl: string): Promise<ResolvedResume> {
  const res = await fetch(pdfUrl.replace(/\.pdf$/, '.json'));
  if (!res.ok) throw new Error('not-found');
  return normalizeResolvedResume(await res.json());
}

export function updateResume(
  profileId: string,
  slug: string,
  data: ResolvedResume & { fileName: string }
): Promise<UpdateResumeResponse> {
  return putJson(profileUrl(profileId, `/resumes/${encodeURIComponent(slug)}`), data);
}

export function importResumeFromPdf(profileId: string, file: File, fileName: string): Promise<ImportResumeResponse> {
  const formData = new FormData();
  formData.append('resume', file);
  formData.append('fileName', fileName);
  return requestJson(profileUrl(profileId, '/resumes/import'), { method: 'POST', body: formData });
}

export function translateResume(profileId: string, slug: string): Promise<TranslateResumeResponse> {
  return requestJson(profileUrl(profileId, `/resumes/${encodeURIComponent(slug)}/translate`), { method: 'POST' });
}

export function generateScript(profileId: string, slug: string, videoInstructions: string): Promise<{ presentationScript: string }> {
  return postJson(profileUrl(profileId, `/resumes/${encodeURIComponent(slug)}/script`), { videoInstructions });
}

export function repairResume(profileId: string, slug: string): Promise<{ ok: true; resolved: ResolvedResume }> {
  return requestJson(profileUrl(profileId, `/resumes/${encodeURIComponent(slug)}/repair`), { method: 'POST' });
}
