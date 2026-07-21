import type { ExperienceFact, ProfileDatabase } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { Card, FieldGrid, Hint } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { LinesField } from '../ui/LinesField';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

function blank(): ExperienceFact {
  return { company: '', location: '', role: '', period: '', facts: [] };
}

export function ExperienceSection({ db, onChange }: SectionProps) {
  const experience = makeListEditor(db.experience, next => onChange({ ...db, experience: next }));

  return (
    <Card title="Experiências">
      <Hint>
        Fatos brutos de cada experiência — um por linha. A IA escolhe quais manter e reescreve a descrição final pra
        cada vaga; nenhum currículo gerado usa esses fatos literalmente.
      </Hint>
      {experience.items.map((exp, idx) => (
        <CollapsibleEntry key={idx} title={exp.company || `Experiência ${idx + 1}`} onRemove={() => experience.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Empresa" value={exp.company} onChange={v => experience.updateAt(idx, { company: v })} />
            <TextField label="Local" value={exp.location} onChange={v => experience.updateAt(idx, { location: v })} />
            <TextField label="Cargo" value={exp.role} onChange={v => experience.updateAt(idx, { role: v })} />
            <TextField label="Período" value={exp.period} onChange={v => experience.updateAt(idx, { period: v })} />
          </FieldGrid>
          <LinesField label="Fatos (um por linha)" items={exp.facts} onChange={facts => experience.updateAt(idx, { facts })} />
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => experience.add(blank())}>
        + Adicionar experiência
      </Button>
    </Card>
  );
}
