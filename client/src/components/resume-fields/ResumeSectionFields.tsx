import type { AdditionalEducationEntry, EducationEntry, ExperienceEntry, LanguageEntry, ProjectEntry } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { FieldGrid } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { StackField } from '../ui/StackField';
import { TextArea } from '../ui/TextArea';
import { TextField } from '../ui/TextField';

export function blankExperience(): ExperienceEntry {
  return { company: '', location: '', role: '', period: '', description: '' };
}
export function blankProject(): ProjectEntry {
  return { name: '', role: '', stack: [], description: '' };
}
export function blankEducation(): EducationEntry {
  return { institution: '', degree: '', period: '' };
}
export function blankAdditionalEducation(): AdditionalEducationEntry {
  return { institution: '', description: '' };
}

/** Cada seção do currículo já gerado (experiência, projetos, formação...),
 * extraída do formulário de edição pra ser reaproveitada tanto no formulário
 * completo (ResumeEditForm) quanto no editor em acordeão de "Meus Currículos". */

export function ExperienceFields({ items, onChange }: { items: ExperienceEntry[]; onChange: (items: ExperienceEntry[]) => void }) {
  const experience = makeListEditor(items, onChange);
  return (
    <>
      {experience.items.map((exp, idx) => (
        <CollapsibleEntry key={idx} title={exp.company || `Experiência ${idx + 1}`} onRemove={() => experience.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Empresa" value={exp.company} onChange={v => experience.updateAt(idx, { company: v })} />
            <TextField label="Local" value={exp.location} onChange={v => experience.updateAt(idx, { location: v })} />
            <TextField label="Cargo" value={exp.role} onChange={v => experience.updateAt(idx, { role: v })} />
            <TextField label="Período" value={exp.period} onChange={v => experience.updateAt(idx, { period: v })} />
          </FieldGrid>
          <TextArea label="Descrição" value={exp.description} onChange={v => experience.updateAt(idx, { description: v })} />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => experience.add(blankExperience())}>
        + Adicionar experiência
      </Button>
    </>
  );
}

export function ProjectsFields({ items, onChange }: { items: ProjectEntry[]; onChange: (items: ProjectEntry[]) => void }) {
  const projects = makeListEditor(items, onChange);
  return (
    <>
      {projects.items.map((proj, idx) => (
        <CollapsibleEntry key={idx} title={proj.name || `Projeto ${idx + 1}`} onRemove={() => projects.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Nome" value={proj.name} onChange={v => projects.updateAt(idx, { name: v })} />
            <TextField label="Cargo" value={proj.role} onChange={v => projects.updateAt(idx, { role: v })} />
          </FieldGrid>
          <StackField label="Stack (separado por vírgula)" items={proj.stack} onChange={stack => projects.updateAt(idx, { stack })} />
          <TextArea label="Descrição" value={proj.description} onChange={v => projects.updateAt(idx, { description: v })} />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => projects.add(blankProject())}>
        + Adicionar projeto
      </Button>
    </>
  );
}

export function EducationFields({ items, onChange }: { items: EducationEntry[]; onChange: (items: EducationEntry[]) => void }) {
  const education = makeListEditor(items, onChange);
  return (
    <>
      {education.items.map((edu, idx) => (
        <CollapsibleEntry key={idx} title={edu.institution || `Formação ${idx + 1}`} onRemove={() => education.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Instituição" value={edu.institution} onChange={v => education.updateAt(idx, { institution: v })} />
            <TextField label="Curso" value={edu.degree} onChange={v => education.updateAt(idx, { degree: v })} />
            <TextField label="Período" value={edu.period} onChange={v => education.updateAt(idx, { period: v })} />
          </FieldGrid>
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => education.add(blankEducation())}>
        + Adicionar formação
      </Button>
    </>
  );
}

export function AdditionalEducationFields({
  items,
  onChange
}: {
  items: AdditionalEducationEntry[];
  onChange: (items: AdditionalEducationEntry[]) => void;
}) {
  const additionalEducation = makeListEditor(items, onChange);
  return (
    <>
      {additionalEducation.items.map((ed, idx) => (
        <CollapsibleEntry key={idx} title={ed.institution || `Curso ${idx + 1}`} onRemove={() => additionalEducation.removeAt(idx)}>
          <TextField label="Instituição" value={ed.institution} onChange={v => additionalEducation.updateAt(idx, { institution: v })} />
          <TextArea label="Descrição" rows={2} value={ed.description} onChange={v => additionalEducation.updateAt(idx, { description: v })} />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => additionalEducation.add(blankAdditionalEducation())}>
        + Adicionar curso
      </Button>
    </>
  );
}

export function LanguagesFields({ items, onChange }: { items: LanguageEntry[]; onChange: (items: LanguageEntry[]) => void }) {
  return (
    <>
      {items.map((lang, idx) => (
        <FieldGrid key={idx}>
          <TextField
            label="Nome"
            value={lang.name}
            onChange={v => {
              const next = items.slice();
              next[idx] = { ...next[idx], name: v };
              onChange(next);
            }}
          />
          <TextField
            label="Nível"
            value={lang.level}
            onChange={v => {
              const next = items.slice();
              next[idx] = { ...next[idx], level: v };
              onChange(next);
            }}
          />
        </FieldGrid>
      ))}
    </>
  );
}
