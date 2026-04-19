import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ImageSourcePropType,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { apiFetch } from "@/lib/auth";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#6F8A6A";
const SKELETON_BG = "#E8E3DA";
const SUCCESS_TINT = "#EAF2EA";
const SUCCESS_TEXT = "#4A7A4A";


interface AlignmentData {
  id: string;
  day_number: number;
  level: string;
  action: string;
  guidance: string;
  somatic_cue: string;
  scripture: string;
  reflection_prompt: string;
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  generated_at: string;
  already_completed: boolean;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: "" };
  if (typeof source === "string") return { uri: source };
  return source as ImageSourcePropType;
}

function SkeletonLine({ width, height = 14 }: { width: number | string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: SKELETON_BG,
        opacity,
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <SkeletonLine width={120} height={11} />
        <SkeletonLine width={48} height={11} />
      </View>
      <View style={{ gap: 8, marginTop: 20, marginBottom: 24 }}>
        <SkeletonLine width="90%" height={18} />
        <SkeletonLine width="70%" height={18} />
      </View>
      <View style={{ gap: 6, marginBottom: 28 }}>
        <SkeletonLine width="100%" height={13} />
        <SkeletonLine width="80%" height={13} />
      </View>
      <SkeletonLine width="100%" height={52} />
    </View>
  );
}

const apiCall = apiFetch;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult, phase4Scores, clearSacredDesign } = useContext(DiscoveryContext);

  const [alignment, setAlignment] = useState<AlignmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sacredDesignResult) return;
    generateAlignment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult]);

  async function generateAlignment() {
    if (!sacredDesignResult) return;
    setLoading(true);
    setFallback(false);
    console.log("[Home] Generating daily alignment for", sacredDesignResult.primary_archetype);
    try {
      const body = {
        primary_archetype: sacredDesignResult.primary_archetype,
        secondary_archetype: sacredDesignResult.secondary_archetype,
        blend_name: sacredDesignResult.blend_name,
        anxious_score: phase4Scores?.anxious_score ?? 0,
        avoidant_score: phase4Scores?.avoidant_score ?? 0,
        overactive_score: phase4Scores?.overactive_score ?? 0,
        grounded_score: phase4Scores?.grounded_score ?? 0,
      };
      console.log("[Home] POST /api/alignments/generate", body);
      const res = await apiCall("/api/alignments/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] /api/alignments/generate failed:", res.status, errText);
        setFallback(true);
        return;
      }
      const data: AlignmentData = await res.json();
      console.log("[Home] Alignment received:", data.id, "day", data.day_number, "already_completed:", data.already_completed);
      setAlignment(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch (e) {
      console.warn("[Home] generateAlignment error:", e);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  }

  function handleBeginPress() {
    console.log("[Home] 'Bring Your Design to Life' button pressed — navigating to onboarding");
    router.push("/onboarding/welcome");
  }

  async function handleRetake() {
    console.log("[Home] 'Retake Discovery' pressed — clearing sacred design and navigating to welcome");
    clearSacredDesign();
    router.push("/onboarding/welcome");
  }

  function handleRespondPress() {
    if (!alignment) return;
    console.log("[Home] 'Respond to Today' pressed — alignment id:", alignment.id);
    const firstSentence = getFirstSentence(alignment.guidance);
    router.push({
      pathname: "/alignment-detail",
      params: {
        alignmentId: alignment.id,
        action: alignment.action,
        guidance: alignment.guidance,
        somatic_cue: alignment.somatic_cue,
        scripture: alignment.scripture,
        reflection_prompt: alignment.reflection_prompt,
        day_number: String(alignment.day_number),
      },
    });
    void firstSentence;
  }

  const topPadding = insets.top + 20;

  // ── State A: quiz not complete ──────────────────────────────────────────────
  if (!sacredDesignResult) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Text style={styles.eyebrow}>SACRED DESIGN</Text>
        <Text style={styles.heroTitle}>Bring Your{"\n"}Design to Life</Text>
        <Text style={styles.subtitle}>One small step today makes it real.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Begin Your Journey</Text>
          <Text style={styles.cardBody}>
            Discover how you naturally think, feel, and show up—and begin living it.
          </Text>
          <AnimatedPressable onPress={handleBeginPress}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>Bring Your Design to Life</Text>
            </View>
          </AnimatedPressable>
        </View>
        <Pressable
          onPress={() => {
            console.log("[Home] 'Sign In' link pressed — navigating to auth-screen");
            router.push("/auth-screen");
          }}
          style={{ marginTop: 20, padding: 8 }}
        >
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
            Sign In
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── State B: quiz complete ──────────────────────────────────────────────────
  const guidancePreview = alignment ? getFirstSentence(alignment.guidance) : "";
  const dayLabel = alignment ? `Day ${alignment.day_number}` : "";
  const isCompleted = alignment?.already_completed ?? false;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.eyebrow}>SACRED DESIGN</Text>
      <Text style={styles.heroTitle}>Today's{"\n"}Alignment</Text>
      <Text style={styles.subtitle}>Your daily practice awaits.</Text>

      {loading ? (
        <SkeletonCard />
      ) : fallback ? (
        <View style={styles.card}>
          <Text style={styles.fallbackText}>
            Complete your Sacred Discovery to unlock daily alignments.
          </Text>
        </View>
      ) : alignment ? (
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardEyebrow}>TODAY'S ALIGNMENT</Text>
            <Text style={styles.dayBadge}>{dayLabel}</Text>
          </View>

          {/* Action */}
          <Text style={styles.actionText}>{alignment.action}</Text>

          {/* Guidance preview */}
          <Text style={styles.guidancePreview} numberOfLines={2} ellipsizeMode="tail">
            {guidancePreview}
          </Text>

          {/* CTA or completed badge */}
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedCheck}>✓</Text>
              <Text style={styles.completedText}>Completed today</Text>
            </View>
          ) : (
            <AnimatedPressable onPress={handleRespondPress}>
              <View style={styles.button}>
                <Text style={styles.buttonText}>Respond to Today</Text>
              </View>
            </AnimatedPressable>
          )}
        </Animated.View>
      ) : null}

      <Pressable onPress={handleRetake} style={{ marginTop: 16, padding: 8 }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: TEXT_MUTED, textAlign: 'center' }}>
          Retake Discovery
        </Text>
      </Pressable>
    </View>
  );
}

function getFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 120);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 3.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 40,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 42,
    color: TEXT,
    textAlign: "center",
    lineHeight: 52,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_MUTED,
    textTransform: "uppercase",
  },
  dayBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: BUTTON_BG,
    backgroundColor: SUCCESS_TINT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  actionText: {
    fontFamily: "Lora_400Regular",
    fontSize: 18,
    color: TEXT,
    lineHeight: 28,
    marginBottom: 12,
  },
  guidancePreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 21,
    marginBottom: 24,
  },
  button: {
    backgroundColor: BUTTON_BG,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SUCCESS_TINT,
    borderRadius: 50,
    paddingVertical: 14,
    gap: 8,
  },
  completedCheck: {
    fontSize: 16,
    color: SUCCESS_TEXT,
  },
  completedText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: SUCCESS_TEXT,
  },
  cardTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: TEXT,
    textAlign: "center",
    marginBottom: 12,
  },
  cardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  fallbackText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 23,
    paddingVertical: 16,
  },
});
