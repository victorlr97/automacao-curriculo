import { useEffect, useState } from 'react';
import * as api from './api';
import { ApiError } from './api';
import { DatabaseEditorTab } from './components/DatabaseEditorTab';
import { LoginScreen } from './components/LoginScreen';
import { NotAllowedScreen } from './components/NotAllowedScreen';
import { OutputsTab } from './components/OutputsTab';
import { ResumeWorkspace } from './components/ResumeWorkspace';
import { Sidebar, type Destination } from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';

function AppShell() {
  const [destination, setDestination] = useState<Destination>('database');

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

function AuthGate() {
  const { user, loading } = useAuth();
  // null = ainda checando, true = liberado, false = bloqueado pela allowlist
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAllowed(null);
      return;
    }
    api
      .getDatabase()
      .then(() => setAllowed(true))
      .catch(err => setAllowed(!(err instanceof ApiError && err.status === 403)));
  }, [user]);

  if (loading) return null;
  if (!user) return <LoginScreen />;
  if (allowed === null) return null;
  if (!allowed) return <NotAllowedScreen />;

  return (
    <ConfirmProvider>
      <AppShell />
    </ConfirmProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
