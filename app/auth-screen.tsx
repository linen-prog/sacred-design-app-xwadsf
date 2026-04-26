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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";
  const anyLoading = loading || appleLoading || googleLoading;
  const submitDisabled = anyLoading || !email.trim() || !password.trim() || (isSignUp && !name.trim());
  const submitLabel = isSignUp ? "Create Account" : "Sign In";

  function handleModeSwitch(next: Mode) {
    console.log("[AuthScreen] Switching mode to:", next);
    setMode(next);
    setError("");
  }

  async function navigateAfterAuth(signedIn = false) {
    if (signedIn) {
      console.log("[AuthScreen] User signed in — resetting guestMode");
      await updateAppState({ guestMode: false });
    }
    if (isFromPostQuizSave) {
      console.log("[AuthScreen] from=post-quiz-save — setting postQuizSaveCompleted and routing to /partial-reveal");
      await updateAppState({ postQuizSaveCompleted: true });
      await new Promise(resolve => setTimeout(resolve, 75));
      router.replace('/partial-reveal');
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
      navigateAfterAuth(true);
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
      navigateAfterAuth(true);
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
    if (isSignUp && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    console.log('[AuthScreen] Sign-in attempt — email:', email.trim());
    setLoading(true);
    try {
      if (isSignUp) {
        console.log('[AuthScreen] Calling signUpWithEmail...');
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        console.log('[AuthScreen] Calling signInWithEmail...');
        await signInWithEmail(email.trim(), password);
      }
      console.log('[AuthScreen] Sign-in success — navigating');
      navigateAfterAuth(true);
    } catch (e: any) {
      console.log('[AuthScreen] Sign-in error:', e?.message);
      const raw = e?.message ?? '';
      const msg = raw.toLowerCase().includes('invalid') || raw.toLowerCase().includes('credentials') || raw.toLowerCase().includes('password')
        ? 'Incorrect email or password. Please try again.'
        : raw.toLowerCase().includes('not found') || raw.toLowerCase().includes('no user')
        ? 'No account found with that email. Try signing up.'
        : raw.toLowerCase().includes('already') || raw.toLowerCase().includes('exists')
        ? 'An account with this email already exists. Try signing in.'
        : raw.toLowerCase().includes('network') || raw.toLowerCase().includes('fetch')
        ? 'Network error. Check your connection and try again.'
        : raw || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const toggleLabel = isSignUp
    ? "Already have an account? Sign In"
    : "Don't have an account? Sign Up";
  const toggleTarget: Mode = isSignUp ? "signin" : "signup";

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
        <Text style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</Text>

        {/* Email form — primary action */}
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
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor={TEXT_MUTED}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              style={styles.eyeToggle}
              onPress={() => {
                console.log('[AuthScreen] Password visibility toggled:', !showPassword);
                setShowPassword(v => !v);
              }}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={TEXT_MUTED}
              />
            </Pressable>
          </View>

          {/* Forgot password */}
          <Pressable
            style={styles.forgotRow}
            onPress={() => console.log('[AuthScreen] Forgot password pressed')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Error card */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit button */}
        <Pressable
          style={[styles.button, submitDisabled && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitDisabled}
        >
          {loading ? (
            <ActivityIndicator color="#0A0E1A" size="small" />
          ) : (
            <Text style={styles.buttonText}>{submitLabel}</Text>
          )}
        </Pressable>

        {/* Social buttons — below email form in DEV, above in prod */}
        {__DEV__ ? (
          <Text style={styles.devNote}>Social login available on TestFlight</Text>
        ) : (
          <>
            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In — FIRST (App Store requirement) */}
            <Pressable
              style={[styles.appleButton, anyLoading && styles.buttonDisabled]}
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
              style={[styles.googleButton, anyLoading && styles.buttonDisabled]}
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
          </>
        )}

        {/* Mode toggle link */}
        <Pressable
          style={styles.toggleLink}
          onPress={() => handleModeSwitch(toggleTarget)}
        >
          <Text style={styles.toggleLinkText}>{toggleLabel}</Text>
        </Pressable>

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

        {/* Skip for now */}
        <Pressable
          style={styles.skipLink}
          onPress={async () => {
            console.log("[AuthScreen] Skip for now pressed");
            await updateAppState({ guestMode: true });
            navigateAfterAuth();
          }}
        >
          <Text style={styles.skipLinkText}>Skip for now</Text>
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
  fields: {
    gap: 14,
    marginBottom: 20,
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
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeToggle: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotRow: {
    alignSelf: "flex-end",
    paddingVertical: 2,
  },
  forgotText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
  },
  errorCard: {
    backgroundColor: "rgba(192,57,43,0.12)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(192,57,43,0.3)",
    marginBottom: 16,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: DANGER,
    lineHeight: 18,
    textAlign: "center",
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
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#0A0E1A",
    letterSpacing: 0.2,
  },
  devNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
    opacity: 0.6,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
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
  toggleLink: {
    marginTop: 20,
    alignSelf: "center",
    padding: 8,
  },
  toggleLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: ACCENT,
  },
  backLink: {
    marginTop: 8,
    alignSelf: "center",
    padding: 8,
  },
  backLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
  },
  skipLink: {
    marginTop: 4,
    alignSelf: "center",
    padding: 8,
  },
  skipLinkText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(201,168,76,0.3)",
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _cardBg: {
    backgroundColor: CARD_BG,
  },
});
