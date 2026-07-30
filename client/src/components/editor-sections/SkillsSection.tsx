import { Sparkles } from 'lucide-react';
import type { ProfileDatabase } from '../../types';
import { Card, Hint } from '../ui/Card';
import { ChipListField } from '../ui/ChipListField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

export function SkillsSection({ db, onChange }: SectionProps) {
  return (
    <Card title="Habilidades" icon={Sparkles} tone="violet">
      <Hint>Lista com todas as suas habilidades, a IA vai escolher as mais relevantes pra cada vaga.</Hint>
      <ChipListField label="Habilidades" items={db.skills} onChange={skills => onChange({ ...db, skills })} />
    </Card>
  );
}
