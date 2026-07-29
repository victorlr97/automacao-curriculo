import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

/** Mostrada quando o login funciona (conta existe no Firebase Auth) mas o
 * e-mail não está na allowlist do servidor — o app ainda está em beta
 * fechado enquanto o motor de IA depende da assinatura pessoal do Claude. */
export function NotAllowedScreen() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[380px] text-center">
        <ShieldAlert size={40} className="mx-auto mb-4 text-ink-faint" strokeWidth={1.5} />
        <h1 className="mb-2 text-lg font-bold text-ink">Acesso ainda não liberado</h1>
        <Card>
          <p className="text-sm text-ink-soft">
            A conta <strong>{user?.email}</strong> ainda não foi liberada pra usar o app — ele está em beta fechado.
            Entre em contato com o administrador pra pedir acesso.
          </p>
        </Card>
        <Button variant="secondary" onClick={signOut} className="mt-4 w-full justify-center">
          Sair
        </Button>
      </div>
    </div>
  );
}
