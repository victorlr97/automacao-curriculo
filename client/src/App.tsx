import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { DatabaseEditorTab } from './components/DatabaseEditorTab';
import { NewProfileModal } from './components/NewProfileModal';
import { OutputsTab } from './components/OutputsTab';
import { ResumeWorkspace } from './components/ResumeWorkspace';
import { Sidebar, type Destination } from './components/Sidebar';
import { Button } from './components/ui/Button';
import { ConfirmProvider } from './context/ConfirmContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';

function WelcomeScreen() {
  const { createProfile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex h-screen items-center justify-center bg-bg p-6">
      <div className="max-w-[380px] text-center">
        <UserPlus size={40} className="mx-auto mb-4 text-ink-faint" strokeWidth={1.5} />
        <h1 className="mb-2 text-lg font-bold text-ink">Bem-vindo ao Gerador de Currículo</h1>
        <p className="mb-5 text-sm text-ink-soft">
          Crie seu primeiro perfil pra começar a preencher seus dados e gerar currículos sob medida pra cada vaga.
        </p>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Criar meu primeiro perfil
        </Button>
      </div>
      <NewProfileModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createProfile} />
    </div>
  );
}

function AppShell() {
  const { profiles, loading } = useProfile();
  const [destination, setDestination] = useState<Destination>('database');

  if (loading) return null;
  if (profiles.length === 0) return <WelcomeScreen />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={destination} onChange={setDestination} />
      <div className="flex-1 overflow-hidden">
        <div className={destination === 'database' ? 'h-full' : 'hidden'}>
          <DatabaseEditorTab />
        </div>
        <div className={destination === 'workspace' ? 'h-full' : 'hidden'}>
          <ResumeWorkspace />
        </div>
        <div className={destination === 'outputs' ? 'h-full overflow-y-auto p-8' : 'hidden'}>
          <OutputsTab />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <ConfirmProvider>
        <AppShell />
      </ConfirmProvider>
    </ProfileProvider>
  );
}
