import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AppState, DEFAULT_APP_STATE, loadAppState, updateAppState as updateAppStateUtil, retakeQuiz as retakeQuizUtil } from '@/utils/appState';
import { useAuth } from '@/contexts/AuthContext';

interface AppStateContextType {
  appState: AppState;
  updateAppState: (partial: Partial<AppState>) => Promise<AppState>;
  retakeQuiz: () => Promise<AppState>;
  isLoading: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(DEFAULT_APP_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  // Reload state whenever the authenticated user changes (including sign-out → null)
  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id ?? null;
    console.log(`[AppState] Auth user changed: ${userId}`);
    setIsLoading(true);
    loadAppState(userId).then((state) => {
      // Always stamp the correct authStatus for this user
      const withAuth: AppState = {
        ...state,
        authStatus: user ? 'logged_in' : 'logged_out',
      };
      setAppState(withAuth);
      setIsLoading(false);
    });
  }, [user?.id, authLoading]);

  const updateAppState = useCallback(async (partial: Partial<AppState>): Promise<AppState> => {
    const userId = user?.id ?? null;
    const newState = await updateAppStateUtil(partial, userId);
    setAppState(newState);
    return newState;
  }, [user?.id]);

  const handleRetakeQuiz = useCallback(async () => {
    const userId = user?.id ?? null;
    const newState = await retakeQuizUtil(userId);
    setAppState(newState);
    return newState;
  }, [user?.id]);

  return (
    <AppStateContext.Provider value={{ appState, updateAppState, retakeQuiz: handleRetakeQuiz, isLoading }}>
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
