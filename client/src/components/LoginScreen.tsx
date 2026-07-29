import { useRef, useState, type FormEvent, type ReactNode, type WheelEvent } from 'react';
import { Building2, FolderKanban, LogIn, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { StatusMessage } from './ui/StatusMessage';
import { TextField } from './ui/TextField';

/** Mini-reconstrução da tela "Meus Dados" (nav de seções + card de campos),
 * fiel ao layout real — não é print, mas usa a mesma estrutura. */
function MockDatabase() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/10 text-[10px] backdrop-blur-sm">
      <div className="flex w-[38%] flex-col gap-1 border-r border-white/10 p-2">
        <div className="flex items-center gap-1.5 rounded-md bg-white/20 px-2 py-1.5 font-bold">
          <User size={11} /> Dados Pessoais
        </div>
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-white/60">
          <Building2 size={11} /> Experiências
        </div>
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-white/60">
          <FolderKanban size={11} /> Projetos
        </div>
      </div>
      <div className="flex-1 p-2.5">
        <div className="mb-2 h-2 w-16 rounded bg-white/40" />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-5 rounded bg-white/15" />
          <div className="h-5 rounded bg-white/15" />
          <div className="h-5 rounded bg-white/15" />
          <div className="h-5 rounded bg-white/15" />
        </div>
      </div>
    </div>
  );
}

/** Mini-reconstrução do formulário de geração (textarea da vaga + botão). */
function MockGenerate() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
      <div className="mb-2 h-2 w-28 rounded bg-white/40" />
      <div className="space-y-1.5 rounded-lg bg-white/10 p-2.5">
        <div className="h-1.5 w-full rounded bg-white/25" />
        <div className="h-1.5 w-[92%] rounded bg-white/25" />
        <div className="h-1.5 w-[96%] rounded bg-white/25" />
        <div className="h-1.5 w-[70%] rounded bg-white/25" />
      </div>
      <div className="mt-2.5 flex justify-end">
        <div className="rounded-md bg-white px-3 py-1.5 text-[10px] font-bold text-accent-dark">Gerar PDF</div>
      </div>
    </div>
  );
}

/** Mini-reconstrução da prévia do currículo gerado — documento branco de
 * verdade, igual ao ResumePreviewDocument, não um card translúcido. */
function MockPreview() {
  return (
    <div className="rounded-xl bg-white p-3.5 shadow-lg">
      <div className="h-2.5 w-24 rounded bg-ink" />
      <div className="mt-1.5 h-1.5 w-16 rounded bg-ink-faint" />
      <div className="mt-3 h-1.5 w-14 rounded bg-accent" />
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 w-full rounded bg-ink-faint/40" />
        <div className="h-1.5 w-[85%] rounded bg-ink-faint/40" />
      </div>
      <div className="mt-2.5 h-1.5 w-14 rounded bg-teal" />
      <div className="mt-1.5 space-y-1">
        <div className="h-1.5 w-full rounded bg-ink-faint/40" />
        <div className="h-1.5 w-[70%] rounded bg-ink-faint/40" />
      </div>
    </div>
  );
}

/** Mini-reconstrução da galeria "Meus Currículos" (grid de cards). */
function MockGallery() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="aspect-[3/4] rounded-lg border border-white/15 bg-white/10 p-1.5">
          <div className="h-full w-full rounded bg-white/10 p-1.5">
            <div className="h-1 w-[70%] rounded bg-white/30" />
            <div className="mt-1 h-1 w-[50%] rounded bg-white/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    title: 'Cadastre uma vez',
    description: 'Suas experiências, projetos, habilidades e formação viram uma base única. Você não reescreve isso a cada candidatura.',
    mockup: MockDatabase
  },
  {
    title: 'Cole a vaga',
    description: 'Cole a descrição da vaga do jeito que ela foi publicada, sem precisar adaptar nada manualmente antes.',
    mockup: MockGenerate
  },
  {
    title: 'A IA decide o que importa',
    description: 'Ela escolhe quais experiências e projetos destacar, e reescreve a descrição pra bater com o que a vaga pede.',
    mockup: MockPreview
  },
  {
    title: 'Fica tudo guardado',
    description: 'Cada PDF gerado fica salvo numa galeria, onde dá pra reabrir, editar ou comparar com outras versões depois.',
    mockup: MockGallery
  }
];

