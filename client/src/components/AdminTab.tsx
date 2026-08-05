import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, MessageSquare, XCircle } from 'lucide-react';
import * as api from '../api';
import type { AccessRequestListItem, UserFeedbackGroup } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StatusMessage } from './ui/StatusMessage';
import { formatDateTime, formatRelativeTime } from '../utils';

/** Aba visível só pra conta do dono do app (o bloqueio de verdade é o
 * requireOwner no servidor — aqui é só onde os dados aparecem). Mostra os
 * pedidos de acesso pendentes (aprovar/recusar direto aqui, sem precisar do
 * e-mail) e o feedback recebido — cada pessoa com o próprio plano gerado
 * pela IA, separado do de qualquer outra (não é um resumo agregado). */
export function AdminTab() {
  const [userGroups, setUserGroups] = useState<UserFeedbackGroup[]>([]);
  const [requests, setRequests] = useState<AccessRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingUid, setDecidingUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [feedback, accessRequests] = await Promise.all([api.getAdminFeedback(), api.getAdminAccessRequests()]);
      setUserGroups(feedback.users);
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

      <Card title={`Feedback por usuário (${userGroups.length})`} icon={MessageSquare} tone="accent">
        {userGroups.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum feedback recebido ainda.</p>
        ) : (
          userGroups.map(group => (
            <div key={group.uid} className="rounded-lg border border-border p-4">
              <p className="text-sm font-bold text-ink">{group.email}</p>

              {group.insights ? (
                <div className="mt-2">
                  {group.insights.lastError && (
                    <p className="text-xs text-danger">Última tentativa de atualizar falhou: {group.insights.lastError}</p>
                  )}
                  <p className="text-sm text-ink">{group.insights.summary}</p>
                  {group.insights.suggestedActions.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-ink-soft">
                      {group.insights.suggestedActions.map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-xs text-ink-faint">
                    Baseado em {group.insights.basedOnCount} feedback{group.insights.basedOnCount === 1 ? '' : 's'} —
                    atualizado {formatRelativeTime(group.insights.updatedAt)}.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">Plano ainda não gerado.</p>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
                  Feedback bruto ({group.items.length})
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {group.items.map(item => (
                    <div key={item.id} className="rounded-lg bg-bg p-2.5">
                      <p className="text-sm text-ink">{item.message}</p>
                      <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
