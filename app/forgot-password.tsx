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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth";

const BG = "#0A0E1A";
const TEXT = "#F5F0E8";
const TEXT_MUTED = "#8B7355";
const ACCENT = "#C9A84C";
const BORDER = "rgba(201,168,76,0.18)";
const DANGER = "#C0392B";
const INPUT_BG = "#1A2035";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submitDisabled = loading || !email.trim();

  async function handleSubmit() {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    console.log("[ForgotPassword] Submit started — email:", email.trim());
    setLoading(true);
    try {
      await (authClient as any).requestPasswordReset({
        email: email.trim(),
        redirectTo: "sacreddesign://reset-password",
      });
      console.log("[ForgotPassword] Success");
      setSuccess(true);
    } catch (e: any) {
      console.log("[ForgotPassword] Error:", e?.message ?? e);
      setError("Could not send reset link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        {!success && (
          <View style={styles.fields}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={TEXT_MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              keyboardAppearance="light"
            />
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successCard}>
            <Text style={styles.successText}>
              If an account exists for this email, a reset link has been sent. Check your inbox (and spam folder).
            </Text>
          </View>
        ) : null}

        {!success && (
          <Pressable
            style={[styles.button, submitDisabled && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#0A0E1A" size="small" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={styles.backLink}
          onPress={() => {
            console.log("[ForgotPassword] Back to Sign In pressed");
            router.back();
          }}
        >
          <Text style={styles.backLinkText}>Back to Sign In</Text>
        </Pressable>
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
});
