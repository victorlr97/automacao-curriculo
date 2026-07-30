import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Option<T> {
  key: string;
  title: string;
  subtitle?: string;
  value: T;
}

interface AddEntryButtonProps<T> {
  label: string;
  options: Option<T>[];
  onPickOption: (value: T) => void;
  onAddBlank: () => void;
  blankLabel: string;
}

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 320;

/** Botão único pra adicionar um item numa seção de lista (experiência,
 * projetos): abre um menu com o que já existe pronto no banco de fatos (pré-
 * preenchido, um clique) e, embaixo, a opção de começar um item em branco pra
 * preencher à mão. As duas formas de adicionar vivem no mesmo menu em vez de
 * serem botões separados. Renderizado num portal, como o PeriodField, pra não
 * ser cortado pelo scroll do painel de edição. */
export function AddEntryButton<T>({ label, options, onPickOption, onAddBlank, blankLabel }: AddEntryButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8);
      const fitsBelow = rect.bottom + POPOVER_MAX_HEIGHT + 8 <= window.innerHeight;
      const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - POPOVER_MAX_HEIGHT - 6);
      setPosition({ top, left });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll(e: Event) {
      // Rolar a própria lista do menu não deve fechá-lo — só rolar o painel
      // por trás, que invalidaria a posição calculada do popover.
      if (popoverRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent px-5 py-3 text-[15px] font-bold font-body text-accent transition-all duration-150 hover:border-solid hover:bg-accent-soft"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: POPOVER_WIDTH, maxHeight: POPOVER_MAX_HEIGHT }}
            className="z-100 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-elevated"
          >
            {options.length > 0 && (
              <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wide text-ink-faint">
                Do banco de dados
              </p>
            )}
            {options.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onPickOption(opt.value);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent-soft"
              >
                <span className="block text-[13px] font-semibold text-ink">{opt.title}</span>
                {opt.subtitle && <span className="block text-[11.5px] text-ink-soft">{opt.subtitle}</span>}
              </button>
            ))}
            {options.length > 0 && <div className="my-1 border-t border-border" />}
            <button
              type="button"
              onClick={() => {
                onAddBlank();
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-accent transition-colors hover:bg-accent-soft"
            >
              <Plus size={14} />
              {blankLabel}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
