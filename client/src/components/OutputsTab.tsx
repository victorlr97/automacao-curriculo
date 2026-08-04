import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import * as api from '../api';
import { useConfirm } from '../context/ConfirmContext';
import type { ResumeListItem } from '../types';
import { ResumesGrid } from './ResumesGrid';
import { StatusMessage } from './ui/StatusMessage';
import { inputClasses } from './ui/TextField';

interface OutputsTabProps {
  active: boolean;
}

/** `active` reflete se essa é a aba visível no momento — como o AppShell
 * mantém todas as abas montadas (só esconde via CSS pra preservar estado),
 * sem isso a lista só carregava uma vez, no primeiro carregamento do app: um
 * currículo gerado noutra aba só aparecia aqui depois de recarregar a
 * página inteira. Recarregar toda vez que a aba fica ativa resolve isso. */
export function OutputsTab({ active }: OutputsTabProps) {
  const confirm = useConfirm();
  const [items, setItems] = useState<ResumeListItem[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResumes = useCallback(async () => {
    try {
      const data = await api.getResumes();
      setItems(data);
      return data;
    } catch (err) {
      setImportStatus(`Erro ao carregar: ${(err as Error).message}`);
      setImportError(true);
      return [];
    }
  }, []);

  useEffect(() => {
    if (active) loadResumes();
  }, [active, loadResumes]);

  async function handleResumeMutated() {
    await loadResumes();
  }

  async function handleDelete(item: ResumeListItem) {
    const proceed = await confirm({
      title: 'Excluir currículo',
      message: `Excluir "${item.title}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true
    });
    if (!proceed) return;
    await api.deleteResume(item.slug);
    await loadResumes();
  }

  async function handleImportChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('Importando... (pode levar até 1 minuto)');
    setImportError(false);
    try {
      const data = await api.importResumeFromPdf(file, importFileName.trim());
      setImportStatus(`Importado: "${data.title}"`);
      await loadResumes();
    } catch (err) {
      setImportStatus(`Erro: ${(err as Error).message}`);
      setImportError(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImportFileName('');
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={importFileName}
          onChange={e => setImportFileName(e.target.value)}
          placeholder="Nome do arquivo (opcional)"
          className={`${inputClasses} max-w-[260px]`}
        />
        <label className="cursor-pointer">
          <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-soft px-5 py-2.5 text-sm font-bold text-accent-dark transition-colors duration-150 hover:bg-accent-soft-strong">
            Importar currículo (PDF)
          </span>
          <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={handleImportChange} />
        </label>
        <StatusMessage error={importError}>{importStatus}</StatusMessage>
      </div>
      <ResumesGrid items={items} onResumeMutated={handleResumeMutated} onDelete={handleDelete} />
    </div>
  );
}
