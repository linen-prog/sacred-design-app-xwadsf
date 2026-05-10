import React, { useEffect, useRef } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { DiscoveryProvider } from "@/contexts/DiscoveryContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { AppStateProvider, useAppState } from "@/contexts/AppStateContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Lora_400Regular,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from "@expo-google-fonts/lora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { isOnboardingComplete } from "@/utils/onboardingStorage";
import { isQuizJustCompleted } from "@/utils/quizState";
import { updateAppState } from "@/utils/appState";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "onboarding/welcome",
};

/**
 * NavigationGuard — rendered INSIDE the <Stack> so usePathname() has a valid
 * navigation context. Handles all initial-route determination logic.
 */
function NavigationGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { appState, isLoading: appStateLoading } = useAppState();
  const hasNavigated = useRef(false);
  const lastNavigatedAt = useRef<number>(0);
  const prevUserRef = useRef<string | null | undefined>(undefined);
  const hasClearedFirstLaunchRef = useRef(false);

  useEffect(() => {
    // Always wait for appState — it's the primary routing signal.
    if (appStateLoading) {
      console.log('[RootNavigator] Waiting — appStateLoading:', appStateLoading);
      return;
    }

    // If appState already tells us the user has completed onboarding, route
    // immediately without waiting for the auth session to resolve. Auth loading
    // in the background won't block the tab bar from appearing.
    const appStateDecisive =
      appState.revealViewed ||
      (appState.quizCompleted && appState.postQuizSaveCompleted) ||
      (appState.quizCompleted && appState.revealUnlocked);

    if (!appStateDecisive && authLoading) {
      console.log('[RootNavigator] Waiting — authLoading:', authLoading, '(appState not yet decisive)');
      return;
    }

    console.log('[RootNavigator] Proceeding — authLoading:', authLoading, 'appStateDecisive:', appStateDecisive);
    console.log('[RootNavigator] Full appState:', JSON.stringify(appState));

    // If auth state changed, reset the guard so we re-evaluate.
    const prevUser = prevUserRef.current;
    const currentUserId = user?.id ?? null;
    if (prevUser !== undefined && prevUser !== currentUserId) {
      console.log('[RootNavigator] Auth state changed — resetting navigation guard');
      // Debounce the reset to avoid firing before the navigator settles after sign-out
      setTimeout(() => {
        hasNavigated.current = false;
      }, 300);
      prevUserRef.current = currentUserId;
      return; // Don't navigate in the same tick as the auth change
    }
    prevUserRef.current = currentUserId;

    async function determineInitialRoute() {
      console.log('[LaunchRouter] redirect decision:', { revealViewed: appState.revealViewed, quizCompleted: appState.quizCompleted, pathname });

      // If the quiz was just completed in this JS session (preparing.tsx
      // already called markQuizComplete + router.replace('/partial-reveal')), do
      // nothing — the navigation is already in flight.
      if (isQuizJustCompleted()) {
        console.log('[RootNavigator] Quiz just completed in-session — skipping initial route check');
        return;
      }

      // Don't re-navigate if we're already on the target route
      // (prevents flicker when RootNavigator re-evaluates mid-flow)
      const currentPathname = pathname;

      // Never redirect away from the preparing screen — it manages its own navigation
      if (currentPathname === '/onboarding/preparing') {
        console.log('[RootNavigator] On preparing screen — skipping redirect');
        return;
      }

      // Never redirect away from paywall — it manages its own post-purchase navigation
      if (currentPathname === '/paywall') {
        console.log('[RootNavigator] On paywall screen — skipping redirect');
        return;
      }

      // Clear firstLaunch flag on first evaluation so PRIORITY 5 doesn't run on every launch
      if (appState.firstLaunch && !hasClearedFirstLaunchRef.current) {
        hasClearedFirstLaunchRef.current = true;
        console.log('[RootNavigator] Clearing firstLaunch flag');
        updateAppState({ firstLaunch: false }, user?.id ?? null).catch(() => {});
      }

      if (hasNavigated.current) return;

      const now = Date.now();
      if (now - lastNavigatedAt.current < 1500) {
        console.log('[RootNavigator] Throttled — last redirect was', now - lastNavigatedAt.current, 'ms ago');
        return;
      }
      lastNavigatedAt.current = now;

      console.log('[RootNavigator] Determining initial route — appState:', JSON.stringify({
        revealViewed: appState.revealViewed,
        revealUnlocked: appState.revealUnlocked,
        quizCompleted: appState.quizCompleted,
        primaryArchetype: appState.primaryArchetype,
        onboardingStarted: appState.onboardingStarted,
        firstLaunch: appState.firstLaunch,
        currentOnboardingStep: appState.currentOnboardingStep,
      }), '| user:', user?.id ?? 'none', '| pathname:', currentPathname);

      hasNavigated.current = true;

      // PRIORITY 1: Reveal viewed → go to tabs
      if (appState.revealViewed) {
        const target = '/(tabs)';
        if (currentPathname === target) {
          console.log('[RootNavigator] Already on target route — skipping:', target);
          return;
        }
        console.log('[RootNavigator] revealViewed=true — navigating to /(tabs)');
        router.replace(target as any);
        return;
      }

      // PRIORITY 1.5: quizCompleted in AppState OR primaryArchetype exists → never route back to onboarding
      // This is the key guard that prevents the loop
      if (appState.quizCompleted || appState.primaryArchetype) {
        if (appState.revealViewed) {
          const target = '/(tabs)';
          if (currentPathname === target) {
            console.log('[RootNavigator] Already on target route — skipping:', target);
            return;
          }
          console.log('[RootNavigator] quizCompleted/primaryArchetype + revealViewed — routing to /(tabs)', {
            currentRoute: currentPathname ?? 'unknown',
            targetRoute: target,
            quizComplete: appState.quizCompleted,
            primaryArchetype: appState.primaryArchetype,
            revealViewed: appState.revealViewed,
            reasonForRedirect: 'reveal viewed, going to tabs',
          });
          router.replace(target as any);
          return;
        }
        if (appState.revealUnlocked && !appState.revealViewed) {
          const target = '/reveal';
          if (currentPathname === target) {
            console.log('[RootNavigator] Already on target route — skipping:', target);
            return;
          }
          console.log('[RootNavigator] quizCompleted + revealUnlocked — routing to /reveal', {
            currentRoute: currentPathname ?? 'unknown',
            targetRoute: target,
            quizComplete: appState.quizCompleted,
            revealUnlocked: appState.revealUnlocked,
            revealViewed: appState.revealViewed,
            reasonForRedirect: 'reveal unlocked but not viewed',
          });
          router.replace(target);
          return;
        }
        if (!appState.postQuizSaveCompleted) {
          const target = '/post-quiz-save';
          if (currentPathname === target) {
            console.log('[RootNavigator] Already on target route — skipping:', target);
            return;
          }
          console.log('[RootNavigator] quizCompleted + no postQuizSave — routing to /post-quiz-save', {
            currentRoute: currentPathname ?? 'unknown',
            targetRoute: target,
            quizComplete: appState.quizCompleted,
            postQuizSaveCompleted: appState.postQuizSaveCompleted,
            reasonForRedirect: 'quiz done, save not completed',
          });
          router.replace(target);
          return;
        }
        // Quiz done, save done, not unlocked → partial reveal
        const target = '/partial-reveal';
        if (currentPathname === target) {
          console.log('[RootNavigator] Already on target route — skipping:', target);
          return;
        }
        console.log('[RootNavigator] quizCompleted + postQuizSaveCompleted — routing to /partial-reveal', {
          currentRoute: currentPathname ?? 'unknown',
          targetRoute: target,
          quizComplete: appState.quizCompleted,
          postQuizSaveCompleted: appState.postQuizSaveCompleted,
          revealUnlocked: appState.revealUnlocked,
          reasonForRedirect: 'quiz done, save done, not unlocked',
        });
        router.replace(target);
        return;
      }

      // PRIORITY 4: Onboarding started but quiz not done → resume
      if (appState.onboardingStarted && !appState.quizCompleted) {
        let resumeStep = appState.currentOnboardingStep || '/onboarding/welcome';

        // If all phases are complete but quiz computation hasn't run yet,
        // skip the phase-complete celebration screen and go straight to preparing.
        if (resumeStep === '/onboarding/phase-complete?phase=4') {
          resumeStep = '/onboarding/preparing';
          console.log('[RootNavigator] phase-complete?phase=4 detected — routing to /onboarding/preparing');
        }

        if (currentPathname === resumeStep) {
          console.log('[RootNavigator] Already on target route — skipping:', resumeStep);
          return;
        }
        console.log('[RootNavigator] Onboarding in progress — resuming at:', resumeStep);
        router.replace(resumeStep as any);
        return;
      }

      // PRIORITY 5: First launch or onboarding not started → welcome
      if (appState.firstLaunch || !appState.onboardingStarted) {
        // Fall back to legacy AsyncStorage flags for users who had the old version
        try {
          const [hasCompletedQuiz, hasSeenOnboarding] = await Promise.all([
            AsyncStorage.getItem('hasCompletedQuiz'),
            AsyncStorage.getItem('hasSeenOnboarding'),
          ]);
          // Clean up legacy global keys — they must never affect new users
          AsyncStorage.multiRemove(['hasCompletedQuiz', 'hasSeenOnboarding']).catch(() => {});

          if (isQuizJustCompleted()) {
            console.log('[RootNavigator] Quiz completed during AsyncStorage read — skipping redirect');
            return;
          }

          if (hasCompletedQuiz === 'true' && (await isOnboardingComplete())) {
            console.log('[RootNavigator] Legacy: quiz complete — setting revealViewed and navigating to /(tabs)');
            updateAppState({ revealViewed: true, dailyAlignmentReady: true }, user?.id ?? null).catch(() => {});
            const target = '/(tabs)';
            if (currentPathname !== target) router.replace(target as any);
          } else if (hasSeenOnboarding === 'true') {
            console.log('[RootNavigator] Legacy: partial onboarding — resuming at /onboarding/welcome');
            const target = '/onboarding/welcome';
            if (currentPathname !== target) router.replace(target);
          } else {
            console.log('[RootNavigator] First launch — navigating to /onboarding/welcome');
            const target = '/onboarding/welcome';
            if (currentPathname !== target) router.replace(target);
          }
        } catch (e) {
          console.warn('[RootNavigator] Storage error during initial route check:', e);
          router.replace('/onboarding/welcome');
        }
        return;
      }

      // Fallback
      console.log('[RootNavigator] Fallback — navigating to /onboarding/welcome');
      const fallbackTarget = '/onboarding/welcome';
      if (currentPathname !== fallbackTarget) router.replace(fallbackTarget);
    }

    determineInitialRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    appStateLoading,
    user?.id,
    appState.revealViewed,
    appState.quizCompleted,
    appState.postQuizSaveCompleted,
    appState.revealUnlocked,
    appState.primaryArchetype,
    appState.onboardingStarted,
    appState.firstLaunch,
    appState.currentOnboardingStep,
    appState.dailyAlignmentReady,
  ]);

  return null;
}

