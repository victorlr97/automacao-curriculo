import type { useGenerateResume } from '../../hooks/useGenerateResume';
import { Button } from '../ui/Button';
import { ScriptBlock } from '../ui/ScriptBlock';
import { StatusMessage } from '../ui/StatusMessage';
import { TextArea } from '../ui/TextArea';
import { TextField } from '../ui/TextField';

interface GeneratePanelProps {
  generator: ReturnType<typeof useGenerateResume>;
}

export function GeneratePanel({ generator }: GeneratePanelProps) {
  const {
    jobDescription,
    setJobDescription,
    fileName,
    setFileName,
    status,
    error,
    generating,
    result,
    handleGenerate
  } = generator;

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-border bg-white p-4">
      <h3 className="mb-3 text-base font-bold">Gerar pra uma vaga</h3>
      <div className="flex flex-col gap-3">
        <TextArea
          label="Cole a descrição da vaga"
          rows={10}
          value={jobDescription}
          onChange={setJobDescription}
          placeholder="Cole aqui o texto completo da vaga (requisitos, stack, responsabilidades...)"
        />
        <TextField
          label="Nome do arquivo (opcional)"
          value={fileName}
          onChange={setFileName}
          placeholder="Deixe em branco pra gerar automático"
        />
        <Button variant="primary" onClick={handleGenerate} disabled={generating}>
          Gerar PDF
        </Button>
        <StatusMessage error={error}>{status}</StatusMessage>
      </div>

      {result && (
        <div className="mt-5 border-t border-border pt-4">
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-faint">Resultado</h4>
          <dl>
            <SummaryField label="Perfil identificado" value={result.profile} first />
            <SummaryField label="Idioma" value={result.language === 'en' ? 'Inglês' : 'Português'} />
            <SummaryField label="Projetos escolhidos" value={result.projectsChosen.join(', ')} />
            <SummaryField label="Resumo" value={result.resumo} />
          </dl>
          {result.presentationScript && <ScriptBlock script={result.presentationScript} />}
          {result.coverLetter && <ScriptBlock script={result.coverLetter} title="Carta de apresentação" />}
        </div>
      )}
    </div>
  );
}

function SummaryField({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={first ? '' : 'mt-3'}>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[13.5px] leading-snug text-ink">{value}</dd>
    </div>
  );
}
