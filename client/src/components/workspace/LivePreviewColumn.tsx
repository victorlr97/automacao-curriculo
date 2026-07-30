import { useEffect } from 'react';
import { Building2, FileText, FolderKanban, GraduationCap, Languages, Sparkles, User } from 'lucide-react';
import type { useGenerateResume } from '../../hooks/useGenerateResume';
import { TONE_STYLES, type Tone } from '../../theme';
import { ResumeEditForm } from '../ResumeEditForm';
import { Button } from '../ui/Button';
import { ResumePreviewDocument } from './ResumePreviewDocument';

const LOADING_ICONS: { icon: typeof User; tone: Tone }[] = [
  { icon: Building2, tone: 'teal' },
  { icon: Sparkles, tone: 'violet' },
  { icon: User, tone: 'accent' },
  { icon: GraduationCap, tone: 'violet' },
  { icon: FolderKanban, tone: 'teal' },
  { icon: Languages, tone: 'violet' }
];

function GeneratingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-bg p-8 text-center">
      <div className="flex items-center gap-3">
        {LOADING_ICONS.map(({ icon: Icon, tone }, idx) => {
          const toneStyles = TONE_STYLES[tone];
          return (
            <span
              key={idx}
              className={`flex h-11 w-11 animate-icon-wave items-center justify-center rounded-xl ${toneStyles.badgeBg} ${toneStyles.badgeText}`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <Icon size={20} strokeWidth={2} />
            </span>
          );
        })}
      </div>
      <div>
        <p className="text-sm font-bold text-ink">Gerando seu currículo...</p>
        <p className="mt-1 max-w-[280px] text-sm text-ink-soft">
          Isso pode levar até 2 minutos. A prévia aparece aqui assim que ficar pronta.
        </p>
      </div>
    </div>
  );
}

interface LivePreviewColumnProps {
  generator: ReturnType<typeof useGenerateResume>;
}

/** Coluna central: mostra o currículo recém-gerado como um documento web de
 * verdade (mesma tipografia do PDF), não embutido num visualizador de PDF do
 * navegador. Clicar numa seção abre o editor daquele conteúdo — o mesmo
 * editor usado em "Meus Currículos" — rolado até a seção clicada. */
export function LivePreviewColumn({ generator }: LivePreviewColumnProps) {
  const {
    generating,
    result,
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
  } = generator;

  useEffect(() => {
    if (mode !== 'edit' || !activeEditSection) return;
    const el = document.getElementById(`section-${activeEditSection}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [mode, activeEditSection]);

  if (generating) {
    return <GeneratingState />;
  }

  if (!result || !resolved) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg p-8 text-center">
        <FileText size={40} className="text-ink-faint" strokeWidth={1.5} />
        <p className="max-w-[260px] text-sm text-ink-soft">
          Cole uma vaga e clique em "Gerar PDF" pra ver a prévia do currículo aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-1 rounded-lg bg-bg p-1">
          <button
            type="button"
            onClick={handleBackToPreview}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              mode === 'preview' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Prévia
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick(activeEditSection ?? 'objective')}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              mode === 'edit' ? 'bg-white text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Editar
          </button>
        </div>
        <Button variant="secondary" href={result.pdfUrl}>
          Abrir PDF
        </Button>
      </div>

      {mode === 'preview' && (
        <div className="flex-1 p-6">
          <ResumePreviewDocument data={resolved} onSectionClick={handleSectionClick} />
        </div>
      )}

      {mode === 'edit' && (
        <div className="mx-auto w-full max-w-[820px] flex-1 p-6">
          <ResumeEditForm
            data={resolved}
            onChange={setResolved}
            fileName={editFileName}
            onFileNameChange={setEditFileName}
            videoInstructions={editVideoInstructions}
            onVideoInstructionsChange={setEditVideoInstructions}
            onGenerateScript={handleGenerateScript}
            generatingScript={scriptGenerating}
            scriptStatus={scriptStatus}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            generatingCoverLetter={coverLetterGenerating}
            coverLetterStatus={coverLetterStatus}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      )}
    </div>
  );
}
