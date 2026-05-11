import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  ImageBackground,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { apiFetch } from "@/lib/auth";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const TEXT_LIGHT = "#B8B0A4";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#6F8A6A";
const GOLD = "#C9A84C";
const DIVIDER = "rgba(44,58,44,0.08)";
const SUCCESS_TINT = "#EAF2EA";
const SUCCESS_TEXT = "#4A7A4A";
const INPUT_BG = "rgba(245,240,235,0.80)";
const DETAIL_BG = require('../assets/images/36fb7a5a-a52b-4d25-929f-7bb738c59117.jpeg');
const DANGER = "#C0392B";

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
    blend_name?: string;
    hasReflection?: string;
  }>();

  const [reflectionText, setReflectionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Mark as Done state
  const alreadyDone = params.hasReflection === "true";
  const [markDoneLoading, setMarkDoneLoading] = useState(false);
  const [markDoneSuccess, setMarkDoneSuccess] = useState(alreadyDone);
  const [markDoneMsg, setMarkDoneMsg] = useState("");

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.6)).current;

  const dayNumber = params.day_number ?? "1";
  const action = params.action ?? "";
  const guidance = params.guidance ?? "";
  const somaticCue = params.somatic_cue ?? "";
  const scripture = params.scripture ?? "";
  const reflectionPrompt = params.reflection_prompt ?? "";
  const alignmentId = params.alignmentId ?? "";

  const dayLabel = `TODAY'S ALIGNMENT · DAY ${dayNumber}`;
  const scriptureQuoted = `"${scripture}"`;
  const submitLabel = submitting ? "Saving..." : "Save Reflection";

  function handleBack() {
    console.log("[AlignmentDetail] Back button pressed");
    router.back();
  }

  async function handleMarkDone() {
    if (markDoneSuccess || markDoneLoading) return;
    console.log("[AlignmentDetail] 'Mark as Done' pressed — alignmentId:", alignmentId);
    setMarkDoneLoading(true);
    setMarkDoneMsg("");
    try {
      const res = await apiFetch(`/api/alignments/${alignmentId}/complete`, {
        method: "POST",
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[AlignmentDetail] POST /complete failed:", res.status, errText);
        setMarkDoneMsg("Couldn't mark as done. Try again.");
        setMarkDoneLoading(false);
        return;
      }
      console.log("[AlignmentDetail] Alignment marked as done:", alignmentId);
      setMarkDoneSuccess(true);
      setMarkDoneMsg("Done! Great work today.");
      console.log("[AlignmentDetail] Navigating to completion screen after mark as done");
      router.replace("/completion?source=mark_done");
    } catch (e) {
      console.warn("[AlignmentDetail] handleMarkDone error:", e);
      setMarkDoneMsg("Couldn't mark as done. Try again.");
    } finally {
      setMarkDoneLoading(false);
    }
  }

  async function handleSubmitReflection() {
    console.log("[AlignmentDetail] 'Save Reflection' pressed — alignmentId:", alignmentId);
    if (!reflectionText.trim()) {
      setValidationMsg("Add a reflection before saving.");
      return;
    }
    setValidationMsg("");
    setSubmitting(true);
    console.log("[AlignmentDetail] POST /api/alignments/:id/reflection", { alignmentId, reflectionLength: reflectionText.trim().length });
    try {
      const res = await apiFetch(`/api/alignments/${alignmentId}/reflection`, {
        method: "POST",
        body: JSON.stringify({ reflection_text: reflectionText.trim() }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[AlignmentDetail] POST /reflection failed:", res.status, errText);
        setValidationMsg("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      console.log("[AlignmentDetail] Reflection saved:", data);
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
      ]).start(() => {
        console.log("[AlignmentDetail] Navigating to completion screen after reflection saved");
        router.replace("/completion?source=reflection_saved");
      });
    } catch (e) {
      console.warn("[AlignmentDetail] handleSubmitReflection error:", e);
      setValidationMsg("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const markDoneButtonStyle = markDoneSuccess
    ? [styles.markDoneButton, styles.markDoneButtonDone]
    : markDoneLoading
    ? [styles.markDoneButton, styles.markDoneButtonLoading]
    : styles.markDoneButton;

  const markDoneLabel = markDoneLoading
    ? "Marking…"
    : markDoneSuccess
    ? "✓ Done"
    : "Mark as Done ✓";

  const markDoneTextStyle = markDoneSuccess
    ? [styles.markDoneText, styles.markDoneTextDone]
    : styles.markDoneText;

  return (
    <ImageBackground
      source={DETAIL_BG}
      style={{ flex: 1, backgroundColor: BG }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.65 }}
    >
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
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
          <Text style={styles.scriptureText}>{scriptureQuoted}</Text>
        </View>

        <View style={styles.divider} />

        {/* Mark as Done */}
        <View style={styles.markDoneSection}>
          <AnimatedPressable
            onPress={handleMarkDone}
            disabled={markDoneSuccess || markDoneLoading}
          >
            <View style={markDoneButtonStyle}>
              <Text style={markDoneTextStyle}>{markDoneLabel}</Text>
            </View>
          </AnimatedPressable>
          {markDoneMsg ? (
            <Text style={markDoneSuccess ? styles.markDoneMsgSuccess : styles.markDoneMsgError}>
              {markDoneMsg}
            </Text>
          ) : null}
        </View>

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
            onPress={handleSubmitReflection}
            disabled={submitting}
          >
            <View style={[styles.completeButton, submitting && styles.completeButtonDisabled]}>
              <Text style={styles.completeButtonText}>{submitLabel}</Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Archetype blend info card */}
        <View style={styles.blendCard}>
          <Text style={styles.blendLabel}>YOUR DESIGN</Text>
          <Text style={styles.blendValue}>{params.blend_name ?? ""}</Text>
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
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
  markDoneSection: {
    marginBottom: 28,
    alignItems: "flex-start",
  },
  markDoneButton: {
    borderWidth: 1.5,
    borderColor: GOLD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  markDoneButtonDone: {
    backgroundColor: "rgba(201,168,76,0.10)",
    borderColor: "rgba(201,168,76,0.4)",
  },
  markDoneButtonLoading: {
    opacity: 0.6,
  },
  markDoneText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: GOLD,
    letterSpacing: 0.2,
  },
  markDoneTextDone: {
    color: "rgba(201,168,76,0.7)",
  },
  markDoneMsgSuccess: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: SUCCESS_TEXT,
    marginTop: 8,
    lineHeight: 18,
  },
  markDoneMsgError: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: DANGER,
    marginTop: 8,
    lineHeight: 18,
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
  blendCard: {
    backgroundColor: 'rgba(255,253,245,0.75)',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,169,107,0.20)',
    alignItems: "center",
  },
  blendLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  blendValue: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 15,
    color: TEXT,
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
    color: SUCCESS_TEXT,
    lineHeight: 64,
  },
  successMessage: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 30,
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _unused: {
    backgroundColor: SUCCESS_TINT,
  },
});
