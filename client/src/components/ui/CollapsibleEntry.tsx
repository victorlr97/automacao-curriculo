import type { ReactNode } from 'react';
import { RemoveButton } from './RemoveButton';

interface CollapsibleEntryProps {
  title: string;
  onRemove: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Bloco recolhível pra um item de uma lista dinâmica (uma experiência, um
 * projeto, uma formação) — equivalente ao `detailsBlock` do app.js original. */
export function CollapsibleEntry({ title, onRemove, children, defaultOpen = false }: CollapsibleEntryProps) {
  return (
    <details
      open={defaultOpen}
      className="group mb-3.5 rounded-lg border border-border bg-[#fbfcfd] p-4 transition-colors duration-150 hover:border-border-strong open:pb-4.5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ink">
          <span className="mr-1.5 inline-block text-ink-soft transition-transform duration-150 group-open:rotate-90">▸</span>
          {title}
        </span>
        <RemoveButton
          label="Remover"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
        />
      </summary>
      <div className="mt-3.5 flex flex-col gap-3.5">{children}</div>
    </details>
  );
}
