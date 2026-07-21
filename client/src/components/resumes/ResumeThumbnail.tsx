import { FileText } from 'lucide-react';
import type { ResolvedResume } from '../../types';
import { ResumePreviewDocument } from '../workspace/ResumePreviewDocument';

const DOC_WIDTH = 820;
const THUMB_WIDTH = 132;
const THUMB_HEIGHT = 170;
const SCALE = THUMB_WIDTH / DOC_WIDTH;

interface ResumeThumbnailProps {
  resolved: ResolvedResume | null;
}

/** Miniatura do currículo reaproveitando o mesmo documento renderizado da
 * coluna central do workspace, só encolhido via CSS — mostra o conteúdo real
 * (não um ícone genérico) sem duplicar a lógica de layout do currículo. */
export function ResumeThumbnail({ resolved }: ResumeThumbnailProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-border bg-white"
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
    >
      {resolved ? (
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
          style={{ width: DOC_WIDTH, transform: `scale(${SCALE})` }}
        >
          <ResumePreviewDocument data={resolved} onSectionClick={() => {}} />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center bg-bg">
          <FileText size={26} className="text-ink-faint" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
