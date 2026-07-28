import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TONE_STYLES, type Tone } from '../../theme';

interface CardProps {
  title?: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Card({ title, icon: Icon, tone = 'accent', children, className = '' }: CardProps) {
  const toneStyles = TONE_STYLES[tone];
  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-white shadow-xs ${className}`}>
      {title && (
        <div className={`flex items-center gap-3 border-b border-border px-[22px] py-[18px] ${toneStyles.cardHeaderBg}`}>
          {Icon && (
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-xs ${toneStyles.cardIcon}`}>
              <Icon size={18} strokeWidth={2.25} />
            </span>
          )}
          <h3 className="text-xl font-bold text-ink">{title}</h3>
        </div>
      )}
      <div className="flex flex-col gap-4 p-6">{children}</div>
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-ink-soft">{children}</p>;
}
