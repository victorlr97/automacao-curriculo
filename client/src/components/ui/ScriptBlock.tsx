import { useState } from 'react';

interface ScriptBlockProps {
  script: string;
  title?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

/** Bloco de texto complementar ao currículo (roteiro de vídeo, carta de
 * apresentação) — itálico pra diferenciar do resto da UI, já que é um texto
 * pra copiar e colar em outro lugar, não um campo do currículo em si. */
export function ScriptBlock({ script, title = 'Texto de apresentação (vídeo)' }: ScriptBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(script);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    } finally {
      setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  return (
    <div className="mt-4 rounded-r-lg border-l-[3px] border-accent bg-accent-soft py-4 pl-4.5 pr-4">
      <div className="mb-2.5 flex items-center justify-between gap-2.5">
        <h4 className="font-body text-[13px] font-bold uppercase tracking-wide text-accent-dark">{title}</h4>
        <button
          type="button"
          onClick={copy}
          className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
            copyState === 'failed' ? 'bg-danger-soft text-danger' : 'bg-white/70 text-accent-dark hover:bg-white'
          }`}
        >
          {copyState === 'copied' ? 'Copiado!' : copyState === 'failed' ? 'Selecione o texto manualmente' : 'Copiar'}
        </button>
      </div>
      <p className="whitespace-pre-wrap font-body text-[14.5px] italic leading-relaxed text-ink-2">{script}</p>
    </div>
  );
}
