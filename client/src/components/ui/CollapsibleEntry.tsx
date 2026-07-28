import { ChevronRight } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { RemoveButton } from './RemoveButton';

interface CollapsibleEntryProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  onRemove: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** Bloco recolhível pra um item de uma lista dinâmica (uma experiência, um
 * projeto, uma formação). Título em destaque + subtítulo (cargo/instituição)
 * + meta (período) à direita, pra dar hierarquia visual real em vez de só
 * uma linha de texto solta. */
export function CollapsibleEntry({ title, subtitle, meta, icon: Icon, onRemove, children, defaultOpen = false }: CollapsibleEntryProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-border bg-[#fbfcfd] p-4 transition-all duration-150 hover:border-border-strong hover:shadow-elevated open:pb-4.5"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-start gap-2">
          <ChevronRight
            size={15}
            className="mt-[3px] shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-90"
          />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{title}</div>
            {subtitle && (
              <div className="mt-1 flex items-center gap-1 truncate text-[13px] text-ink-soft">
                {Icon && <Icon size={12} className="shrink-0 text-ink-faint" />}
                <span className="truncate">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {meta && <span className="whitespace-nowrap text-[12px] text-ink-faint">{meta}</span>}
          <RemoveButton
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
          />
        </div>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}
