import { Trash2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface RemoveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

/** Ação destrutiva pequena e discreta (excluir perfil, remover um item de
 * uma lista dinâmica no editor). Sem `label`, vira um ícone de lixeira —
 * mais compacto pra listas com muitas linhas repetidas. */
export function RemoveButton({ label, className = '', ...rest }: RemoveButtonProps) {
  if (!label) {
    return (
      <button
        type="button"
        title="Remover"
        className={`shrink-0 rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
        {...rest}
      >
        <Trash2 size={14} />
      </button>
    );
  }

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
