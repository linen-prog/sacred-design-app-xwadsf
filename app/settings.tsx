import React, { useContext, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { useAuth } from "@/contexts/AuthContext";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { apiFetch, getSessionToken, authClient, setBearerToken, BEARER_TOKEN_KEY } from '@/lib/auth';
import { updateAppState } from '@/utils/appState';

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const TEXT_MUTED = "rgba(47,62,47,0.50)";
const TEXT_ROW = "#2F3E2F";
const SECTION_LABEL_COLOR = "rgba(47,62,47,0.45)";
const RESET_COLOR = "#8A7060";
const DIVIDER = "rgba(47,62,47,0.07)";

const IOS_REVIEW_URL = 'https://apps.apple.com/app/id6762496742?action=write-review';
const ANDROID_REVIEW_URL = 'https://play.google.com/store/apps/details?id=com.sacreddesign.app';

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function InfoRow({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

function TappableRow({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const labelStyle = danger ? styles.rowLabelDanger : styles.rowLabel;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      <Text style={[labelStyle, disabled && styles.rowLabelDisabled]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { sacredDesignResult, clearSacredDesign } = useContext(DiscoveryContext);

  const [isDeleting, setIsDeleting] = useState(false);

  const isSignedIn = !!(user && (user as { isAnonymous?: boolean }).isAnonymous !== true);
  const userName = (user as { name?: string } | null)?.name ?? null;
  const userEmail = (user as { email?: string } | null)?.email ?? null;

  const primaryArchetype = sacredDesignResult?.primary_archetype ?? null;
  const blendName = sacredDesignResult?.blend_name ?? null;

  const subtitleText = isSignedIn
    ? (userName ?? userEmail ?? "Signed in")
    : "Not signed in";

  async function handleSignOut() {
    console.log("[Settings] 'Sign Out' pressed");
    await signOut();
    try {
      await updateAppState({
        revealViewed: false,
        revealUnlocked: false,
        quizCompleted: false,
        postQuizSaveCompleted: false,
        guestMode: false,
        currentOnboardingStep: '/onboarding/welcome',
      });
    } catch (e) {
      console.warn('[Settings] Failed to reset appState on sign out:', e);
    }
    router.replace("/onboarding/welcome");
  }

  function handleDeleteAccountPress() {
    console.log("[Settings] 'Delete Account' pressed — showing confirmation dialog");
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: () => console.log("[Settings] Delete Account cancelled") },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: handleDeleteAccountConfirm,
        },
      ]
    );
  }

  async function performLocalCleanup() {
    console.log('[DeleteAccount] performLocalCleanup: starting');

    // 1. Reset app state
    try {
      await updateAppState({
        revealViewed: false,
        revealUnlocked: false,
        quizCompleted: false,
        postQuizSaveCompleted: false,
        guestMode: false,
        currentOnboardingStep: '/onboarding/welcome',
        subscriptionActive: false,
        onboardingStarted: false,
      });
      console.log('[DeleteAccount] performLocalCleanup: appState reset');
    } catch (e: any) {
      console.warn('[DeleteAccount] performLocalCleanup: appState reset failed:', e?.message);
    }

    // 2. Sign out from Better Auth
    try {
      await signOut();
      console.log('[DeleteAccount] performLocalCleanup: signOut done');
    } catch (e: any) {
      console.warn('[DeleteAccount] performLocalCleanup: signOut failed:', e?.message);
    }

    // 3. Clear ALL AsyncStorage
    try {
      await AsyncStorage.clear();
      console.log('[DeleteAccount] performLocalCleanup: AsyncStorage cleared');
    } catch (e: any) {
      console.warn('[DeleteAccount] performLocalCleanup: AsyncStorage.clear failed:', e?.message);
    }

    // 4. RevenueCat logout
    try {
      await Purchases.logOut();
      console.log('[DeleteAccount] performLocalCleanup: RevenueCat logged out');
    } catch (e: any) {
      console.warn('[DeleteAccount] performLocalCleanup: RC logOut:', e?.message);
    }

    // 5. Wipe all known SecureStore keys
    const secureKeys = [
      BEARER_TOKEN_KEY,
      'sacreddesign_cookie',
      'better_auth_token',
      'session_token',
      'auth_token',
      'bearer_token',
    ];
    for (const key of secureKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
        console.log('[DeleteAccount] performLocalCleanup: deleted SecureStore key:', key);
      } catch {}
    }

    console.log('[DeleteAccount] performLocalCleanup: complete');
  }

  async function handleDeleteAccountConfirm() {
    console.log('[DeleteAccount] ===== DELETE ACCOUNT FLOW START =====');
    setIsDeleting(true);

    // Step 1: Determine if user is authenticated or guest
    const isGuest = !user || (user as any).isAnonymous === true;
    console.log('[DeleteAccount] user object:', JSON.stringify(user));
    console.log('[DeleteAccount] isGuest:', isGuest);
    console.log('[DeleteAccount] user.id:', (user as any)?.id ?? 'none');
    console.log('[DeleteAccount] user.email:', (user as any)?.email ?? 'none');

    if (isGuest) {
      console.log('[DeleteAccount] Guest user detected — skipping backend, clearing local data only');
      await performLocalCleanup();
      Alert.alert(
        'Local Data Cleared',
        'Your local data has been cleared.',
        [{ text: 'Start Fresh', onPress: () => router.replace('/onboarding/welcome') }]
      );
      return;
    }

    // Step 2: Get the auth token using the full fallback chain
    let token: string | null = null;

    // Try 1: SecureStore / cookie store
    token = await getSessionToken();
    console.log('[DeleteAccount] token from getSessionToken():', token ? `present (${token.length} chars)` : 'null');

    // Try 2: Live authClient session
    if (!token) {
      console.log('[DeleteAccount] No cached token — trying live authClient.getSession()');
      try {
        const { data: session } = await authClient.getSession();
        console.log('[DeleteAccount] authClient.getSession() result:', JSON.stringify(session));
        if (session?.session?.token) {
          token = session.session.token;
          await setBearerToken(token);
          console.log('[DeleteAccount] Token retrieved from live session and cached');
        } else {
          console.warn('[DeleteAccount] authClient.getSession() returned no token');
        }
      } catch (e: any) {
        console.error('[DeleteAccount] authClient.getSession() threw:', e?.message);
      }
    }

    console.log('[DeleteAccount] Final token status:', token ? 'PRESENT' : 'MISSING');

    // Step 3: Determine backend URL
    const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'https://rumbzpkjcykav9r57b52k9veurge7zze.app.specular.dev';
    const deleteUrl = `${BACKEND_URL}/api/account`;
    console.log('[DeleteAccount] Backend URL:', BACKEND_URL);
    console.log('[DeleteAccount] Delete URL:', deleteUrl);
    console.log('[DeleteAccount] Token included in request:', !!token);

    // Step 4: Call backend using apiFetch (full fallback chain)
    let httpStatus: number | null = null;
    let responseBody: string | null = null;
    try {
      console.log('[DeleteAccount] Sending DELETE request via apiFetch...');
      const response = await apiFetch('/api/account', { method: 'DELETE' });
      httpStatus = response.status;
      responseBody = await response.text();
      console.log('[DeleteAccount] HTTP status:', httpStatus);
      console.log('[DeleteAccount] Response body:', responseBody);

      if (!response.ok) {
        throw new Error(`Backend returned ${httpStatus}: ${responseBody}`);
      }

      console.log('[DeleteAccount] Backend deletion succeeded — running local cleanup');
      await performLocalCleanup();

      Alert.alert(
        'Account Deleted',
        'Your account and all data have been permanently deleted.',
        [{ text: 'Start Fresh', onPress: () => router.replace('/onboarding/welcome') }]
      );
    } catch (e: any) {
      console.error('[DeleteAccount] FAILED:', e?.message);
      console.error('[DeleteAccount] HTTP status was:', httpStatus);
      console.error('[DeleteAccount] Response body was:', responseBody);
      setIsDeleting(false);
      Alert.alert(
        'Delete Failed',
        `Could not delete your account.\n\nError: ${e?.message ?? 'Unknown error'}\n\nPlease try again or contact support.`
      );
    }
  }

  function handleSignIn() {
    console.log("[Settings] 'Sign In / Create Account' pressed");
    router.push("/auth-screen");
  }

  function handleRetakeDiscovery() {
    console.log("[Settings] 'Retake Discovery' pressed — clearing sacred design");
    clearSacredDesign();
    router.replace("/onboarding/welcome");
  }

  async function handleRateApp() {
    console.log("[Settings] 'Rate Sacred Design' pressed");
    const url = Platform.OS === 'ios' ? IOS_REVIEW_URL : ANDROID_REVIEW_URL;
    try {
      await Linking.openURL(url);
    } catch (e: any) {
      console.warn('[Settings] Failed to open review URL:', e?.message);
      Alert.alert(
        'Unable to open',
        'Could not open the app store. Please try again later.'
      );
    }
  }

  function handleBack() {
    console.log("[Settings] Back button pressed");
    router.back();
  }

  const archetypeDisplay = primaryArchetype ?? "Not completed";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* Header */}
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>{subtitleText}</Text>

      {/* Account section */}
      <SectionLabel text="ACCOUNT" />
      <View style={styles.sectionCard}>
        {isSignedIn ? (
          <>
            {userName ? (
              <>
                <InfoRow label={userName} />
                <RowDivider />
              </>
            ) : null}
            {userEmail ? (
              <>
                <InfoRow label={userEmail} />
                <RowDivider />
              </>
            ) : null}
            <TappableRow label="Sign Out" onPress={handleSignOut} />
            <RowDivider />
            <TappableRow
              label={isDeleting ? "Deleting…" : "Delete Account"}
              onPress={handleDeleteAccountPress}
              danger
              disabled={isDeleting}
            />
          </>
        ) : (
          <TappableRow label="Sign In / Create Account" onPress={handleSignIn} />
        )}
      </View>

      {/* Discovery section */}
      <SectionLabel text="YOUR DISCOVERY" />
      <View style={styles.sectionCard}>
        <InfoRow label={archetypeDisplay} />
        {blendName ? (
          <>
            <RowDivider />
            <InfoRow label={blendName} />
          </>
        ) : null}
        <RowDivider />
        <TappableRow
          label="Retake Discovery"
          onPress={handleRetakeDiscovery}
          danger
        />
      </View>
      {/* About section */}
      <SectionLabel text="ABOUT" />
      <View style={styles.sectionCard}>
        <TappableRow label="Rate Sacred Design" onPress={handleRateApp} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  backArrow: {
    fontSize: 20,
    color: TEXT,
    lineHeight: 24,
  },
  backLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: TEXT,
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 36,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: SECTION_LABEL_COLOR,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowPressed: {
    backgroundColor: "rgba(47,62,47,0.04)",
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_ROW,
    flex: 1,
  },
  rowLabelDanger: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: RESET_COLOR,
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: TEXT_MUTED,
    lineHeight: 24,
  },
  rowDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 16,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  rowLabelDisabled: {
    opacity: 0.7,
  },
});
