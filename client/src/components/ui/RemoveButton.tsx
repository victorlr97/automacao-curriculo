import type { ButtonHTMLAttributes } from 'react';

interface RemoveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

/** Ação destrutiva pequena e discreta (excluir currículo, excluir perfil,
 * remover um item de uma lista dinâmica no editor). */
export function RemoveButton({ label = 'Excluir', className = '', ...rest }: RemoveButtonProps) {
  return (
    <button
      type="button"
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent ${className}`}
      {...rest}
    >
      {label}
    </button>
  );
}
