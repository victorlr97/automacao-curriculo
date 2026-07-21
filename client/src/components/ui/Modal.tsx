import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Size = 'sm' | 'lg' | 'full';

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'max-w-[400px]',
  lg: 'max-h-[90vh] max-w-[880px] overflow-y-auto',
  full: 'h-[92vh] max-w-[1400px] flex flex-col overflow-hidden'
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: Size;
}

export function Modal({ open, onClose, title, children, size = 'sm' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink/50 p-5 backdrop-blur-[2px]"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full rounded-xl border border-border bg-white p-6 shadow-elevated ${SIZE_CLASSES[size]}`}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-bg hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className={size === 'full' ? '-mx-6 -mb-6 min-h-0 flex-1 overflow-hidden' : ''}>{children}</div>
      </div>
    </div>
  );
}
