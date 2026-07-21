import { useState } from 'react';
import { useConfirm } from '../context/ConfirmContext';
import { useProfile } from '../context/ProfileContext';
import { NewProfileModal } from './NewProfileModal';
import { RemoveButton } from './ui/RemoveButton';
import { Select } from './ui/Select';

interface ProfileSwitcherProps {
  collapsed?: boolean;
}

export function ProfileSwitcher({ collapsed = false }: ProfileSwitcherProps) {
  const { profiles, currentProfileId, currentProfile, selectProfile, createProfile, deleteProfile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const confirm = useConfirm();

  async function handleDelete() {
    if (!currentProfile) return;
    const proceed = await confirm({
      title: 'Excluir perfil',
      message: `Excluir o perfil "${currentProfile.name}"? Isso apaga o banco de dados e todos os currículos gerados dele. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir perfil',
      danger: true
    });
    if (!proceed) return;
    await deleteProfile(currentProfile.id);
  }

  if (collapsed) {
    return (
      <div
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-dark"
        title={currentProfile?.name ?? 'Nenhum perfil'}
      >
        {currentProfile?.name.charAt(0).toUpperCase() ?? '?'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={currentProfileId ?? ''} onChange={selectProfile} aria-label="Perfil ativo" className="w-full">
        {profiles.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent-dark transition-colors hover:bg-accent-soft-strong"
        >
          + Novo perfil
        </button>
        <RemoveButton label="Excluir" onClick={handleDelete} disabled={profiles.length <= 1} />
      </div>
      <NewProfileModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createProfile} />
    </div>
  );
}
