import { useState } from 'react';
import { DatabaseEditorTab } from './components/DatabaseEditorTab';
import { LoginScreen } from './components/LoginScreen';
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

  if (loading) return null;
  if (!user) return <LoginScreen />;

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
