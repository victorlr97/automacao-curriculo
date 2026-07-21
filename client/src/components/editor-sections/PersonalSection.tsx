import type { ProfileDatabase } from '../../types';
import { Card, FieldGrid, Hint } from '../ui/Card';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

export function PersonalSection({ db, onChange }: SectionProps) {
  const p = db.personal;
  function update(patch: Partial<ProfileDatabase['personal']>) {
    onChange({ ...db, personal: { ...p, ...patch } });
  }

  return (
    <Card title="Dados Pessoais">
      <Hint>Esses dados vão direto pro cabeçalho do currículo, do jeito que estão — a IA não reescreve nada aqui.</Hint>
      <FieldGrid>
        <TextField label="Nome" value={p.name} onChange={v => update({ name: v })} />
        <TextField label="Idade" type="number" value={p.age} onChange={v => update({ age: v === '' ? 0 : Number(v) || 0 })} />
        <TextField label="Localização" value={p.location} onChange={v => update({ location: v })} />
        <TextField label="Telefone" value={p.phone} onChange={v => update({ phone: v })} />
        <TextField label="Email" value={p.email} onChange={v => update({ email: v })} />
        <TextField label="GitHub" value={p.github} onChange={v => update({ github: v })} />
        <TextField label="LinkedIn" value={p.linkedin} onChange={v => update({ linkedin: v })} />
      </FieldGrid>
    </Card>
  );
}
