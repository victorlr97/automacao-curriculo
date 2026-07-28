import { useState } from 'react';
import { ChevronsLeft, ChevronsRight, FileText, FolderOpen, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type Destination = 'database' | 'workspace' | 'outputs';

const NAV_ITEMS: { id: Destination; label: string; icon: typeof FileText }[] = [
  { id: 'database', label: 'Meus Dados', icon: User },
  { id: 'workspace', label: 'Currículo', icon: FileText },
  { id: 'outputs', label: 'Meus Currículos', icon: FolderOpen }
];

const COLLAPSED_STORAGE_KEY = 'sidebarCollapsed';

interface SidebarProps {
  active: Destination;
  onChange: (destination: Destination) => void;
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1');

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-border bg-white transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Retrair menu'}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-accent shadow-xs transition-colors hover:bg-accent-soft"
      >
        {collapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
      </button>

      <div className="flex h-[52px] items-center p-5">
        {!collapsed && <h1 className="truncate text-lg font-bold leading-tight tracking-tight">Gerador de Currículo</h1>}
      </div>

      <nav className={`flex flex-col gap-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                collapsed ? 'justify-center' : ''
              } ${isActive ? 'bg-accent-soft text-accent-dark' : 'text-ink-soft hover:bg-bg hover:text-ink'}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 2} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border p-4">
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? `Sair (${user?.email})` : undefined}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-bg hover:text-ink ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} />
          {!collapsed && <span className="truncate">{user?.email}</span>}
        </button>
      </div>
    </aside>
  );
}
