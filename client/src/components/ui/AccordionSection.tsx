import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface AccordionSectionProps {
  id: string;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Cabeçalho de seção recolhível — mesma linguagem visual do chevron de
 * `CollapsibleEntry`, mas pro nível de seção inteira (Objetivo, Experiência...)
 * em vez de um item de lista. */
export function AccordionSection({ id, title, count, open, onToggle, children }: AccordionSectionProps) {
  return (
    <div id={`accordion-${id}`} className="border-b border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 py-3 text-left transition-colors hover:text-accent-dark"
      >
        <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
          <ChevronRight size={14} className={`text-ink-faint transition-transform duration-150 ${open ? 'rotate-90' : ''}`} />
          {title}
        </span>
        {typeof count === 'number' && <span className="text-[11px] font-bold text-ink-faint">{count}</span>}
      </button>
      {open && <div className="flex flex-col gap-2 pb-4 pl-5">{children}</div>}
    </div>
  );
}
