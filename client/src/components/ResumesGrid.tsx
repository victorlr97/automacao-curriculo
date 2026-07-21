import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import type { ResolvedResume, ResumeListItem } from '../types';
import { ResumeAccordionEditor } from './resumes/ResumeAccordionEditor';
import { ResumeCard } from './resumes/ResumeCard';
import { Modal } from './ui/Modal';
import { StatusMessage } from './ui/StatusMessage';

interface ResumesGridProps {
  profileId: string;
  items: ResumeListItem[];
  onResumeMutated: (newSlug: string) => Promise<void>;
  onDelete: (item: ResumeListItem) => void;
}

/** Grid de cards (thumbnail + título/cargo + ações) no lugar da antiga lista +
 * painel lateral. Clicar na miniatura ou em "Editar" abrem o mesmo editor em
 * acordeão com prévia ao vivo. */
export function ResumesGrid({ profileId, items, onResumeMutated, onDelete }: ResumesGridProps) {
  const [resolvedBySlug, setResolvedBySlug] = useState<Record<string, ResolvedResume | null>>({});
  const [translatingSlug, setTranslatingSlug] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState('');
  const [editingItem, setEditingItem] = useState<ResumeListItem | null>(null);
  const requestedSlugs = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    items.forEach(item => {
      if (requestedSlugs.current.has(item.slug)) return;
      requestedSlugs.current.add(item.slug);
      api
        .getResumeJson(item.pdfUrl)
        .then(data => {
          if (!cancelled) setResolvedBySlug(prev => ({ ...prev, [item.slug]: data }));
        })
        .catch(() => {
          if (!cancelled) setResolvedBySlug(prev => ({ ...prev, [item.slug]: null }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  async function handleTranslate(item: ResumeListItem) {
    setTranslatingSlug(item.slug);
    setTranslateError('');
    try {
      const res = await api.translateResume(profileId, item.slug);
      await onResumeMutated(res.slug);
    } catch (err) {
      setTranslateError(`Erro ao traduzir "${item.title}": ${(err as Error).message}`);
    } finally {
      setTranslatingSlug(null);
    }
  }

  if (!items.length) {
    return <p className="text-sm text-ink-soft">Nenhum currículo gerado ainda. Gere um na tela "Currículo".</p>;
  }

  return (
    <>
      {translateError && (
        <div className="mb-4">
          <StatusMessage error>{translateError}</StatusMessage>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <ResumeCard
            key={item.slug}
            item={item}
            resolved={resolvedBySlug[item.slug] ?? null}
            translating={translatingSlug === item.slug}
            onPreview={() => setEditingItem(item)}
            onEdit={() => setEditingItem(item)}
            onTranslate={() => handleTranslate(item)}
            onDelete={() => onDelete(item)}
          />
        ))}
      </div>

      <Modal open={editingItem !== null} onClose={() => setEditingItem(null)} title={editingItem?.title ?? ''} size="full">
        {editingItem && (
          <ResumeAccordionEditor
            key={editingItem.slug}
            profileId={profileId}
            item={editingItem}
            onResumeMutated={onResumeMutated}
          />
        )}
      </Modal>
    </>
  );
}
