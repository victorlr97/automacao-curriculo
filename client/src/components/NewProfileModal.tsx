import { useState } from 'react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { StatusMessage } from './ui/StatusMessage';
import { inputClasses } from './ui/TextField';

interface NewProfileModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function NewProfileModal({ open, onClose, onCreate }: NewProfileModalProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  function reset() {
    setName('');
    setStatus('');
    setError(false);
  }

  async function confirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus('Informe um nome.');
      setError(true);
      return;
    }
    setCreating(true);
    setStatus('Criando...');
    setError(false);
    try {
      await onCreate(trimmed);
      reset();
      onClose();
    } catch (err) {
      setStatus(`Erro: ${(err as Error).message}`);
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Novo perfil"
    >
      <p className="mb-4 text-sm text-ink-soft">
        Cria um banco de dados e uma lista de currículos totalmente separados, pra outra pessoa ou outro conjunto de
        dados.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-wide text-ink-soft">Nome</span>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirm();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              reset();
              onClose();
            }
          }}
          placeholder="Ex: Maria Silva"
          className={inputClasses}
        />
      </label>
      <div className="mt-4.5 flex justify-end gap-2.5">
        <Button
          variant="secondary"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancelar
        </Button>
        <Button variant="primary" onClick={confirm} disabled={creating}>
          Criar perfil
        </Button>
      </div>
      <StatusMessage error={error}>{status}</StatusMessage>
    </Modal>
  );
}
