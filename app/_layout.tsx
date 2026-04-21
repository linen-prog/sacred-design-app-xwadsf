import React, { useEffect, useRef } from "react";
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
  // hasNavigated ensures router.replace is called AT MOST ONCE, ever.
  // It is set to true before any router call so re-renders can never
  // trigger a second redirect.
  const hasNavigated = useRef(false);
  const prevUserRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait until auth has resolved before making any routing decision.
    if (authLoading) return;

    // If auth state changed (e.g. user just signed in or signed out),
    // reset the guard so we re-evaluate the route.
    const prevUser = prevUserRef.current;
    const currentUserId = user?.id ?? null;
    if (prevUser !== undefined && prevUser !== currentUserId) {
      console.log('[RootNavigator] Auth state changed — resetting navigation guard');
      hasNavigated.current = false;
    }
    prevUserRef.current = currentUserId;

    // This effect runs on mount and whenever auth state changes.
    // It is the ONLY place that decides the initial route.
    async function determineInitialRoute() {
      // If the quiz was just completed in this JS session (preparing.tsx
      // already called markQuizComplete + router.replace('/reveal')), do
      // nothing — the navigation is already in flight.
      if (isQuizJustCompleted()) {
        console.log('[RootNavigator] Quiz just completed in-session — skipping initial route check');
        return;
      }

      // Guard: only navigate once.
      if (hasNavigated.current) return;

      try {
        // Read both flags in parallel.
        const [hasCompletedQuiz, hasSeenOnboarding] = await Promise.all([
          AsyncStorage.getItem('hasCompletedQuiz'),
          AsyncStorage.getItem('hasSeenOnboarding'),
        ]);

        console.log('[RootNavigator] hasCompletedQuiz:', hasCompletedQuiz, '| hasSeenOnboarding:', hasSeenOnboarding, '| user:', user?.id ?? 'none');

        // Re-check the in-session flag after the async gap — preparing.tsx
        // may have fired while we were awaiting AsyncStorage.
        if (isQuizJustCompleted()) {
          console.log('[RootNavigator] Quiz completed during AsyncStorage read — skipping redirect');
          return;
        }

        hasNavigated.current = true;

        if (hasCompletedQuiz === 'true' && (await isOnboardingComplete())) {
          if (user) {
            // Returning authenticated user who has finished everything → home.
            console.log('[RootNavigator] Returning authenticated user — navigating to /(tabs)');
            router.replace('/(tabs)');
          } else {
            // Quiz done but no session → must log in first.
            console.log('[RootNavigator] Quiz complete but unauthenticated — navigating to /auth-screen');
            router.replace('/auth-screen');
          }
        } else if (hasSeenOnboarding === 'true') {
          if (user) {
            // Partially through onboarding and authenticated → resume at intro.
            console.log('[RootNavigator] Partial onboarding, authenticated — resuming at /onboarding/intro');
            router.replace('/onboarding/intro');
          } else {
            // Has seen onboarding before but no session → must log in first.
            console.log('[RootNavigator] Has seen onboarding but unauthenticated — navigating to /auth-screen');
            router.replace('/auth-screen');
          }
        } else {
          // Brand new user, never seen onboarding → welcome screen.
          console.log('[RootNavigator] First launch — navigating to /onboarding/welcome');
          router.replace('/onboarding/welcome');
        }
      } catch (e) {
        console.warn('[RootNavigator] Storage error during initial route check:', e);
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.replace('/onboarding/welcome');
        }
      }
    }

    determineInitialRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  return (
    <Stack>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="reveal" options={{ headerShown: false }} />
      <Stack.Screen name="dev-skip" options={{ headerShown: false }} />
      <Stack.Screen name="alignment-detail" options={{ headerShown: false }} />
      <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
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
        </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
