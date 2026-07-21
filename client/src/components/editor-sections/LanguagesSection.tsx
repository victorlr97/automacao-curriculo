import type { LanguageEntry, ProfileDatabase } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { Card, FieldGrid, Hint } from '../ui/Card';
import { CollapsibleEntry } from '../ui/CollapsibleEntry';
import { TextField } from '../ui/TextField';

interface SectionProps {
  db: ProfileDatabase;
  onChange: (db: ProfileDatabase) => void;
}

function blank(): LanguageEntry {
  return { name: '', level: '' };
}

export function LanguagesSection({ db, onChange }: SectionProps) {
  const languages = makeListEditor(db.languages, next => onChange({ ...db, languages: next }));

  return (
    <Card title="Idiomas">
      <Hint>Todos aparecem no currículo, sem filtro por vaga.</Hint>
      {languages.items.map((lang, idx) => (
        <CollapsibleEntry key={idx} title={lang.name || `Idioma ${idx + 1}`} onRemove={() => languages.removeAt(idx)}>
          <FieldGrid>
            <TextField label="Nome" value={lang.name} onChange={v => languages.updateAt(idx, { name: v })} />
            <TextField label="Nível" value={lang.level} onChange={v => languages.updateAt(idx, { level: v })} />
          </FieldGrid>
        </CollapsibleEntry>
      ))}
      <Button variant="add" onClick={() => languages.add(blank())}>
        + Adicionar idioma
      </Button>
    </Card>
  );
}
