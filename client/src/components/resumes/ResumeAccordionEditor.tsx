import { useEffect, useState } from 'react';
import * as api from '../../api';
import type { ResolvedResume, ResumeListItem } from '../../types';
import {
  AdditionalEducationFields,
  EducationFields,
  ExperienceFields,
  LanguagesFields,
  ProjectsFields
} from '../resume-fields/ResumeSectionFields';
import { AccordionSection } from '../ui/AccordionSection';
import { Button } from '../ui/Button';
import { ChipListField } from '../ui/ChipListField';
import { StatusMessage } from '../ui/StatusMessage';
import { TextArea } from '../ui/TextArea';
import { TextField } from '../ui/TextField';
import { ResumePreviewDocument } from '../workspace/ResumePreviewDocument';

interface ResumeAccordionEditorProps {
  item: ResumeListItem;
  onResumeMutated: (newSlug: string) => Promise<void>;
}

/** Editor de um currículo já gerado: seções em acordeão à esquerda, prévia do
 * documento à direita — a mesma prévia atualiza a cada tecla porque lê
 * diretamente do estado `resolved` que os campos editam, sem precisar salvar
 * primeiro (ao contrário do fluxo antigo de "Salvar e depois ver"). */
export function ResumeAccordionEditor({ item, onResumeMutated }: ResumeAccordionEditorProps) {
  const [resolved, setResolved] = useState<ResolvedResume | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState(item.slug);
  const [fileName, setFileName] = useState(item.slug);
  const [videoInstructions, setVideoInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [scriptStatus, setScriptStatus] = useState('');
  const [coverLetterGenerating, setCoverLetterGenerating] = useState(false);
  const [coverLetterStatus, setCoverLetterStatus] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getResumeJson(item.slug)
      .then(data => {
        if (cancelled) return;
        setResolved(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  function update(patch: Partial<ResolvedResume>) {
    if (!resolved) return;
    setResolved({ ...resolved, ...patch });
  }

  function toggle(key: string) {
    setExpanded(prev => (prev === key ? null : key));
    const el = document.getElementById(`accordion-${key}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSave() {
    if (!resolved) return;
    setSaving(true);
    setStatus('Salvando e gerando PDF...');
    setError(false);
    try {
      const res = await api.updateResume(slug, { ...resolved, fileName });
      setSlug(res.slug);
      setFileName(res.slug);
      setStatus(res.slug !== slug ? `Salvo como um novo arquivo: "${res.slug}".` : 'Salvo! PDF atualizado.');
      await onResumeMutated(res.slug);
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateScript() {
    if (!resolved) return;
    setScriptGenerating(true);
    setScriptStatus('');
    try {
      const { presentationScript } = await api.generateScript(slug, videoInstructions);
      update({ presentationScript });
    } catch (err) {
      setScriptStatus(`Erro: ${(err as Error).message}`);
    } finally {
      setScriptGenerating(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!resolved) return;
    setCoverLetterGenerating(true);
    setCoverLetterStatus('');
    try {
      const { coverLetter } = await api.generateCoverLetter(slug);
      update({ coverLetter });
    } catch (err) {
      setCoverLetterStatus(`Erro: ${(err as Error).message}`);
    } finally {
      setCoverLetterGenerating(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-ink-soft">Carregando...</p>;
  }

  if (notFound || !resolved) {
    return (
      <div className="p-6">
        <p className="max-w-[480px] text-sm text-ink-soft">Esse currículo não foi encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-[380px_1fr] overflow-hidden">
      <div className="flex h-full flex-col overflow-y-auto border-r border-border px-4">
        <div className="border-b border-border py-3">
          <TextField label="Nome do arquivo (PDF/JSON)" value={fileName} onChange={setFileName} />
        </div>

        <AccordionSection id="title" title="Cargo-alvo" open={expanded === 'title'} onToggle={() => toggle('title')}>
          <TextField label="Título (aparece no currículo)" value={resolved.title} onChange={v => update({ title: v })} />
        </AccordionSection>

        <AccordionSection id="objective" title="Sobre" open={expanded === 'objective'} onToggle={() => toggle('objective')}>
          <TextArea label="Sobre" rows={6} value={resolved.objective} onChange={v => update({ objective: v })} />
        </AccordionSection>

        <AccordionSection
          id="experience"
          title="Experiência"
          count={resolved.experience.length}
          open={expanded === 'experience'}
          onToggle={() => toggle('experience')}
        >
          <ExperienceFields items={resolved.experience} onChange={experience => update({ experience })} language={resolved.language} />
        </AccordionSection>

        <AccordionSection
          id="projects"
          title="Projetos"
          count={resolved.projects.length}
          open={expanded === 'projects'}
          onToggle={() => toggle('projects')}
        >
          <ProjectsFields items={resolved.projects} onChange={projects => update({ projects })} />
        </AccordionSection>

        <AccordionSection
          id="education"
          title="Formação"
          count={resolved.education.length}
          open={expanded === 'education'}
          onToggle={() => toggle('education')}
        >
          <EducationFields items={resolved.education} onChange={education => update({ education })} language={resolved.language} />
        </AccordionSection>

        <AccordionSection
          id="additionalEducation"
          title="Formação Complementar"
          count={resolved.additionalEducation.length}
          open={expanded === 'additionalEducation'}
          onToggle={() => toggle('additionalEducation')}
        >
          <AdditionalEducationFields
            items={resolved.additionalEducation}
            onChange={additionalEducation => update({ additionalEducation })}
          />
        </AccordionSection>

        <AccordionSection
          id="skills"
          title="Habilidades"
          count={resolved.skills.length}
          open={expanded === 'skills'}
          onToggle={() => toggle('skills')}
        >
          <ChipListField items={resolved.skills} onChange={skills => update({ skills })} />
        </AccordionSection>

        <AccordionSection
          id="languages"
          title="Idiomas"
          count={resolved.languages.length}
          open={expanded === 'languages'}
          onToggle={() => toggle('languages')}
        >
          <LanguagesFields items={resolved.languages} onChange={languages => update({ languages })} language={resolved.language} />
        </AccordionSection>

        <AccordionSection id="script" title="Texto de apresentação (vídeo)" open={expanded === 'script'} onToggle={() => toggle('script')}>
          <TextArea
            label="Instruções do vídeo (opcional)"
            rows={3}
            value={videoInstructions}
            onChange={setVideoInstructions}
          />
          <Button variant="secondary" onClick={handleGenerateScript} disabled={scriptGenerating}>
            {scriptGenerating ? 'Gerando roteiro...' : resolved.presentationScript ? 'Regenerar roteiro' : 'Gerar roteiro'}
          </Button>
          <StatusMessage error={Boolean(scriptStatus) && scriptStatus.startsWith('Erro')}>{scriptStatus}</StatusMessage>
          <TextArea
            label="Texto de apresentação"
            rows={6}
            value={resolved.presentationScript}
            onChange={v => update({ presentationScript: v })}
          />
        </AccordionSection>

        <AccordionSection
          id="coverLetter"
          title="Carta de apresentação"
          open={expanded === 'coverLetter'}
          onToggle={() => toggle('coverLetter')}
        >
          <Button variant="secondary" onClick={handleGenerateCoverLetter} disabled={coverLetterGenerating}>
            {coverLetterGenerating ? 'Gerando carta...' : resolved.coverLetter ? 'Regenerar carta' : 'Gerar carta'}
          </Button>
          <StatusMessage error={Boolean(coverLetterStatus) && coverLetterStatus.startsWith('Erro')}>
            {coverLetterStatus}
          </StatusMessage>
          <TextArea
            label="Carta de apresentação (até 500 caracteres)"
            rows={6}
            value={resolved.coverLetter}
            onChange={v => update({ coverLetter: v })}
          />
          <p className={`mt-1 text-right text-xs ${resolved.coverLetter.length > 500 ? 'text-danger' : 'text-ink-faint'}`}>
            {resolved.coverLetter.length}/500
          </p>
        </AccordionSection>

        <div className="sticky bottom-0 border-t border-border bg-white py-3">
          <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar e Gerar PDF'}
          </Button>
          <StatusMessage error={error}>{status}</StatusMessage>
        </div>
      </div>

      <div className="h-full overflow-y-auto bg-bg p-6">
        <ResumePreviewDocument data={resolved} onSectionClick={toggle} />
      </div>
    </div>
  );
}
