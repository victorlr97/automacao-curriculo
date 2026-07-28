import { Award, BookOpen, Building2, FolderKanban, GraduationCap, Languages, Link2, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type ReactElement } from 'react';
import * as api from '../api';
import { useConfirm } from '../context/ConfirmContext';
import { databaseHasContent, normalizeDatabase } from '../normalizeDatabase';
import type { Tone } from '../theme';
import type { ProfileDatabase } from '../types';
import { AdditionalEducationSection } from '../components/editor-sections/AdditionalEducationSection';
import { BackgroundSection } from '../components/editor-sections/BackgroundSection';
import { EducationSection } from '../components/editor-sections/EducationSection';
import { ExperienceSection } from '../components/editor-sections/ExperienceSection';
import { LanguagesSection } from '../components/editor-sections/LanguagesSection';
import { PersonalSection } from '../components/editor-sections/PersonalSection';
import { PortfolioSection } from '../components/editor-sections/PortfolioSection';
import { ProjectsSection } from '../components/editor-sections/ProjectsSection';
import { SkillsSection } from '../components/editor-sections/SkillsSection';

export interface SectionDef {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  Component: (props: { db: ProfileDatabase; onChange: (db: ProfileDatabase) => void }) => ReactElement;
  count?: (db: ProfileDatabase) => number;
}

export const DATABASE_SECTIONS: SectionDef[] = [
  { key: 'personal', label: 'Dados Pessoais', icon: User, tone: 'accent', Component: PersonalSection },
  { key: 'background', label: 'Sobre Mim', icon: BookOpen, tone: 'accent', Component: BackgroundSection },
  {
    key: 'experience',
    label: 'Experiências',
    icon: Building2,
    tone: 'teal',
    Component: ExperienceSection,
    count: db => db.experience.length
  },
  {
    key: 'projects',
    label: 'Projetos',
    icon: FolderKanban,
    tone: 'teal',
    Component: ProjectsSection,
    count: db => db.projects.length
  },
  {
    key: 'skills',
    label: 'Habilidades',
    icon: Sparkles,
    tone: 'violet',
    Component: SkillsSection,
    count: db => db.skills.length
  },
  {
    key: 'education',
    label: 'Formação',
    icon: GraduationCap,
    tone: 'violet',
    Component: EducationSection,
    count: db => db.education.length
  },
  {
    key: 'additionalEducation',
    label: 'Formação Complementar',
    icon: Award,
    tone: 'violet',
    Component: AdditionalEducationSection,
    count: db => db.additional_education.length
  },
  {
    key: 'languages',
    label: 'Idiomas',
    icon: Languages,
    tone: 'violet',
    Component: LanguagesSection,
    count: db => db.languages.length
  },
  { key: 'portfolio', label: 'Portfólio', icon: Link2, tone: 'teal', Component: PortfolioSection }
];

/** Toda a lógica do Editor do Banco (carregar, salvar, descartar, importar
 * PDF), extraída pra ser reaproveitada como a coluna esquerda do workspace
 * unificado. Comportamento idêntico ao que já existia. */
export function useDatabaseEditor() {
  const confirm = useConfirm();
  const [db, setDb] = useState<ProfileDatabase | null>(null);
  const [activeSection, setActiveSection] = useState(DATABASE_SECTIONS[0].key);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState(false);

  async function loadDatabase() {
    const data = await api.getDatabase();
    setDb(normalizeDatabase(data));
    setActiveSection(DATABASE_SECTIONS[0].key);
    setReloadKey(k => k + 1);
  }

  useEffect(() => {
    loadDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    if (!db) return;
    setSaving(true);
    setStatus('Salvando...');
    setError(false);
    try {
      await api.saveDatabase(db);
      setStatus('Alterações salvas com sucesso.');
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDiscard() {
    await loadDatabase();
    setStatus('Alterações descartadas — dados recarregados do arquivo.');
    setError(false);
  }

  async function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (db && databaseHasContent(db)) {
      const proceed = await confirm({
        title: 'Importar currículo',
        message:
          'Isso substitui os dados abertos no editor pelos fatos extraídos do PDF (nada é salvo em disco ainda — dá pra revisar e descartar depois). Continuar?',
        confirmLabel: 'Continuar'
      });
      if (!proceed) {
        e.target.value = '';
        return;
      }
    }

    setImportStatus('Extraindo fatos do PDF... (pode levar até 1 minuto)');
    setImportError(false);
    try {
      const data = await api.importDatabaseFromPdf(file);
      const normalized = normalizeDatabase(data);
      setDb(normalized);
      setActiveSection(DATABASE_SECTIONS[0].key);
      setReloadKey(k => k + 1);
      setImportStatus(
        `Extraído do PDF: ${normalized.experience.length} experiência(s), ${normalized.projects.length} projeto(s), ${normalized.skills.length} habilidade(s). Revise os campos e clique em "Salvar alterações" pra confirmar.`
      );
    } catch (err) {
      setImportStatus(`Erro: ${(err as Error).message}`);
      setImportError(true);
    } finally {
      e.target.value = '';
    }
  }

  return {
    db,
    setDb,
    activeSection,
    setActiveSection,
    reloadKey,
    status,
    error,
    saving,
    importStatus,
    importError,
    handleSave,
    handleDiscard,
    handleImportChange
  };
}
