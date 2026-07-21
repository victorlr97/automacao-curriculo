import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../api';
import type { Profile } from '../types';

const ACTIVE_PROFILE_STORAGE_KEY = 'activeProfileId';

interface ProfileContextValue {
  profiles: Profile[];
  currentProfileId: string | null;
  currentProfile: Profile | null;
  error: string;
  loading: boolean;
  selectProfile: (id: string) => void;
  createProfile: (name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const applyProfiles = useCallback((items: Profile[], preferredId?: string | null) => {
    setProfiles(items);
    if (!items.length) {
      setCurrentProfileId(null);
      setError('Nenhum perfil encontrado. Crie um perfil pra começar.');
      return;
    }
    setError('');
    const desired = preferredId && items.some(p => p.id === preferredId) ? preferredId : items[0].id;
    setCurrentProfileId(desired);
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, desired);
  }, []);

  const loadProfiles = useCallback(
    async (preferredId?: string | null) => {
      try {
        const items = await api.getProfiles();
        applyProfiles(items, preferredId);
      } catch (err) {
        setError(`Erro ao carregar perfis: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    },
    [applyProfiles]
  );

  useEffect(() => {
    loadProfiles(localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectProfile = useCallback((id: string) => {
    setCurrentProfileId(id);
    localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, id);
  }, []);

  const createProfile = useCallback(
    async (name: string) => {
      const created = await api.createProfile(name);
      await loadProfiles(created.id);
    },
    [loadProfiles]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await api.deleteProfile(id);
      await loadProfiles();
    },
    [loadProfiles]
  );

  const currentProfile = useMemo(
    () => profiles.find(p => p.id === currentProfileId) ?? null,
    [profiles, currentProfileId]
  );

  const value = useMemo(
    () => ({ profiles, currentProfileId, currentProfile, error, loading, selectProfile, createProfile, deleteProfile }),
    [profiles, currentProfileId, currentProfile, error, loading, selectProfile, createProfile, deleteProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile precisa estar dentro de <ProfileProvider>');
  return ctx;
}
