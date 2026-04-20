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
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const TEXT_MUTED = "#9A9A8E";
const ACCENT = "#6F8A6A";
const BORDER = "rgba(47,62,47,0.12)";
const DANGER = "#C0392B";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, fetchUser } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleModeSwitch(next: Mode) {
    console.log("[AuthScreen] Switching mode to:", next);
    setMode(next);
    setError("");
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
      console.log("[AuthScreen] Auth succeeded — calling fetchUser then navigating to tabs");
      await fetchUser();
      router.replace("/(tabs)");
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
  const submitLabel = loading ? "..." : isSignUp ? "Create Account" : "Sign In";

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
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{submitLabel}</Text>
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
            console.log("[AuthScreen] Continue without signing in pressed — navigating to tabs");
            router.replace("/(tabs)");
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
            <Text style={{ fontSize: 11, color: "rgba(47,62,47,0.3)" }}>🔍 Debug Auth</Text>
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
    backgroundColor: "rgba(47,62,47,0.07)",
    borderRadius: 50,
    padding: 4,
    marginBottom: 32,
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
    color: "#FFFFFF",
  },
  fields: {
    gap: 14,
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#FFFFFF",
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
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
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
});
