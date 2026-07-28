import { Award, GraduationCap } from 'lucide-react';
import type { AdditionalEducationEntry, ProfileDatabase } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { Card, Hint } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { TextArea } from '../ui/TextArea';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

function blank(): AdditionalEducationEntry {
  return { institution: '', description: '' };
}

export function AdditionalEducationSection({ db, onChange }: SectionProps) {
  const items = makeListEditor(db.additional_education, next => onChange({ ...db, additional_education: next }));

  return (
    <Card title="Formação Complementar" icon={Award} tone="violet">
      <Hint>
        Cursos, certificações ou formação continuada além da sua graduação/pós principal — aparece numa seção
        separada no currículo.
      </Hint>
      {items.items.map((ed, idx) => (
        <CollapsibleEntry
          key={idx}
          title={ed.institution || `Curso ${idx + 1}`}
          subtitle={ed.description}
          icon={GraduationCap}
          onRemove={() => items.removeAt(idx)}
        >
          <TextField label="Instituição" value={ed.institution} onChange={v => items.updateAt(idx, { institution: v })} />
          <TextArea
            label="Descrição (curso, tema)"
            rows={2}
            value={ed.description}
            onChange={v => items.updateAt(idx, { description: v })}
          />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => items.add(blank())}>
        + Adicionar curso
      </Button>
    </Card>
  );
}
