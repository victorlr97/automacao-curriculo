import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Substitui o `confirm()` nativo do navegador (visual quebrado, destoa do
 * resto do app) por um modal no mesmo estilo do resto da UI. Um único
 * provider no topo do app resolve pra qualquer componente/hook via
 * `useConfirm()`, sem precisar de estado de modal duplicado em cada lugar. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmFn>(options => {
    return new Promise(resolve => setState({ ...options, resolve }));
  }, []);

  function settle(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={state !== null} onClose={() => settle(false)} title={state?.title ?? 'Confirmar ação'}>
        <p className="mb-4 text-sm text-ink-soft">{state?.message}</p>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => settle(false)}>
            {state?.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {state?.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>');
  return ctx;
}
