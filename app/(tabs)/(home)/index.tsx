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
import { useSubscription } from "@/contexts/SubscriptionContext";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#6F8A6A";
const SKELETON_BG = "#E8E3DA";
const SUCCESS_TINT = "#EAF2EA";
const SUCCESS_TEXT = "#4A7A4A";
const BANNER_BG = "#FDF6E3";
const BANNER_BORDER = "#C9A84C";
const BANNER_TEXT = "#7A5C1E";
const UPSELL_BG = "#0A0E1A";
const UPSELL_GOLD = "#C9A84C";
const UPSELL_TEXT = "#F5F0E8";
const UPSELL_MUTED = "rgba(245,240,232,0.65)";

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

interface ProgressData {
  day_count: number;
  streak: number;
  last_active_date?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: "" };
  if (typeof source === "string") return { uri: source };
  return source as ImageSourcePropType;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

function getDaysAway(lastActiveDateStr: string): number {
  try {
    const last = new Date(lastActiveDateStr);
    const today = new Date();
    last.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - last.getTime()) / 86400000);
  } catch {
    return 0;
  }
}

function SkeletonLine({ width, height = 14 }: { width: number | `${number}%`; height?: number }) {
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
  const { isSubscribed } = useSubscription();
  const isSignedIn = !!(user && (user as any).isAnonymous !== true);

  const [alignment, setAlignment] = useState<DailyAlignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;

  // On mount: if result is missing and user is signed in, try to restore from backend
  useEffect(() => {
    if (!sacredDesignResult && isSignedIn) {
      console.log("[Home] No local result but user is signed in — attempting restore from backend");
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
    loadProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult]);

  async function loadProgress() {
    console.log("[Home] GET /api/progress");
    try {
      const res = await apiFetch("/api/progress");
      if (res.ok) {
        const data: ProgressData = await res.json();
        console.log("[Home] /api/progress response:", data);
        setProgress(data);
        // Animate re-engagement banner in if needed
        if (data.last_active_date) {
          const daysAway = getDaysAway(data.last_active_date);
          if (daysAway >= 2) {
            console.log("[Home] User was away for", daysAway, "days — showing re-engagement banner");
            Animated.timing(bannerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
          }
        }
      }
    } catch (e) {
      // non-critical, ignore
    }
  }

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

  function handleDismissBanner() {
    console.log("[Home] Re-engagement banner dismissed");
    Animated.timing(bannerOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setBannerDismissed(true);
    });
  }

  function handleUnlockFullAccess() {
    console.log("[Home] 'Unlock Full Access' pressed — navigating to /paywall?source=day2_upsell");
    router.push("/paywall?source=day2_upsell");
  }

  const topPadding = insets.top + 20;

  // Compute greeting
  const firstName = user ? (String((user as any).name ?? "")).split(" ")[0] : "";
  const blendName = sacredDesignResult?.blend_name ?? "";

  const greetingLine = "Good to see you back, Tina";

  const showBanner =
    !bannerDismissed &&
    progress?.last_active_date != null &&
    getDaysAway(progress.last_active_date) >= 2;

  const daysAwayCount = progress?.last_active_date ? getDaysAway(progress.last_active_date) : 0;
  const bannerMessage = `You were away for ${daysAwayCount} days. Your sacred design is waiting for you. 🌿`;

  // Day 2+ upsell: show when user has completed Day 1 and is not subscribed
  const dayCount = progress?.day_count ?? 0;
  const showDay2Upsell = !isSubscribed && dayCount >= 1 && sacredDesignResult != null;

  // ── State A: quiz not complete ──────────────────────────────────────────────
  if (!sacredDesignResult) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Pressable
          onPress={() => {
            console.log("[Home] Settings button pressed");
            router.push("/settings");
          }}
          style={[styles.settingsButton, { top: topPadding - 8 }]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
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
  const showStreakPill = progress !== null && progress.streak > 0;
  const showDaysPill = progress !== null && progress.day_count > 0;
  const showProgressRow = showStreakPill || showDaysPill;
  const streakLabel = progress ? `🔥 ${progress.streak}-day streak` : "";
  const daysLabel = progress ? `${progress.day_count} days total` : "";

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <Pressable
        onPress={() => {
          console.log("[Home] Settings button pressed");
          router.push("/settings");
        }}
        style={[styles.settingsButton, { top: topPadding - 8 }]}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </Pressable>
      <Text style={styles.eyebrow}>SACRED DESIGN</Text>

      {/* Dynamic greeting */}
      <Text style={styles.heroTitle}>{greetingLine}</Text>
      {blendName ? (
        <Text style={styles.blendSubtitle}>Your sacred design: {blendName}</Text>
      ) : (
        <Text style={styles.subtitle}>Your daily practice awaits.</Text>
      )}

      {/* Re-engagement banner */}
      {showBanner && (
        <Animated.View style={[styles.reengageBanner, { opacity: bannerOpacity }]}>
          <Text style={styles.reengageText}>{bannerMessage}</Text>
          <Pressable onPress={handleDismissBanner} style={styles.reengageDismiss}>
            <Text style={styles.reengageDismissText}>✕</Text>
          </Pressable>
        </Animated.View>
      )}

      {showProgressRow && (
        <View style={styles.progressRow}>
          {showStreakPill && (
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>{streakLabel}</Text>
            </View>
          )}
          {showDaysPill && (
            <View style={styles.statPill}>
              <Text style={styles.statPillText}>{daysLabel}</Text>
            </View>
          )}
        </View>
      )}

      {/* Day 2+ upsell banner — shown inline, non-blocking */}
      {showDay2Upsell && (
        <View style={styles.upsellCard}>
          <View style={styles.upsellTopRow}>
            <Text style={styles.upsellHeading}>You're on a streak 🔥</Text>
          </View>
          <Text style={styles.upsellBody}>
            Unlock your full Sacred Design journey — daily alignments, reflections, and growth tracking.
          </Text>
          <Pressable
            style={styles.upsellButton}
            onPress={handleUnlockFullAccess}
          >
            <Text style={styles.upsellButtonText}>Unlock Full Access</Text>
          </Pressable>
        </View>
      )}

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
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 34,
    color: TEXT,
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  blendSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
    marginBottom: 24,
  },
  reengageBanner: {
    width: "100%",
    backgroundColor: BANNER_BG,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: BANNER_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#C9A84C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reengageText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: BANNER_TEXT,
    lineHeight: 21,
    fontStyle: "italic",
  },
  reengageDismiss: {
    padding: 4,
    marginLeft: 8,
  },
  reengageDismissText: {
    fontSize: 14,
    color: BANNER_TEXT,
    opacity: 0.6,
  },
  // Day 2+ upsell card
  upsellCard: {
    width: "100%",
    backgroundColor: UPSELL_BG,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
  },
  upsellTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  upsellHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: UPSELL_TEXT,
    lineHeight: 26,
  },
  upsellBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: UPSELL_MUTED,
    lineHeight: 21,
    marginBottom: 16,
  },
  upsellButton: {
    backgroundColor: UPSELL_GOLD,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  upsellButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0A0E1A",
    letterSpacing: 0.2,
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
  progressRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  statPill: {
    backgroundColor: "rgba(111, 138, 106, 0.10)",
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  statPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: BUTTON_BG,
  },
  settingsButton: {
    position: "absolute",
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 18,
    color: TEXT_MUTED,
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _unused: {
    backgroundColor: SUCCESS_TEXT,
  },
});
