import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState, DEFAULT_APP_STATE, loadAppState, updateAppState as updateAppStateFn } from '@/utils/appState';
import { useAuth } from '@/contexts/AuthContext';

interface AppStateContextType {
  appState: AppState;
  updateAppState: (partial: Partial<AppState>) => Promise<void>;
  isLoading: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Load persisted state on mount
  useEffect(() => {
    loadAppState().then((state) => {
      setAppState(state);
      setIsLoading(false);
      console.log('[AppStateContext] Initial state loaded');
    });
  }, []);

  // Sync authStatus whenever auth resolves
  useEffect(() => {
    if (authLoading) return;
    const newStatus = user ? 'logged_in' : 'logged_out';
    if (appState.authStatus !== newStatus && !isLoading) {
      console.log('[AppStateContext] Auth status changed to:', newStatus);
      updateAppStateFn({ authStatus: newStatus }).then((next) => {
        setAppState(next);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isLoading]);

  const updateAppState = useCallback(async (partial: Partial<AppState>) => {
    console.log('[AppStateContext] updateAppState called with:', JSON.stringify(partial));
    const next = await updateAppStateFn(partial);
    setAppState(next);
  }, []);

  return (
    <AppStateContext.Provider value={{ appState, updateAppState, isLoading }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextType {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
