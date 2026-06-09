import React, { useState, useEffect } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { authClient } from "@/lib/auth";

const BG = "#0A0E1A";
const TEXT = "#F5F0E8";
const TEXT_MUTED = "#8B7355";
const ACCENT = "#C9A84C";
const BORDER = "rgba(201,168,76,0.18)";
const DANGER = "#C0392B";
const INPUT_BG = "#1A2035";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log("[ResetPassword] Mounted with token:", token ?? "none");
  }, [token]);

  const submitDisabled = loading || !password.trim() || !confirmPassword.trim();

  function mapError(e: any): string {
    const raw = (e?.message ?? "").toLowerCase();
    if (raw.includes("expired") || raw.includes("invalid") || raw.includes("token")) {
      return "This reset link is invalid or has expired. Please request a new one.";
    }
    if (raw.includes("weak") || raw.includes("short") || raw.includes("password")) {
      return "Password must be at least 8 characters.";
    }
    if (raw.includes("network") || raw.includes("fetch")) {
      return "Network error. Check your connection and try again.";
    }
    return e?.message ?? "Could not reset password. Please try again.";
  }

  async function handleSubmit() {
    setError("");

    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please fill in both password fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (confirmPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    console.log("[ResetPassword] Submit started");
    setLoading(true);
    try {
      const { error: resetError } = await (authClient as any).resetPassword({
        newPassword: password,
        token: token as string,
      });
      if (resetError) {
        throw new Error(resetError.message || "Reset failed");
      }
      console.log("[ResetPassword] Success");
      setSuccess(true);
    } catch (e: any) {
      console.log("[ResetPassword] Error:", e?.message ?? e);
      setError(mapError(e));
    } finally {
      setLoading(false);
    }
  }

  const invalidToken = !token;

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
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>

        {invalidToken ? (
          <>
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                This reset link is invalid or has expired. Please request a new one.
              </Text>
            </View>
            <Pressable
              style={styles.button}
              onPress={() => {
                console.log("[ResetPassword] Request new link pressed");
                router.replace("/forgot-password" as any);
              }}
            >
              <Text style={styles.buttonText}>Request a new link</Text>
            </Pressable>
          </>
        ) : success ? (
          <>
            <View style={styles.successCard}>
              <Text style={styles.successText}>
                Your password has been reset. You can now sign in with your new password.
              </Text>
            </View>
            <Pressable
              style={styles.button}
              onPress={() => {
                console.log("[ResetPassword] Sign In pressed after success");
                router.replace("/auth-screen" as any);
              }}
            >
              <Text style={styles.buttonText}>Sign In</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.fields}>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="New password"
                  placeholderTextColor={TEXT_MUTED}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  keyboardAppearance="light"
                />
                <Pressable
                  style={styles.eyeToggle}
                  onPress={() => {
                    console.log("[ResetPassword] Password visibility toggled:", !showPassword);
                    setShowPassword((v) => !v);
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

              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={TEXT_MUTED}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                keyboardAppearance="light"
              />
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.button, submitDisabled && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitDisabled}
            >
              {loading ? (
                <ActivityIndicator color="#0A0E1A" size="small" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </Pressable>
          </>
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
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
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
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
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
  successCard: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    marginBottom: 16,
  },
  successText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: ACCENT,
    lineHeight: 18,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#D4B05A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 52,
    shadowColor: "#C9A84C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#0A0E1A",
    letterSpacing: 0.2,
  },
});
