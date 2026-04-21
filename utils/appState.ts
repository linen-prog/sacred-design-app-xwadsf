import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_STATE_KEY = 'sacred_design_app_state';

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
};

// Module-level in-memory cache — prevents race conditions on concurrent updateAppState calls
let _memoryCache: AppState | null = null;

export async function loadAppState(): Promise<AppState> {
  if (_memoryCache) {
    console.log('[AppState] loadAppState — returning from memory cache');
    return { ..._memoryCache };
  }
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      console.log('[AppState] No persisted state found — using defaults');
      const defaults = { ...DEFAULT_APP_STATE };
      _memoryCache = defaults;
      return { ...defaults };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    // Merge with defaults so any new keys added later are always present
    const merged: AppState = { ...DEFAULT_APP_STATE, ...parsed };
    console.log('[AppState] Loaded state from AsyncStorage:', JSON.stringify(merged));
    _memoryCache = merged;
    return { ...merged };
  } catch (e) {
    console.warn('[AppState] Failed to load state — using defaults:', e);
    const defaults = { ...DEFAULT_APP_STATE };
    _memoryCache = defaults;
    return { ...defaults };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  _memoryCache = { ...state }; // update cache immediately — synchronous
  try {
    await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    console.log('[AppState] saveAppState — persisted to AsyncStorage');
  } catch (e) {
    console.warn('[AppState] Failed to save state:', e);
  }
}

export async function updateAppState(partial: Partial<AppState>): Promise<AppState> {
  const current = await loadAppState(); // fast — hits cache after first load
  const next: AppState = { ...current, ...partial };
  console.log('[AppState] updateAppState — merging:', JSON.stringify(partial));
  console.log('[AppState] updateAppState — full next state:', JSON.stringify(next));
  await saveAppState(next); // updates cache + persists to AsyncStorage
  console.log('[AppState] updateAppState — COMPLETE. State is now persisted.');
  return next;
}

export async function clearAppState(): Promise<void> {
  _memoryCache = null;
  try {
    await AsyncStorage.removeItem(APP_STATE_KEY);
    console.log('[AppState] clearAppState — cache and storage cleared');
  } catch (e) {
    console.warn('[AppState] Failed to clear state:', e);
  }
}
