import { Download, Languages, Pencil, Trash2 } from 'lucide-react';
import type { ResolvedResume, ResumeListItem } from '../../types';
import { formatRelativeTime } from '../../utils';
import { ResumeThumbnail } from './ResumeThumbnail';

interface ResumeCardProps {
  item: ResumeListItem;
  resolved: ResolvedResume | null;
  translating: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onTranslate: () => void;
  onDelete: () => void;
}

export function ResumeCard({ item, resolved, translating, onPreview, onEdit, onTranslate, onDelete }: ResumeCardProps) {
  return (
    <div>
      <div className="flex gap-4 rounded-xl border border-border bg-white p-4 shadow-xs transition-shadow duration-150 hover:shadow-elevated">
        <button type="button" onClick={onPreview} className="cursor-pointer">
          <ResumeThumbnail resolved={resolved} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate text-[15px] font-bold text-ink" title={item.title}>
            {item.title}
          </h3>
          {resolved && (
            <p className="mt-0.5 truncate text-[12.5px] text-ink-soft" title={resolved.title}>
              {resolved.title}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-0.5">
            <CardAction icon={Pencil} label="Editar currículo" onClick={onEdit} />
            <CardAction
              icon={Languages}
              label={translating ? 'Traduzindo...' : item.language === 'en' ? 'Traduzir p/ Português' : 'Traduzir p/ Inglês'}
              onClick={onTranslate}
              disabled={translating}
            />
            <CardAction icon={Download} label="Baixar PDF" href={item.pdfUrl} />
            <CardAction icon={Trash2} label="Excluir" onClick={onDelete} danger />
          </div>
        </div>
      </div>
      <p className="mt-1.5 pl-1 text-[11.5px] text-ink-faint">Editado {formatRelativeTime(item.generatedAt)}</p>
    </div>
  );
}

interface CardActionProps {
  icon: typeof Pencil;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
}

function CardAction({ icon: Icon, label, onClick, href, disabled = false, danger = false }: CardActionProps) {
  const classes = `flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-semibold transition-colors duration-150 ${
    danger ? 'text-danger hover:bg-danger-soft' : 'text-ink-2 hover:bg-bg'
  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        <Icon size={15} />
        {label}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      <Icon size={15} />
      {label}
    </button>
  );
}
