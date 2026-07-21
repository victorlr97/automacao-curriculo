import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-border bg-white p-5 shadow-xs ${className}`}>
      {title && <h3 className="mb-3 border-b border-border pb-3 text-base font-bold">{title}</h3>}
      {children}
    </div>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-[13px] leading-relaxed text-ink-soft">{children}</p>;
}
