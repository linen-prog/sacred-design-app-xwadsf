import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
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
import { AuthProvider } from "@/contexts/AuthContext";
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
import { authClient } from "@/lib/auth";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function RootNavigator() {
  const router = useRouter();
  // useSegments is imported but not used here — kept for future guard logic
  const [_onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Silently create anonymous session on first launch
        const anonCreated = await AsyncStorage.getItem("anon_session_created");
        if (!anonCreated) {
          console.log("[RootLayout] Creating anonymous session...");
          try {
            await authClient.signIn.anonymous();
            await AsyncStorage.setItem("anon_session_created", "true");
            console.log("[RootLayout] Anonymous session created");
          } catch (e) {
            console.log("[RootLayout] Anonymous sign-in failed (silent):", e);
          }
        }

        const value = await AsyncStorage.getItem("onboarding_complete");
        console.log("[RootLayout] onboarding_complete:", value);
        if (!value) {
          router.replace("/onboarding/welcome");
        } else {
          router.replace("/(tabs)");
        }
      } catch (e) {
        console.log("[RootLayout] AsyncStorage error:", e);
        router.replace("/onboarding/welcome");
      } finally {
        setOnboardingChecked(true);
      }
    }
    checkOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="reveal" options={{ headerShown: false }} />
      <Stack.Screen name="dev-skip" options={{ headerShown: false }} />
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
            <DiscoveryProvider>
              <WidgetProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootNavigator />
                  <SystemBars style="auto" />
                </GestureHandlerRootView>
              </WidgetProvider>
            </DiscoveryProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