function RootNavigator() {
  return (
    <>
      <NavigationGuard />
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
        <Stack.Screen name="reveal" options={{ headerShown: false }} />
        <Stack.Screen name="partial-reveal" options={{ headerShown: false }} />
        <Stack.Screen name="alignment-detail" options={{ headerShown: false }} />
        <Stack.Screen name="post-quiz-save" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="shadow-path" options={{ headerShown: false }} />
        <Stack.Screen
          name="completion"
          options={{
            presentation: 'modal',
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </>
  );
}



// Screens where SubscriptionRedirect must never interfere.
const SUBSCRIPTION_REDIRECT_BLOCKLIST = [
  '/reveal',
  '/partial-reveal',
  '/post-quiz-save',
  '/completion',
  '/paywall',
  '/auth-screen',
  '/auth-popup',
  '/auth-callback',
];

function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const { user } = useAuth();
  const { appState } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Check in-session quiz flag first — we may be mid-flow (preparing → reveal).
    if (isQuizJustCompleted()) {
      console.log('[SubscriptionRedirect] Quiz just completed — skipping redirect');
      return;
    }

    // Still loading — wait for subscription to resolve.
    if (loading) return;

    const currentPath = pathname;

    // Never redirect away from these screens.
    const isBlocked =
      SUBSCRIPTION_REDIRECT_BLOCKLIST.some((p) => currentPath === p) ||
      currentPath.startsWith('/onboarding') ||
      currentPath.startsWith('/paywall') ||
      currentPath.startsWith('/reveal') ||
      currentPath.startsWith('/completion') ||
      currentPath.startsWith('/partial-reveal') ||
      currentPath.startsWith('/post-quiz-save');
    if (isBlocked) {
      console.log('[SubscriptionRedirect] Blocked path — skipping:', currentPath);
      return;
    }

    console.log('[SubscriptionRedirect] Evaluated — user:', user?.id ?? 'none', 'isSubscribed:', isSubscribed);

    // Subscription status is available but we do NOT auto-redirect to paywall.
    // The paywall is only shown when the user explicitly accesses a premium feature.
  }, [isSubscribed, loading, user?.id, pathname]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_700Bold,
    Lora_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "#7C6A56",
      background: "#F7F4EF",
      card: "#FFFFFF",
      text: "#1C1917",
      border: "rgba(124,106,86,0.10)",
      notification: "#C0392B",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: "#B5956A",
      background: "#1A1714",
      card: "#242018",
      text: "#F5F0E8",
      border: "rgba(181,149,106,0.15)",
      notification: "#C0392B",
    },
  };

  return (
    <DevErrorBoundary>
      <StatusBar style="auto" animated />
      <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
        <SafeAreaProvider>
          <AuthProvider>
          <AppStateProvider>
            <SubscriptionProvider>
              <SubscriptionRedirect />
              <DiscoveryProvider>
                <WidgetProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootNavigator />
                    <SystemBars style="auto" />
                  </GestureHandlerRootView>
                </WidgetProvider>
              </DiscoveryProvider>
            </SubscriptionProvider>
          </AppStateProvider>
        </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
