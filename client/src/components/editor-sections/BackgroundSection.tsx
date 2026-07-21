import type { ProfileDatabase } from '../../types';
import { Card, Hint } from '../ui/Card';
import { LinesField } from '../ui/LinesField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

export function BackgroundSection({ db, onChange }: SectionProps) {
  return (
    <Card title="Sobre Mim">
      <Hint>
        Fatos brutos sobre sua trajetória — um por linha. A IA usa esses fatos pra escrever um objetivo profissional
        novo a cada vaga, nunca um texto pronto.
      </Hint>
      <LinesField
        label="Fatos (um por linha)"
        rows={10}
        items={db.background_facts}
        onChange={background_facts => onChange({ ...db, background_facts })}
      />
    </Card>
  );
}
