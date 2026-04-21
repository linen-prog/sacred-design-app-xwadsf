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

export async function loadAppState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(APP_STATE_KEY);
    if (!raw) {
      console.log('[AppState] No persisted state found — using defaults');
      return { ...DEFAULT_APP_STATE };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    // Merge with defaults so any new keys added later are always present
    const merged: AppState = { ...DEFAULT_APP_STATE, ...parsed };
    console.log('[AppState] Loaded state:', JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.warn('[AppState] Failed to load state — using defaults:', e);
    return { ...DEFAULT_APP_STATE };
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    console.log('[AppState] Saved state');
  } catch (e) {
    console.warn('[AppState] Failed to save state:', e);
  }
}

export async function updateAppState(partial: Partial<AppState>): Promise<AppState> {
  const current = await loadAppState();
  const next: AppState = { ...current, ...partial };
  await saveAppState(next);
  console.log('[AppState] Updated state with:', JSON.stringify(partial));
  return next;
}

export async function clearAppState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(APP_STATE_KEY);
    console.log('[AppState] State cleared (reset to defaults)');
  } catch (e) {
    console.warn('[AppState] Failed to clear state:', e);
  }
}
