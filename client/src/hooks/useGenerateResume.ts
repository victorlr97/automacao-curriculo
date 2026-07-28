import { useState } from 'react';
import * as api from '../api';
import type { GenerateResumeResponse, ResolvedResume } from '../types';

export type PreviewMode = 'preview' | 'edit';

/** Toda a lógica da geração de currículo (formulário da vaga + chamada de
 * IA + resultado) e da edição pós-geração (mesmo padrão de "Meus Currículos" →
 * Editar), extraída pra ser reaproveitada nas colunas direita/central do
 * workspace unificado. */
export function useGenerateResume() {
  const [jobDescription, setJobDescription] = useState('');
  const [videoInstructions, setVideoInstructions] = useState('');
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResumeResponse | null>(null);

  // Conteúdo estruturado do currículo recém-gerado (o mesmo JSON editável de
  // "Meus Currículos"), usado pra renderizar a prévia como documento e pra
  // permitir editar o texto exato que a IA escreveu, seção por seção.
  const [resolved, setResolved] = useState<ResolvedResume | null>(null);
  const [mode, setMode] = useState<PreviewMode>('preview');
  const [activeEditSection, setActiveEditSection] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editVideoInstructions, setEditVideoInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const [scriptStatus, setScriptStatus] = useState('');
  const [coverLetterGenerating, setCoverLetterGenerating] = useState(false);
  const [coverLetterStatus, setCoverLetterStatus] = useState('');

  async function handleGenerate() {
    if (!jobDescription.trim()) {
      setStatus('Cole a descrição da vaga primeiro.');
      setError(true);
      return;
    }

    setGenerating(true);
    setStatus('');
    setError(false);
    try {
      const data = await api.generateResume({
        jobDescription: jobDescription.trim(),
        videoInstructions: videoInstructions.trim(),
        fileName: fileName.trim()
      });
      setResult(data);
      setMode('preview');
      setActiveEditSection(null);
      setEditFileName(data.slug);
      setEditVideoInstructions('');
      setScriptStatus('');
      setCoverLetterStatus('');
      const resolvedResume = await api.getResumeJson(data.slug);
      setResolved(resolvedResume);
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
      setError(true);
    } finally {
      setGenerating(false);
    }
  }

  function handleSectionClick(section: string) {
    setActiveEditSection(section);
    setMode('edit');
  }

  function handleBackToPreview() {
    setMode('preview');
  }

  async function handleSave() {
    if (!result || !resolved) return;
    setSaving(true);
    setStatus('Salvando e gerando PDF...');
    setError(false);
    try {
      const res = await api.updateResume(result.slug, { ...resolved, fileName: editFileName });
      setResult({ ...result, slug: res.slug, pdfUrl: res.pdfUrl });
      setEditFileName(res.slug);
      setStatus(res.slug !== result.slug ? `Salvo como um novo arquivo: "${res.slug}".` : 'Salvo! PDF atualizado.');
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateScript() {
    if (!resolved || !result) return;
    setScriptGenerating(true);
    setScriptStatus('');
    try {
      const { presentationScript } = await api.generateScript(result.slug, editVideoInstructions);
      setResolved({ ...resolved, presentationScript });
    } catch (err) {
      setScriptStatus(`Erro: ${(err as Error).message}`);
    } finally {
      setScriptGenerating(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!resolved || !result) return;
    setCoverLetterGenerating(true);
    setCoverLetterStatus('');
    try {
      const { coverLetter } = await api.generateCoverLetter(result.slug);
      setResolved({ ...resolved, coverLetter });
    } catch (err) {
      setCoverLetterStatus(`Erro: ${(err as Error).message}`);
    } finally {
      setCoverLetterGenerating(false);
    }
  }

  return {
    jobDescription,
    setJobDescription,
    videoInstructions,
    setVideoInstructions,
    fileName,
    setFileName,
    status,
    error,
    generating,
    result,
    handleGenerate,
    resolved,
    setResolved,
    mode,
    activeEditSection,
    editFileName,
    setEditFileName,
    editVideoInstructions,
    setEditVideoInstructions,
    saving,
    scriptGenerating,
    scriptStatus,
    coverLetterGenerating,
    coverLetterStatus,
    handleSectionClick,
    handleBackToPreview,
    handleSave,
    handleGenerateScript,
    handleGenerateCoverLetter
  };
}
