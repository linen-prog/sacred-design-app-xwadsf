import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
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

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "onboarding/welcome",
};

function RootNavigator() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { appState, isLoading: appStateLoading } = useAppState();
  const hasNavigated = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait for both auth and appState to resolve before routing.
    if (authLoading || appStateLoading) {
      console.log('[RootNavigator] Waiting — authLoading:', authLoading, 'appStateLoading:', appStateLoading);
      return;
    }
    console.log('[RootNavigator] Both loaded — proceeding with route decision');
    console.log('[RootNavigator] Full appState:', JSON.stringify(appState));

    // If auth state changed, reset the guard so we re-evaluate.
    const prevUser = prevUserRef.current;
    const currentUserId = user?.id ?? null;
    if (prevUser !== undefined && prevUser !== currentUserId) {
      console.log('[RootNavigator] Auth state changed — resetting navigation guard');
      hasNavigated.current = false;
    }
    prevUserRef.current = currentUserId;

    async function determineInitialRoute() {
      // If the quiz was just completed in this JS session (preparing.tsx
      // already called markQuizComplete + router.replace('/reveal')), do
      // nothing — the navigation is already in flight.
      if (isQuizJustCompleted()) {
        console.log('[RootNavigator] Quiz just completed in-session — skipping initial route check');
        return;
      }

      if (hasNavigated.current) return;

      console.log('[RootNavigator] Determining initial route — appState:', JSON.stringify({
        revealViewed: appState.revealViewed,
        revealUnlocked: appState.revealUnlocked,
        quizCompleted: appState.quizCompleted,
        onboardingStarted: appState.onboardingStarted,
        firstLaunch: appState.firstLaunch,
        currentOnboardingStep: appState.currentOnboardingStep,
      }), '| user:', user?.id ?? 'none');

      hasNavigated.current = true;

      // PRIORITY 1: Reveal viewed → go to tabs
      if (appState.revealViewed) {
        console.log('[RootNavigator] revealViewed=true — navigating to /(tabs)');
        router.replace('/(tabs)');
        return;
      }

      // PRIORITY 2: Quiz done but post-quiz save not yet completed → save screen
      if (appState.quizCompleted && !appState.postQuizSaveCompleted) {
        console.log('[RootNavigator] quizCompleted=true, postQuizSaveCompleted=false — navigating to /post-quiz-save');
        router.replace('/post-quiz-save');
        return;
      }

      // PRIORITY 3: Quiz done + reveal unlocked but not yet viewed → reveal screen
      // (preparing.tsx requires live DiscoveryContext answers which are not persisted across
      // cold relaunches — go directly to /reveal which shows the stored archetype data)
      if (appState.quizCompleted && appState.revealUnlocked && !appState.revealViewed) {
        console.log('[RootNavigator] Quiz complete + reveal unlocked — navigating to /reveal');
        router.replace('/reveal');
        return;
      }

      // PRIORITY 4: Quiz done but not unlocked → partial reveal (gated)
      if (appState.quizCompleted && !appState.revealUnlocked) {
        console.log('[RootNavigator] Quiz complete but reveal not unlocked — navigating to /partial-reveal');
        router.replace('/partial-reveal');
        return;
      }

      // PRIORITY 4: Onboarding started but quiz not done → resume
      if (appState.onboardingStarted && !appState.quizCompleted) {
        const resumeStep = appState.currentOnboardingStep || '/onboarding/welcome';
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

          if (isQuizJustCompleted()) {
            console.log('[RootNavigator] Quiz completed during AsyncStorage read — skipping redirect');
            return;
          }

          if (hasCompletedQuiz === 'true' && (await isOnboardingComplete())) {
            if (user) {
              console.log('[RootNavigator] Legacy: quiz complete + auth — navigating to /(tabs)');
              router.replace('/(tabs)');
            } else {
              console.log('[RootNavigator] Legacy: quiz complete, no auth — navigating to /auth-screen');
              router.replace('/auth-screen');
            }
          } else if (hasSeenOnboarding === 'true') {
            console.log('[RootNavigator] Legacy: partial onboarding — resuming at /onboarding/welcome');
            router.replace('/onboarding/welcome');
          } else {
            console.log('[RootNavigator] First launch — navigating to /onboarding/welcome');
            router.replace('/onboarding/welcome');
          }
        } catch (e) {
          console.warn('[RootNavigator] Storage error during initial route check:', e);
          router.replace('/onboarding/welcome');
        }
        return;
      }

      // Fallback
      console.log('[RootNavigator] Fallback — navigating to /onboarding/welcome');
      router.replace('/onboarding/welcome');
    }

    determineInitialRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, appStateLoading, user, appState]);

  // Show a loading screen while state is being read
  if (appStateLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="reveal" options={{ headerShown: false }} />
      <Stack.Screen name="partial-reveal" options={{ headerShown: false }} />
      <Stack.Screen name="dev-skip" options={{ headerShown: false }} />
      <Stack.Screen name="alignment-detail" options={{ headerShown: false }} />
      <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
      <Stack.Screen name="post-quiz-save" options={{ headerShown: false }} />
      <Stack.Screen name="debug-auth" options={{ headerShown: false }} />
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
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Screens where SubscriptionRedirect must never interfere.
const SUBSCRIPTION_REDIRECT_BLOCKLIST = [
  '/reveal',
  '/completion',
  '/auth-screen',
  '/auth-popup',
  '/auth-callback',
  '/paywall',
];

function SubscriptionRedirect() {
  const { isSubscribed, loading } = useSubscription();
  const { user, loading: authLoading } = useAuth();
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

    // Still loading — wait for both auth and subscription to resolve.
    if (loading || authLoading) return;

    const currentPath = pathname;

    // Never redirect away from these screens.
    const isBlocked =
      SUBSCRIPTION_REDIRECT_BLOCKLIST.some((p) => currentPath === p) ||
      currentPath.startsWith('/onboarding') ||
      currentPath.startsWith('/reveal') ||
      currentPath.startsWith('/completion');
    if (isBlocked) {
      console.log('[SubscriptionRedirect] Blocked path — skipping:', currentPath);
      return;
    }

    // Not signed in → send to auth.
    if (!user) {
      console.log('[SubscriptionRedirect] No user — redirecting to auth-screen');
      router.replace('/auth-screen');
      return;
    }

    // Subscription status is available but we do NOT auto-redirect to paywall.
    // The paywall is only shown when the user explicitly accesses a premium feature.
  }, [isSubscribed, loading, authLoading, user, router, pathname]);

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
