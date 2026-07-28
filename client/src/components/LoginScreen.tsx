import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StatusMessage } from './ui/StatusMessage';
import { TextField } from './ui/TextField';

export function LoginScreen() {
  const { signIn, signUp, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch {
      // erro já fica disponível via useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[380px]">
        <div className="mb-5 text-center">
          <LogIn size={40} className="mx-auto mb-4 text-ink-faint" strokeWidth={1.5} />
          <h1 className="mb-2 text-lg font-bold text-ink">Gerador de Currículo</h1>
          <p className="text-sm text-ink-soft">
            {mode === 'login' ? 'Entre com sua conta pra continuar.' : 'Crie sua conta pra começar.'}
          </p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
            <TextField label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            <StatusMessage error>{error}</StatusMessage>
            <Button type="submit" variant="primary" disabled={submitting} className="w-full justify-center">
              {submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </Card>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 w-full text-center text-sm text-ink-soft hover:text-accent"
        >
          {mode === 'login' ? 'Não tem conta? Criar uma agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}
