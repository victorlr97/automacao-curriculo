import { Code, Link2 } from 'lucide-react';
import type { ProfileDatabase } from '../../types';
import { Card, FieldGrid, Hint } from '../ui/Card';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

export function PortfolioSection({ db, onChange }: SectionProps) {
  const p = db.portfolio;
  function update(patch: Partial<ProfileDatabase['portfolio']>) {
    onChange({ ...db, portfolio: { ...p, ...patch } });
  }

  return (
    <Card title="Portfólio" icon={Link2} tone="teal">
      <Hint>Preencha os campos em branco. Caso não tiver, é só deixar em branco.</Hint>
      <FieldGrid>
        <TextField label="GitHub" value={p.github} onChange={v => update({ github: v })} icon={Code} />
        <TextField label="Behance" value={p.behance} onChange={v => update({ behance: v })} />
      </FieldGrid>
      <TextField label="Nota do Behance" value={p.behance_note} onChange={v => update({ behance_note: v })} />
    </Card>
  );
}
