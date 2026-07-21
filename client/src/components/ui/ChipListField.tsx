import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface ChipListFieldProps {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

/** Lista curta de itens (habilidades) como chips removíveis, em vez de texto
 * corrido — digita e aperta Enter/vírgula pra criar um chip, Backspace no
 * campo vazio remove o último. */
export function ChipListField({ label, items, onChange, placeholder }: ChipListFieldProps) {
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const value = draft.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setDraft('');
  }

  function removeAt(idx: number) {
    const next = items.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      removeAt(items.length - 1);
    }
  }

  const content = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-white p-2.5 transition-colors duration-150 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/15">
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1.5 text-[12.5px] font-semibold text-accent-dark">
          {item}
          <button
            type="button"
            onClick={() => removeAt(idx)}
            aria-label={`Remover ${item}`}
            className="rounded-full p-0.5 text-accent-dark/70 transition-colors hover:bg-accent-soft-strong hover:text-accent-dark"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={placeholder ?? (items.length ? 'Adicionar...' : 'Digite e pressione Enter')}
        className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-[13px] text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  );

  if (!label) return content;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      {content}
    </label>
  );
}
