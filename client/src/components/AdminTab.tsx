import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, MessageSquare, XCircle } from 'lucide-react';
import * as api from '../api';
import type { AccessRequestListItem, FeedbackItem, FeedbackInsights } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StatusMessage } from './ui/StatusMessage';
import { formatDateTime, formatRelativeTime } from '../utils';

/** Aba visível só pra conta do dono do app (o bloqueio de verdade é o
 * requireOwner no servidor — aqui é só onde os dados aparecem). Mostra o
 * plano/resumo que a IA mantém automaticamente a partir do feedback
 * recebido, os pedidos de acesso pendentes (aprovar/recusar direto aqui, sem
 * precisar do e-mail), e o feedback bruto. */
export function AdminTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [insights, setInsights] = useState<FeedbackInsights | null>(null);
  const [requests, setRequests] = useState<AccessRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingUid, setDecidingUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [feedback, accessRequests] = await Promise.all([api.getAdminFeedback(), api.getAdminAccessRequests()]);
      setItems(feedback.items);
      setInsights(feedback.insights);
      setRequests(accessRequests);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecide(uid: string, decision: 'approved' | 'denied') {
    setDecidingUid(uid);
    try {
      await api.decideAccessRequest(uid, decision);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDecidingUid(null);
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-ink-soft">Carregando...</p>;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const decidedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <StatusMessage error>{error}</StatusMessage>

      <Card title="Plano da IA" icon={ClipboardList} tone="violet">
        {!insights ? (
          <p className="text-sm text-ink-soft">Nenhum feedback recebido ainda — o plano aparece aqui assim que o primeiro chegar.</p>
        ) : (
          <>
            {insights.lastError && (
              <p className="text-xs text-danger">Última tentativa de atualizar falhou: {insights.lastError}</p>
            )}
            <p className="text-sm text-ink">{insights.summary}</p>
            {insights.suggestedActions.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-ink-soft">
                {insights.suggestedActions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-ink-faint">
              Baseado em {insights.basedOnCount} feedback{insights.basedOnCount === 1 ? '' : 's'} — atualizado{' '}
              {formatRelativeTime(insights.updatedAt)}.
            </p>
          </>
        )}
      </Card>

      <Card title={`Pedidos de acesso pendentes (${pendingRequests.length})`} icon={ClipboardList} tone="teal">
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum pedido pendente.</p>
        ) : (
          pendingRequests.map(req => (
            <div key={req.uid} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {req.firstName} {req.lastName}
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {req.email} · nascido em {req.dateOfBirth} · pediu {formatRelativeTime(req.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  disabled={decidingUid === req.uid}
                  onClick={() => handleDecide(req.uid, 'approved')}
                >
                  <CheckCircle2 size={15} /> Liberar
                </Button>
                <Button variant="danger" disabled={decidingUid === req.uid} onClick={() => handleDecide(req.uid, 'denied')}>
                  <XCircle size={15} /> Recusar
                </Button>
              </div>
            </div>
          ))
        )}
        {decidedRequests.length > 0 && (
          <details className="mt-2 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold">Já decididos ({decidedRequests.length})</summary>
            <div className="mt-2 flex flex-col gap-1.5">
              {decidedRequests.map(req => (
                <p key={req.uid} className="text-xs">
                  {req.firstName} {req.lastName} ({req.email}) —{' '}
                  {req.status === 'approved' ? 'liberado' : 'recusado'} em{' '}
                  {req.decidedAt ? formatDateTime(req.decidedAt) : ''}
                </p>
              ))}
            </div>
          </details>
        )}
      </Card>

      <Card title={`Feedback recebido (${items.length})`} icon={MessageSquare} tone="accent">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum feedback recebido ainda.</p>
        ) : (
          items.map(item => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <p className="text-sm text-ink">{item.message}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {item.email} · {formatRelativeTime(item.createdAt)}
              </p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
