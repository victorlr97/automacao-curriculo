import { Languages as LanguagesIcon } from 'lucide-react';
import type { LanguageEntry, ProfileDatabase } from '../../types';
import { makeListEditor } from '../../listEditor';
import { Button } from '../ui/Button';
import { Card, Hint } from '../ui/Card';
import { LanguageEntryRow } from '../ui/LanguageEntryRow';

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
    <Card title="Idiomas" icon={LanguagesIcon} tone="violet">
      <Hint>Todos aparecem no currículo, sem filtro por vaga.</Hint>
      {languages.items.map((lang, idx) => (
        <LanguageEntryRow
          key={idx}
          name={lang.name}
          level={lang.level}
          onNameChange={v => languages.updateAt(idx, { name: v })}
          onLevelChange={v => languages.updateAt(idx, { level: v })}
          onRemove={() => languages.removeAt(idx)}
        />
      ))}
      <Button variant="add" onClick={() => languages.add(blank())}>
        + Adicionar idioma
      </Button>
    </Card>
  );
}
