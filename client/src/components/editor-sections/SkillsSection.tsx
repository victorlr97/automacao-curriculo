import type { ProfileDatabase } from '../../types';
import { Card, Hint } from '../ui/Card';
import { ChipListField } from '../ui/ChipListField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

export function SkillsSection({ db, onChange }: SectionProps) {
  return (
    <Card title="Habilidades">
      <Hint>Lista única com todas as habilidades (design e dev misturadas) — a IA escolhe as relevantes pra cada vaga.</Hint>
      <ChipListField label="Habilidades" items={db.skills} onChange={skills => onChange({ ...db, skills })} />
    </Card>
  );
}
