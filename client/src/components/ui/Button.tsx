import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'add' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-xs hover:bg-accent-dark hover:shadow-elevated hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:bg-accent/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none',
  secondary:
    'bg-accent-soft text-accent-dark hover:bg-accent-soft-strong disabled:opacity-50 disabled:cursor-not-allowed',
  add: 'bg-transparent border border-dashed border-accent text-accent hover:bg-accent-soft hover:border-solid',
  danger:
    'bg-danger text-white shadow-xs hover:bg-danger-dark hover:shadow-elevated hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:bg-danger/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none'
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  href?: string;
}

/** Botão de ação padrão do app. `href` renderiza como link (abrir PDF em nova
 * aba) mantendo a mesma aparência de botão. */
export function Button({ variant = 'secondary', className = '', children, href, ...rest }: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-bold font-body transition-all duration-150 cursor-pointer ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
