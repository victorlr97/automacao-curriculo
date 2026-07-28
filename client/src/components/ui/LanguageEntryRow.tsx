import { RemoveButton } from './RemoveButton';
import { Select } from './Select';
import { TextField } from './TextField';

export const LANGUAGE_LEVELS: Record<'pt' | 'en', string[]> = {
  pt: ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'],
  en: ['Basic', 'Intermediate', 'Advanced', 'Fluent', 'Native']
};

interface LanguageEntryRowProps {
  name: string;
  level: string;
  onNameChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onRemove: () => void;
  language?: 'pt' | 'en';
}

/** Uma linha de idioma — nome + nível já visíveis lado a lado num único box
 * (sem precisar expandir nada, já que são só 2 campos). O nível é um select
 * com uma escala fixa em vez de texto livre. */
export function LanguageEntryRow({ name, level, onNameChange, onLevelChange, onRemove, language = 'pt' }: LanguageEntryRowProps) {
  const levels = LANGUAGE_LEVELS[language];
  const options = levels.includes(level) || !level ? levels : [level, ...levels];

  return (
    <div className="flex items-end gap-2 rounded-lg border border-border bg-[#fbfcfd] p-3">
      <div className="flex-1">
        <TextField label="Idioma" value={name} onChange={onNameChange} />
      </div>
      <div className="flex-1">
        <Select label="Nível" value={level} onChange={onLevelChange} className="w-full">
          <option value="" disabled>
            Selecione
          </option>
          {options.map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </div>
      <RemoveButton onClick={onRemove} />
    </div>
  );
}
