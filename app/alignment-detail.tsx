import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { getBearerToken } from "@/utils/api";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const TEXT_LIGHT = "#B8B0A4";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#6F8A6A";
const DIVIDER = "rgba(44,58,44,0.08)";
const SUCCESS_TINT = "#EAF2EA";
const SUCCESS_TEXT = "#4A7A4A";
const INPUT_BG = "#F5F0EB";
const DANGER = "#C0392B";

const API_BASE = "https://rxv2r6bszrawnrpuzqt5kh3zhd9kv48u.app.specular.dev";

async function apiCall(path: string, options?: RequestInit) {
  const token = await getBearerToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}

export default function AlignmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    alignmentId: string;
    action: string;
    guidance: string;
    somatic_cue: string;
    scripture: string;
    reflection_prompt: string;
    day_number: string;
  }>();

  const [reflectionText, setReflectionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  const dayNumber = params.day_number ?? "1";
  const action = params.action ?? "";
  const guidance = params.guidance ?? "";
  const somaticCue = params.somatic_cue ?? "";
  const scripture = params.scripture ?? "";
  const reflectionPrompt = params.reflection_prompt ?? "";
  const alignmentId = params.alignmentId ?? "";

  function handleBack() {
    console.log("[AlignmentDetail] Back button pressed");
    router.back();
  }

  async function handleComplete() {
    console.log("[AlignmentDetail] 'I Did This' pressed — alignmentId:", alignmentId);
    if (!reflectionText.trim()) {
      setValidationMsg("Add a reflection to complete your alignment.");
      return;
    }
    setValidationMsg("");
    setSubmitting(true);
    try {
      console.log("[AlignmentDetail] POST /api/alignments/:id/complete", { alignmentId, reflectionLength: reflectionText.length });
      const res = await apiCall(`/api/alignments/${alignmentId}/complete`, {
        method: "POST",
        body: JSON.stringify({ reflection_text: reflectionText.trim() }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[AlignmentDetail] complete failed:", res.status, errText);
        setValidationMsg("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      console.log("[AlignmentDetail] Alignment completed:", data);
      // Show success overlay
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
      ]).start();
      setTimeout(() => {
        console.log("[AlignmentDetail] Auto-navigating back to home after completion");
        router.replace("/(tabs)");
      }, 2000);
    } catch (e) {
      console.warn("[AlignmentDetail] handleComplete error:", e);
      setValidationMsg("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const dayLabel = `TODAY'S ALIGNMENT · DAY ${dayNumber}`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <AnimatedPressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </AnimatedPressable>

        {/* Eyebrow */}
        <Text style={styles.eyebrow}>{dayLabel}</Text>

        {/* Action */}
        <Text style={styles.actionTitle}>{action}</Text>

        <View style={styles.divider} />

        {/* Guidance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GUIDANCE</Text>
          <Text style={styles.sectionBody}>{guidance}</Text>
        </View>

        {/* Somatic Cue */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SOMATIC CUE</Text>
          <Text style={styles.sectionBody}>{somaticCue}</Text>
        </View>

        {/* Scripture */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SCRIPTURE</Text>
          <Text style={styles.scriptureText}>{`"${scripture}"`}</Text>
        </View>

        <View style={styles.divider} />

        {/* Reflect */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REFLECT</Text>
          <Text style={styles.reflectPrompt}>{reflectionPrompt}</Text>

          <TextInput
            style={styles.textInput}
            multiline
            numberOfLines={4}
            placeholder="Write your reflection here..."
            placeholderTextColor={TEXT_LIGHT}
            value={reflectionText}
            onChangeText={(t) => {
              setReflectionText(t);
              if (validationMsg) setValidationMsg("");
            }}
            textAlignVertical="top"
          />

          {validationMsg ? (
            <Text style={styles.validationMsg}>{validationMsg}</Text>
          ) : null}

          <AnimatedPressable
            onPress={handleComplete}
            disabled={submitting}
          >
            <View style={[styles.completeButton, submitting && styles.completeButtonDisabled]}>
              <Text style={styles.completeButtonText}>
                {submitting ? "Saving..." : "I Did This"}
              </Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>

      {/* Success overlay */}
      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: overlayOpacity }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: checkScale }] }]}>
            <Text style={styles.successCheck}>✓</Text>
            <Text style={styles.successMessage}>
              {"You're strengthening\na new pattern."}
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
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
    marginBottom: 32,
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
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    color: TEXT_MUTED,
    marginBottom: 16,
  },
  actionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: TEXT,
    lineHeight: 32,
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginBottom: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2.5,
    color: TEXT_MUTED,
    marginBottom: 10,
  },
  sectionBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT,
    lineHeight: 24,
  },
  scriptureText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 16,
    color: TEXT,
    lineHeight: 26,
  },
  reflectPrompt: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT,
    lineHeight: 24,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(44,58,44,0.10)",
    marginBottom: 12,
  },
  validationMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: DANGER,
    marginBottom: 12,
    lineHeight: 18,
  },
  completeButton: {
    backgroundColor: BUTTON_BG,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,30,20,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCard: {
    alignItems: "center",
    gap: 16,
  },
  successCheck: {
    fontSize: 56,
    color: "#7EC87E",
    lineHeight: 64,
  },
  successMessage: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
  },
});
