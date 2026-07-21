import type { ReactNode } from 'react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%235b6570' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>\")";

export function Select({ value, onChange, children, className = '', ...rest }: SelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ backgroundImage: CHEVRON, backgroundPosition: 'right 10px center', backgroundRepeat: 'no-repeat', backgroundSize: '10px' }}
      className={`min-w-[170px] appearance-none rounded-lg border border-border bg-white py-2.5 pl-3 pr-8 font-body text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
