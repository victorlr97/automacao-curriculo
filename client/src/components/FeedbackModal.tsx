import { useState } from 'react';
import * as api from '../api';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { StatusMessage } from './ui/StatusMessage';
import { TextArea } from './ui/TextArea';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

/** Envia um feedback curto, salvo pro dono do app revisar na aba Admin — a
 * IA que resume tudo isso automaticamente roda no servidor, não aqui. */
export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.submitFeedback(message.trim());
      setSent(true);
      setMessage('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setSent(false);
    setError('');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Deixar feedback">
      {sent ? (
        <div className="flex flex-col gap-4">
          <StatusMessage>Obrigado! Seu feedback foi enviado.</StatusMessage>
          <Button variant="secondary" onClick={handleClose} className="w-full justify-center">
            Fechar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <TextArea
            label="O que você achou? O que poderia melhorar?"
            rows={5}
            value={message}
            onChange={setMessage}
            placeholder="Escreva aqui..."
          />
          <StatusMessage error>{error}</StatusMessage>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || !message.trim()}
            className="w-full justify-center"
          >
            {submitting ? 'Enviando...' : 'Enviar feedback'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
