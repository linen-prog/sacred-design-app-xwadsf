import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/contexts/AppStateContext";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";

const BG = "#0A0E1A";
const CARD_BG = "#131929";
const TEXT = "#F5F0E8";
const TEXT_MUTED = "#8B7355";
const ACCENT = "#C9A84C";
const BORDER = "rgba(201,168,76,0.18)";
const DIVIDER_COLOR = "rgba(201,168,76,0.15)";
const DANGER = "#C0392B";
const INPUT_BG = "#1A2035";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, fetchUser } = useAuth() as any;
  const { appState, updateAppState } = useAppState();

  const { from } = useLocalSearchParams<{ from?: string }>();
  const isFromPostQuizSave = from === 'post-quiz-save';

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function handleModeSwitch(next: Mode) {
    console.log("[AuthScreen] Switching mode to:", next);
    setMode(next);
    setError("");
  }

  async function navigateAfterAuth() {
    if (isFromPostQuizSave) {
      console.log("[AuthScreen] from=post-quiz-save — setting postQuizSaveCompleted and routing to /paywall");
      await updateAppState({ postQuizSaveCompleted: true });
      await new Promise(resolve => setTimeout(resolve, 75));
      router.replace('/paywall');
      return;
    }
    const intended = appState.intendedRouteAfterAuth;
    if (intended) {
      console.log("[AuthScreen] Navigating to intended route after auth:", intended);
      updateAppState({ intendedRouteAfterAuth: null });
      router.replace(intended as any);
    } else {
      console.log("[AuthScreen] No intended route — navigating to /(tabs)");
      router.replace("/(tabs)");
    }
  }

  async function handleAppleSignIn() {
    console.log("[AuthScreen] 'Continue with Apple' pressed");
    setError("");
    setAppleLoading(true);
    try {
      await signInWithApple();
      console.log("[AuthScreen] Apple sign-in succeeded — fetching user and routing");
      await fetchUser?.();
      navigateAfterAuth();
    } catch (e: any) {
      console.warn("[AuthScreen] Apple sign-in error:", e);
      setError(e?.message || "Apple sign-in failed. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    console.log("[AuthScreen] 'Continue with Google' pressed");
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      console.log("[AuthScreen] Google sign-in succeeded — fetching user and routing");
      await fetchUser?.();
      navigateAfterAuth();
    } catch (e: any) {
      console.warn("[AuthScreen] Google sign-in error:", e);
      setError(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    console.log("[AuthScreen] Submit pressed — mode:", mode, "email:", email.trim());
    setLoading(true);
    try {
      if (mode === "signup") {
        console.log("[AuthScreen] Calling signUpWithEmail");
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        console.log("[AuthScreen] Calling signInWithEmail");
        await signInWithEmail(email.trim(), password);
      }
      console.log("[AuthScreen] Auth succeeded — calling fetchUser then routing");
      await fetchUser?.();
      navigateAfterAuth();
    } catch (e: any) {
      console.warn("[AuthScreen] Auth error:", e);
      const msg =
        e?.message?.includes("Invalid")
          ? "Invalid email or password."
          : e?.message?.includes("already")
          ? "An account with this email already exists."
          : e?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === "signup";
  const submitLabel = isSignUp ? "Create Account" : "Sign In";
  const anyLoading = loading || appleLoading || googleLoading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>SACRED DESIGN</Text>
        <Text style={styles.title}>Welcome</Text>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, mode === "signin" && styles.tabActive]}
            onPress={() => handleModeSwitch("signin")}
          >
            <Text style={[styles.tabText, mode === "signin" && styles.tabTextActive]}>
              Sign In
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === "signup" && styles.tabActive]}
            onPress={() => handleModeSwitch("signup")}
          >
            <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>
              Sign Up
            </Text>
          </Pressable>
        </View>

        {/* Apple Sign In — FIRST (App Store requirement) */}
        <Pressable
          style={[styles.appleButton, (appleLoading || anyLoading) && styles.buttonDisabled]}
          onPress={handleAppleSignIn}
          disabled={anyLoading}
        >
          {appleLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" style={styles.socialIcon} />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>

        {/* Google Sign In */}
        <Pressable
          style={[styles.googleButton, (googleLoading || anyLoading) && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={anyLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#333333" size="small" />
          ) : (
            <>
              <AntDesign name="google" size={18} color="#4285F4" style={styles.socialIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={TEXT_MUTED}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={TEXT_MUTED}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={TEXT_MUTED}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {/* Submit */}
        <Pressable
          style={[styles.button, (loading || anyLoading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={anyLoading}
        >
          {loading ? (
            <ActivityIndicator color="#0A0E1A" size="small" />
          ) : (
            <Text style={styles.buttonText}>{submitLabel}</Text>
          )}
        </Pressable>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Back link */}
        <Pressable
          style={styles.backLink}
          onPress={() => {
            console.log("[AuthScreen] Back link pressed — navigating back");
            router.back();
          }}
        >
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>

        {/* Continue without signing in */}
        <Pressable
          style={styles.backLink}
          onPress={() => {
            console.log("[AuthScreen] Continue without signing in pressed");
            navigateAfterAuth();
          }}
        >
          <Text style={styles.backLinkText}>Continue without signing in</Text>
        </Pressable>

        {__DEV__ && (
          <Pressable
            onPress={() => {
              console.log("[AuthScreen] Debug Auth link pressed");
              router.push("/debug-auth");
            }}
            style={{ marginTop: 8, padding: 8, alignSelf: "center" }}
          >
            <Text style={{ fontSize: 11, color: "rgba(201,168,76,0.3)" }}>🔍 Debug Auth</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    paddingHorizontal: 28,
    alignItems: "stretch",
  },
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 3.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 32,
    color: TEXT,
    textAlign: "center",
    marginBottom: 32,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "rgba(201,168,76,0.08)",
    borderRadius: 50,
    padding: 4,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: ACCENT,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: "#0A0E1A",
  },
  appleButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  appleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  googleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#333333",
    letterSpacing: 0.2,
  },
  socialIcon: {
    marginRight: 10,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER_COLOR,
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  fields: {
    gap: 14,
    marginBottom: 24,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: TEXT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  button: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#0A0E1A",
    letterSpacing: 0.2,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: DANGER,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 8,
  },
  backLink: {
    marginTop: 16,
    alignSelf: "center",
    padding: 8,
  },
  backLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _cardBg: {
    backgroundColor: CARD_BG,
  },
});
