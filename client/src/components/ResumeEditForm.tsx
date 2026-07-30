import type { ResolvedResume } from '../types';
import {
  AdditionalEducationFields,
  EducationFields,
  ExperienceFields,
  LanguagesFields,
  ProjectsFields
} from './resume-fields/ResumeSectionFields';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ChipListField } from './ui/ChipListField';
import { StatusMessage } from './ui/StatusMessage';
import { TextArea } from './ui/TextArea';
import { TextField } from './ui/TextField';

interface ResumeEditFormProps {
  data: ResolvedResume;
  onChange: (data: ResolvedResume) => void;
  fileName: string;
  onFileNameChange: (v: string) => void;
  videoInstructions: string;
  onVideoInstructionsChange: (v: string) => void;
  onGenerateScript: () => void;
  generatingScript: boolean;
  scriptStatus: string;
  onGenerateCoverLetter: () => void;
  generatingCoverLetter: boolean;
  coverLetterStatus: string;
  onSave: () => void;
  saving: boolean;
}

export function ResumeEditForm({
  data,
  onChange,
  fileName,
  onFileNameChange,
  videoInstructions,
  onVideoInstructionsChange,
  onGenerateScript,
  generatingScript,
  scriptStatus,
  onGenerateCoverLetter,
  generatingCoverLetter,
  coverLetterStatus,
  onSave,
  saving
}: ResumeEditFormProps) {
  function update(patch: Partial<ResolvedResume>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-ink-soft">
        Se mudar o nome do arquivo, salva como um currículo novo (o original continua intacto). Se deixar igual,
        sobrescreve o mesmo arquivo.
      </p>
      <TextField label="Nome do arquivo (PDF/JSON)" value={fileName} onChange={onFileNameChange} />
      <TextField label="Título (aparece no currículo)" value={data.title} onChange={v => update({ title: v })} />
      <div id="section-objective">
        <TextArea label="Sobre" rows={5} value={data.objective} onChange={v => update({ objective: v })} />
      </div>
      <TextArea
        label="Texto de apresentação (vídeo, opcional)"
        rows={5}
        value={data.presentationScript}
        onChange={v => update({ presentationScript: v })}
      />

      <Card className="bg-[#fbfcfd]">
        <TextArea
          label="Instruções do vídeo (opcional)"
          rows={3}
          value={videoInstructions}
          onChange={onVideoInstructionsChange}
        />
        <div className="mt-3">
          <Button variant="secondary" onClick={onGenerateScript} disabled={generatingScript}>
            {generatingScript
              ? 'Gerando roteiro... (pode levar até 1 minuto)'
              : data.presentationScript
                ? 'Regenerar roteiro'
                : 'Gerar roteiro'}
          </Button>
        </div>
        <StatusMessage error={Boolean(scriptStatus) && scriptStatus.startsWith('Erro')}>{scriptStatus}</StatusMessage>
      </Card>

      <Card className="bg-[#fbfcfd]">
        <TextArea
          label="Carta de apresentação (até 500 caracteres)"
          rows={5}
          value={data.coverLetter}
          onChange={v => update({ coverLetter: v })}
        />
        <p className={`mt-1 text-right text-xs ${data.coverLetter.length > 500 ? 'text-danger' : 'text-ink-faint'}`}>
          {data.coverLetter.length}/500
        </p>
        <div className="mt-3">
          <Button variant="secondary" onClick={onGenerateCoverLetter} disabled={generatingCoverLetter}>
            {generatingCoverLetter ? 'Gerando carta...' : data.coverLetter ? 'Regenerar carta' : 'Gerar carta'}
          </Button>
        </div>
        <StatusMessage error={Boolean(coverLetterStatus) && coverLetterStatus.startsWith('Erro')}>
          {coverLetterStatus}
        </StatusMessage>
      </Card>

      <h4 id="section-experience" className="text-base font-bold">
        Experiências
      </h4>
      <ExperienceFields items={data.experience} onChange={experience => update({ experience })} language={data.language} />

      <h4 id="section-projects" className="text-base font-bold">
        Projetos
      </h4>
      <ProjectsFields items={data.projects} onChange={projects => update({ projects })} />

      <h4 id="section-education" className="text-base font-bold">
        Formação
      </h4>
      <EducationFields items={data.education} onChange={education => update({ education })} language={data.language} />

      <h4 id="section-additionalEducation" className="text-base font-bold">
        Formação Complementar
      </h4>
      <AdditionalEducationFields items={data.additionalEducation} onChange={additionalEducation => update({ additionalEducation })} />

      <h4 id="section-skills" className="text-base font-bold">
        Habilidades
      </h4>
      <ChipListField items={data.skills} onChange={skills => update({ skills })} />

      <h4 id="section-languages" className="text-base font-bold">
        Idiomas
      </h4>
      <LanguagesFields items={data.languages} onChange={languages => update({ languages })} language={data.language} />

      <div>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar e Regenerar PDF'}
        </Button>
      </div>
    </div>
  );
}
