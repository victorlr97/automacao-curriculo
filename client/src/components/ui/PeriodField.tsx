import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PeriodFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Idioma dos nomes de mês e do rótulo "Atual"/"Present" — currículos já
   * gerados podem estar em inglês; o banco de fatos não tem idioma, fica em
   * português. */
  language?: 'pt' | 'en';
}

const MONTHS: Record<'pt' | 'en', string[]> = {
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};
const MONTHS_SHORT: Record<'pt' | 'en', string[]> = {
  pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};
const PRESENT_LABEL: Record<'pt' | 'en', string> = { pt: 'Atual', en: 'Present' };
const PRESENT_PATTERN = /^(atual|presente|present|now|current)$/i;

const POPOVER_WIDTH = 420;
const POPOVER_HEIGHT_ESTIMATE = 340;

interface MonthYear {
  /** Ausente quando o texto original só tinha o ano (ex: "2016-2023"). */
  month?: number;
  year: number;
}

function parsePart(text: string): MonthYear | null {
  const trimmed = text.trim();
  const withMonth = trimmed.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
  if (withMonth) {
    const name = withMonth[1].toLowerCase();
    const idx = MONTHS.pt.findIndex(x => x.toLowerCase() === name) >= 0
      ? MONTHS.pt.findIndex(x => x.toLowerCase() === name)
      : MONTHS.en.findIndex(x => x.toLowerCase() === name);
    if (idx !== -1) return { month: idx, year: Number(withMonth[2]) };
  }
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]) };
  return null;
}

function parseValue(value: string): { start: MonthYear | null; end: MonthYear | null; present: boolean } {
  const parts = value.split(/\s*[-–—]\s*/);
  const start = parts[0] ? parsePart(parts[0]) : null;
  const rest = parts[1]?.trim() ?? '';
  const present = PRESENT_PATTERN.test(rest);
  const end = present ? null : rest ? parsePart(rest) : null;
  return { start, end, present };
}

function formatPart(part: MonthYear | null, language: 'pt' | 'en'): string {
  if (!part) return '';
  if (part.month === undefined) return String(part.year);
  return `${MONTHS[language][part.month]} ${part.year}`;
}

/** Campo de período (experiência/formação) com um seletor tipo calendário
 * (mês + ano, início e fim) em vez de exigir que a pessoa digite o texto
 * inteiro. O valor continua sendo salvo como texto livre — só a forma de
 * preencher muda. O painel é renderizado num portal (fora do container com
 * scroll do editor) pra nunca ficar cortado, com a posição calculada a
 * partir do campo. */
export function PeriodField({ label, value, onChange, language = 'pt' }: PeriodFieldProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [start, setStart] = useState<MonthYear | null>(null);
  const [end, setEnd] = useState<MonthYear | null>(null);
  const [present, setPresent] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function openPicker() {
    const parsed = parseValue(value);
    setStart(parsed.start);
    setEnd(parsed.end);
    setPresent(parsed.present);

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPOVER_WIDTH - 8);
      const fitsBelow = rect.bottom + POPOVER_HEIGHT_ESTIMATE + 8 <= window.innerHeight;
      const top = fitsBelow ? rect.bottom + 6 : Math.max(8, rect.top - POPOVER_HEIGHT_ESTIMATE - 6);
      setPosition({ top, left });
    }
    setOpen(true);
  }

  function commit(nextStart: MonthYear | null, nextEnd: MonthYear | null, nextPresent: boolean) {
    const startStr = formatPart(nextStart, language);
    const endStr = nextPresent ? PRESENT_LABEL[language] : formatPart(nextEnd, language);
    const composed = !startStr ? endStr : !endStr ? startStr : `${startStr} - ${endStr}`;
    onChange(composed);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const content = (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-left font-body text-sm text-ink transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15"
      >
        <span className={value ? '' : 'text-ink-faint'}>{value || 'Selecionar período'}</span>
        <Calendar size={15} className="shrink-0 text-ink-faint" />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: position.top, left: position.left, width: POPOVER_WIDTH }}
            className="z-100 rounded-xl border border-border bg-white p-4 shadow-elevated"
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <span className="text-[13px] font-bold text-ink">Selecionar período</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-faint hover:bg-bg hover:text-ink">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2">
              <div className="pr-4">
                <MonthYearPicker
                  title="Início"
                  value={start}
                  language={language}
                  onSelect={my => {
                    setStart(my);
                    commit(my, end, present);
                  }}
                />
              </div>
              <div className="border-l border-border pl-4">
                <MonthYearPicker
                  title="Fim"
                  value={end}
                  language={language}
                  disabled={present}
                  onSelect={my => {
                    setEnd(my);
                    commit(start, my, present);
                  }}
                />
                <label className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={e => {
                      setPresent(e.target.checked);
                      commit(start, end, e.target.checked);
                    }}
                    className="accent-accent"
                  />
                  {PRESENT_LABEL[language]}
                </label>
              </div>
            </div>
            {value && (
              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setStart(null);
                    setEnd(null);
                    setPresent(false);
                    onChange('');
                  }}
                  className="text-[12px] font-semibold text-danger hover:underline"
                >
                  Limpar período
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );

  if (!label) return content;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wide text-ink-soft">{label}</span>
      {content}
    </div>
  );
}

function MonthYearPicker({
  title,
  value,
  language,
  disabled = false,
  onSelect
}: {
  title: string;
  value: MonthYear | null;
  language: 'pt' | 'en';
  disabled?: boolean;
  onSelect: (value: MonthYear) => void;
}) {
  const [viewYear, setViewYear] = useState(value?.year ?? new Date().getFullYear());

  return (
    <div className={disabled ? 'pointer-events-none opacity-40' : ''}>
      <span className="mb-3 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-accent-dark">
        {title}
      </span>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setViewYear(y => y - 1)} className="rounded-md p-1 text-ink-faint hover:bg-bg hover:text-ink">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[15px] font-bold text-ink">{viewYear}</span>
        <button type="button" onClick={() => setViewYear(y => y + 1)} className="rounded-md p-1 text-ink-faint hover:bg-bg hover:text-ink">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS_SHORT[language].map((m, idx) => {
          const selected = value?.month === idx && value?.year === viewYear;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelect({ month: idx, year: viewYear })}
              className={`rounded-md py-1 text-[12px] font-semibold transition-colors ${
                selected ? 'bg-accent text-white' : 'text-ink-2 hover:bg-accent-soft'
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
