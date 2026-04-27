import AsyncStorage from '@react-native-async-storage/async-storage';

// Key is scoped per userId. Anonymous/guest uses 'anonymous'.
function getStateKey(userId: string | null): string {
  const scope = userId || 'anonymous';
  return `appState:${scope}`;
}

export interface AppState {
  firstLaunch: boolean;
  onboardingStarted: boolean;
  currentOnboardingStep: string | null;
  quizCompleted: boolean;
  paywallReached: boolean;
  subscriptionActive: boolean;
  revealUnlocked: boolean;
  revealViewed: boolean;
  authStatus: 'logged_in' | 'logged_out';
  primaryArchetype: string | null;
  secondaryArchetype: string | null;
  scoreBreakdown: object | null;
  dailyAlignmentReady: boolean;
  intendedRouteAfterAuth: string | null;
  postQuizSaveCompleted: boolean;
  guestMode: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
  firstLaunch: true,
  onboardingStarted: false,
  currentOnboardingStep: null,
  quizCompleted: false,
  paywallReached: false,
  subscriptionActive: false,
  revealUnlocked: false,
  revealViewed: false,
  authStatus: 'logged_out',
  primaryArchetype: null,
  secondaryArchetype: null,
  scoreBreakdown: null,
  dailyAlignmentReady: false,
  intendedRouteAfterAuth: null,
  postQuizSaveCompleted: false,
  guestMode: false,
};

// Module-level cache — keyed by userId so different users never share memory
let _currentUserId: string | null = null;
let _memoryCache: AppState | null = null;

export async function loadAppState(userId: string | null = null): Promise<AppState> {
  // If userId changed, bust the cache
  if (userId !== _currentUserId) {
    console.log(`[AppState] Auth user changed: ${userId}`);
    _currentUserId = userId;
    _memoryCache = null;
  }
  if (_memoryCache) {
    return { ..._memoryCache };
  }
  const key = getStateKey(userId);
  console.log(`[AppState] Loading state key: ${key}`);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.log('[AppState] No saved state found, initializing fresh user state');
      const defaults = { ...DEFAULT_APP_STATE };
      _memoryCache = defaults;
      return { ...defaults };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const merged: AppState = { ...DEFAULT_APP_STATE, ...parsed };
    console.log('[AppState] Loaded existing state for user');
    _memoryCache = merged;
    return { ...merged };
  } catch (e) {
    console.warn('[AppState] Failed to load state — using defaults:', e);
    const defaults = { ...DEFAULT_APP_STATE };
    _memoryCache = defaults;
    return { ...defaults };
  }
}

export async function saveAppState(state: AppState, userId: string | null = null): Promise<void> {
  _memoryCache = { ...state };
  const key = getStateKey(userId);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn('[AppState] Failed to save state:', e);
  }
}

export async function updateAppState(partial: Partial<AppState>, userId: string | null = null): Promise<AppState> {
  const current = await loadAppState(userId);
  const next: AppState = { ...current, ...partial };
  await saveAppState(next, userId);
  return next;
}

export async function retakeQuiz(userId: string | null = null): Promise<AppState> {
  console.log('[AppState] retakeQuiz() — resetting quiz-related state');
  const next = await updateAppState({
    quizCompleted: false,
    paywallReached: false,
    revealUnlocked: false,
    revealViewed: false,
    dailyAlignmentReady: false,
    primaryArchetype: null,
    secondaryArchetype: null,
    scoreBreakdown: null,
    currentOnboardingStep: '/onboarding/welcome',
    postQuizSaveCompleted: false,
  }, userId);
  return next;
}

export async function clearAppState(userId: string | null = null): Promise<void> {
  console.log('[AppState] Clearing in-memory state on sign out');
  _memoryCache = null;
  _currentUserId = null;
  const key = getStateKey(userId);
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('[AppState] Failed to clear state:', e);
  }
}
