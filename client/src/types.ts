export type Language = 'pt' | 'en';

export interface Profile {
  id: string;
  name: string;
}

export interface PersonalInfo {
  name: string;
  age: number;
  location: string;
  phone: string;
  email: string;
  github: string;
  linkedin: string;
  behance?: string;
}

export interface Portfolio {
  github: string;
  behance: string;
  behance_note: string;
}

export interface ExperienceFact {
  company: string;
  location: string;
  role: string;
  period: string;
  facts: string[];
}

export interface ProjectFact {
  id: string;
  name: string;
  stack: string[];
  facts: string[];
}

export interface EducationEntry {
  institution: string;
  degree: string;
  period: string;
}

export interface AdditionalEducationEntry {
  institution: string;
  description: string;
}

export interface LanguageEntry {
  name: string;
  level: string;
}

/** Banco de fatos brutos de um perfil — a fonte única de verdade usada pra
 * compor um currículo novo a cada vaga (data/profiles/<perfil>/database.json). */
export interface ProfileDatabase {
  personal: PersonalInfo;
  background_facts: string[];
  experience: ExperienceFact[];
  projects: ProjectFact[];
  skills: string[];
  education: EducationEntry[];
  additional_education: AdditionalEducationEntry[];
  languages: LanguageEntry[];
  portfolio: Portfolio;
}

export interface ExperienceEntry {
  company: string;
  location: string;
  role: string;
  period: string;
  description: string;
}

export interface ProjectEntry {
  name: string;
  role: string;
  stack: string[];
  description: string;
}

/** Um currículo já composto/gerado pra uma vaga específica — salvo como JSON
 * ao lado do PDF em output/<perfil>/<slug>.json. */
export interface ResolvedResume {
  personal: PersonalInfo;
  language: Language;
  title: string;
  objective: string;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  education: EducationEntry[];
  additionalEducation: AdditionalEducationEntry[];
  skills: string[];
  languages: LanguageEntry[];
  presentationScript: string;
  portfolio: Portfolio;
  fileLabel?: string;
}

export interface ResumeListItem {
  slug: string;
  title: string;
  language: Language | null;
  presentationScript: string;
  generatedAt: string;
  pdfUrl: string;
}

export interface GenerateResumeResponse {
  slug: string;
  profile: string;
  language: Language;
  projectsChosen: string[];
  resumo: string;
  presentationScript: string;
  pdfUrl: string;
}

export interface ImportResumeResponse {
  slug: string;
  title: string;
  language: Language;
  pdfUrl: string;
}

export interface TranslateResumeResponse {
  slug: string;
  title: string;
  language: Language;
  pdfUrl: string;
}

export interface UpdateResumeResponse {
  ok: true;
  slug: string;
  pdfUrl: string;
}

export interface ApiErrorBody {
  error: string;
}
