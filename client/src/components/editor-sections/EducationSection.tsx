import type { EducationEntry, ProfileDatabase } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { Card, FieldGrid, Hint } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

function blank(): EducationEntry {
  return { institution: '', period: '', degree: '' };
}

export function EducationSection({ db, onChange }: SectionProps) {
  const education = makeListEditor(db.education, next => onChange({ ...db, education: next }));

  return (
    <Card title="Formação">
      <Hint>
        Graduação, pós-graduação, mestrado etc — uma entrada por diploma/título. Todos aparecem no currículo, sem
        filtro por vaga.
      </Hint>
      {education.items.map((edu, idx) => (
        <CollapsibleEntry key={idx} title={edu.institution || `Formação ${idx + 1}`} onRemove={() => education.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Instituição" value={edu.institution} onChange={v => education.updateAt(idx, { institution: v })} />
            <TextField label="Período" value={edu.period} onChange={v => education.updateAt(idx, { period: v })} />
            <TextField label="Curso" value={edu.degree} onChange={v => education.updateAt(idx, { degree: v })} />
          </FieldGrid>
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => education.add(blank())}>
        + Adicionar formação
      </Button>
    </Card>
  );
}