const SCENES: ReactNode[] = [
  <>
    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/70">Gerador de Currículo</p>
    <h2 className="max-w-[420px] text-4xl font-bold leading-tight">
      Um currículo novo pra cada vaga, sem reescrever do zero toda vez.
    </h2>
    <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-white/85">
      Mantenha uma única base com suas experiências, projetos e habilidades. A cada candidatura, a IA escolhe o que é
      relevante pra aquela vaga e monta um PDF pronto pra enviar.
    </p>
  </>,
  ...STEPS.map(({ title, description, mockup: Mockup }, idx) => (
    <div className="flex max-w-[720px] items-center gap-10">
      <div className="w-[260px] shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">Passo {idx + 1}</p>
        <p className="mt-1 text-xl font-bold">{title}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/80">{description}</p>
      </div>
      <div className="flex-1">
        <Mockup />
      </div>
    </div>
  )),
  <>
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">Por que isso importa</p>
    <p className="max-w-[420px] text-lg leading-relaxed text-white/90">
      A maioria das pessoas usa o mesmo currículo em todas as candidaturas, só trocando o nome do arquivo.
    </p>
    <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/80">
      Aqui, cada PDF sai montado a partir da vaga colada. Os fatos são sempre os mesmos, mas o que aparece em
      destaque muda conforme o que aquela vaga pede.
    </p>
  </>
];

type Phase = 'idle' | 'exiting' | 'entering';

/** Troca de "cena" fixa no lugar, sem barra de rolagem: a rolagem do mouse
 * avança/volta um índice, e a cena atual dá fade-out enquanto a próxima
 * entra na mesma posição — em vez de empurrar o conteúdo pra baixo. */
function usePinnedScenes(count: number) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [direction, setDirection] = useState(1);
  const lockedRef = useRef(false);

  function goTo(rawIndex: number, dir: number) {
    if (lockedRef.current) return;
    const nextIndex = (rawIndex + count) % count;
    if (nextIndex === index) return;
    lockedRef.current = true;
    setDirection(dir);
    setPhase('exiting');
    window.setTimeout(() => {
      setIndex(nextIndex);
      setPhase('entering');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setPhase('idle'));
      });
      window.setTimeout(() => {
        lockedRef.current = false;
      }, 400);
    }, 280);
  }

  function handleWheel(e: WheelEvent) {
    if (Math.abs(e.deltaY) < 4) return;
    goTo(index + (e.deltaY > 0 ? 1 : -1), e.deltaY > 0 ? 1 : -1);
  }

  return { index, phase, direction, handleWheel, goTo };
}

export function LoginScreen() {
  const { signIn, signUp, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const scenes = usePinnedScenes(SCENES.length);

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

  const transitionClass =
    scenes.phase === 'exiting'
      ? `opacity-0 ${scenes.direction > 0 ? '-translate-y-6' : 'translate-y-6'}`
      : scenes.phase === 'entering'
        ? `opacity-0 ${scenes.direction > 0 ? 'translate-y-6' : '-translate-y-6'}`
        : 'opacity-100 translate-y-0';

  return (
    <div className="flex h-screen">
      <div
        className="relative hidden overflow-hidden bg-linear-to-br from-accent to-accent-dark text-white lg:block lg:w-1/2"
        onWheel={scenes.handleWheel}
      >
        <div
          className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-center px-14 xl:px-16">
          <div className={`transition-all duration-300 ease-out ${transitionClass}`}>{SCENES[scenes.index]}</div>
        </div>

        <div className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col gap-2.5">
          {SCENES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Ir pro item ${idx + 1}`}
              onClick={() => scenes.goTo(idx, idx > scenes.index ? 1 : -1)}
              className={`h-2 w-2 rounded-full transition-all duration-200 ${
                idx === scenes.index ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-center bg-bg p-6 lg:w-1/2">
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
    </div>
  );
}
