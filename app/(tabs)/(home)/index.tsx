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
import { useAuth } from "@/contexts/AuthContext";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#6F8A6A";
const SKELETON_BG = "#E8E3DA";
const SUCCESS_TINT = "#EAF2EA";
const SUCCESS_TEXT = "#4A7A4A";

interface DailyAlignment {
  id: string;
  user_id: string;
  day_number: number;
  level: number;
  action: string;
  guidance: string;
  somatic_cue: string;
  scripture: string;
  reflection_prompt: string;
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  generated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function getFirstSentence(text: string): string {
  if (!text) return "";
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 120);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult, quizCompleted, clearSacredDesign, restoreFromBackend } = useContext(DiscoveryContext);
  const { user } = useAuth();
  const isSignedIn = !!(user && (user as any).isAnonymous !== true);

  const [alignment, setAlignment] = useState<DailyAlignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // On mount: if quiz is marked complete but result is missing, try to restore from backend
  useEffect(() => {
    if (!sacredDesignResult && quizCompleted) {
      console.log("[Home] sacredDesignResult missing but quizCompleted=true — attempting restore from backend");
      apiFetch("/api/archetypes/me")
        .then(async (res) => {
          if (!res.ok) {
            const errText = await res.text();
            console.warn("[Home] GET /api/archetypes/me failed:", res.status, errText);
            return;
          }
          const data = await res.json();
          console.log("[Home] GET /api/archetypes/me response:", data);
          if (data && data.quiz_completed === true) {
            restoreFromBackend({
              primary_archetype: data.primary_archetype,
              secondary_archetype: data.secondary_archetype,
              blend_name: data.blend_name,
              scores: data.scores,
            });
          }
        })
        .catch((e) => {
          console.warn("[Home] GET /api/archetypes/me error:", e);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load alignment whenever sacredDesignResult becomes available
  useEffect(() => {
    if (!sacredDesignResult) return;
    loadTodayAlignment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult]);

  async function loadTodayAlignment() {
    setLoading(true);
    setError("");
    fadeAnim.setValue(0);
    console.log("[Home] GET /api/alignments/today");
    try {
      const res = await apiFetch("/api/alignments/today");
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] GET /api/alignments/today failed:", res.status, errText);
        setError("Couldn't load today's alignment.");
        return;
      }
      const data: { alignment: DailyAlignment | null } = await res.json();
      console.log("[Home] /api/alignments/today response — alignment:", data.alignment ? data.alignment.id : "null");

      if (data.alignment) {
        setAlignment(data.alignment);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      } else {
        // No alignment yet today — generate one
        await generateAlignment();
      }
    } catch (e) {
      console.warn("[Home] loadTodayAlignment error:", e);
      setError("Couldn't load today's alignment.");
    } finally {
      setLoading(false);
    }
  }

  async function generateAlignment() {
    console.log("[Home] POST /api/alignments/generate — generating today's alignment");
    try {
      const res = await apiFetch("/api/alignments/generate", { method: "POST" });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] POST /api/alignments/generate failed:", res.status, errText);
        setError("Couldn't generate today's alignment.");
        return;
      }
      const data: DailyAlignment = await res.json();
      console.log("[Home] Alignment generated:", data.id, "day", data.day_number);
      setAlignment(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch (e) {
      console.warn("[Home] generateAlignment error:", e);
      setError("Couldn't generate today's alignment.");
    }
  }

  async function handleRetry() {
    console.log("[Home] Retry button pressed");
    await loadTodayAlignment();
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

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.eyebrow}>SACRED DESIGN</Text>
      <Text style={styles.heroTitle}>Today's{"\n"}Alignment</Text>
      <Text style={styles.subtitle}>Your daily practice awaits.</Text>

      {loading ? (
        <>
          <SkeletonCard />
          <Text style={styles.generatingHint}>Preparing your alignment…</Text>
        </>
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.fallbackText}>{error}</Text>
          <AnimatedPressable onPress={handleRetry}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>Try Again</Text>
            </View>
          </AnimatedPressable>
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

          {/* CTA */}
          <AnimatedPressable onPress={handleRespondPress}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>Respond to Today</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <Pressable onPress={handleRetake} style={{ marginTop: 16, padding: 8 }}>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
          Retake Discovery
        </Text>
      </Pressable>
      {!isSignedIn && (
        <Pressable
          onPress={() => {
            console.log("[Home] 'Sign in to save your progress' pressed — navigating to auth-screen");
            router.push("/auth-screen");
          }}
          style={{ marginTop: 8, padding: 8 }}
        >
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
            Sign in to save your progress
          </Text>
        </Pressable>
      )}
    </View>
  );
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
  generatingHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 16,
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
    marginBottom: 16,
  },
});
