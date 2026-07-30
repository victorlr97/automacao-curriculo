import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Option<T> {
  key: string;
  title: string;
  subtitle?: string;
  value: T;
}

interface AddFromDatabaseButtonProps<T> {
  label: string;
  options: Option<T>[];
  onPick: (value: T) => void;
}

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 280;

/** Botão que abre a lista de itens do banco de fatos ainda não presentes
 * nesse currículo — pra adicionar algo que a IA deixou de fora (ou que não
 * era relevante pra outra vaga) sem precisar digitar tudo de novo do zero.
 * Some sozinho quando não sobra nada pra oferecer. Renderizado num portal,
 * como o PeriodField, pra não ser cortado pelo scroll do painel de edição. */
export function AddFromDatabaseButton<T>({ label, options, onPick }: AddFromDatabaseButtonProps<T>) {
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

  if (options.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-dashed border-border-strong px-3 py-2 text-[13px] font-bold font-body text-ink-soft transition-all duration-150 hover:border-accent hover:text-accent"
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
            {options.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onPick(opt.value);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent-soft"
              >
                <span className="block text-[13px] font-semibold text-ink">{opt.title}</span>
                {opt.subtitle && <span className="block text-[11.5px] text-ink-soft">{opt.subtitle}</span>}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
