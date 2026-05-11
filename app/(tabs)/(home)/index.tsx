import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ImageSourcePropType,
  ImageBackground,
  Pressable,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { apiFetch } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

const SUNRISE_BG = require("../../../assets/images/ced5ab23-291e-4227-8a57-421a80a40d91.jpeg");

const BG = "#F5EFE6";
const TEXT = "#2A3A2F";
const TEXT_MUTED = "#8A8070";
const GOLD = "#C8A96B";
const GOLD_LIGHT = "rgba(200,169,107,0.15)";
const CARD_BG = "#FFFDF8";
const CARD_BORDER = "rgba(200,169,107,0.18)";
const BUTTON_BG = "#5C6E4A";
const BUTTON_GRADIENT_START = "#5A6B48";
const BUTTON_GRADIENT_END = "#3A4A2C";
const SKELETON_BG = "#EDE6DA";
const SUCCESS_TINT = "#EAF0EA";
const SUCCESS_TEXT = "#3D6B42";
const BANNER_BG = "#FDF6E3";
const BANNER_BORDER = "#C8A96B";
const BANNER_TEXT = "#7A5C1E";
const UPSELL_BG = "#1A1208";
const UPSELL_GOLD = "#C8A96B";
const UPSELL_TEXT = "#F5EFE6";
const UPSELL_MUTED = "rgba(245,239,230,0.65)";


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

interface MoodOption {
  emoji: string;
  label: string;
  value: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "😌", label: "Peaceful", value: "peaceful" },
  { emoji: "😰", label: "Anxious", value: "anxious" },
  { emoji: "🙏", label: "Grateful", value: "grateful" },
  { emoji: "😔", label: "Heavy", value: "heavy" },
  { emoji: "✨", label: "Hopeful", value: "hopeful" },
  { emoji: "😴", label: "Tired", value: "tired" },
];

let _hasRestoredFromBackend = false;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _unusedGetTimeGreeting() { return getTimeGreeting(); }

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

function FloatingParticles() {
  const particles = useRef(
    Array.from({ length: 6 }, (_, i) => ({
      anim: new Animated.Value(0),
      x: 10 + i * 16,
      size: 2 + (i % 3),
      delay: i * 900,
      duration: 7000 + i * 1200,
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      const loop = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }).start(loop);
      };
      loop();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            bottom: 0,
            left: `${p.x}%` as any,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: "rgba(255,215,100,0.45)",
            opacity: p.anim.interpolate({
              inputRange: [0, 0.15, 0.85, 1],
              outputRange: [0, 0.6, 0.6, 0],
            }),
            transform: [
              {
                translateY: p.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -320],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log('[DailyAlignment] render count:', renderCount.current);

  useEffect(() => {
    console.log('[DailyAlignment] MOUNT');
    return () => console.log('[DailyAlignment] UNMOUNT');
  }, []);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult, quizCompleted, clearSacredDesign, restoreFromBackend } = useContext(DiscoveryContext);
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const isSignedIn = !!(user && (user as any).isAnonymous !== true);

  const [alignment, setAlignment] = useState<DailyAlignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Mood state
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);

  // Yesterday's alignment check-in state
  interface YesterdayAlignment {
    id: string;
    action: string;
    guidance: string;
    day_number: number;
  }
  const [yesterdayAlignment, setYesterdayAlignment] = useState<YesterdayAlignment | null>(null);
  const [checkinDismissed, setCheckinDismissed] = useState(false);
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [checkinSaving, setCheckinSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const moodSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedAfterSignInRef = useRef(false);

  // On mount: if result is missing and user is signed in, try to restore from backend
  useEffect(() => {
    if (_hasRestoredFromBackend) return;
    if (!sacredDesignResult && isSignedIn) {
      _hasRestoredFromBackend = true;
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
          _hasRestoredFromBackend = false; // allow retry on error
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load alignment whenever sacredDesignResult becomes available
  useEffect(() => {
    if (!sacredDesignResult) return;
    loadTodayAlignment();
    loadProgress();
    loadTodayMood();
    loadYesterdayAlignment();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult]);

  // After sign-in, reload alignment if it wasn't loaded due to 401
  useEffect(() => {
    if (isSignedIn && sacredDesignResult && !alignment && !loading && !hasFetchedAfterSignInRef.current) {
      hasFetchedAfterSignInRef.current = true;
      console.log("[Home] User just signed in — reloading alignment");
      setAuthRequired(false);
      loadTodayAlignment();
      loadTodayMood();
      loadYesterdayAlignment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Cleanup mood saved timer on unmount
  useEffect(() => {
    return () => {
      if (moodSavedTimer.current) clearTimeout(moodSavedTimer.current);
    };
  }, []);

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

  async function loadTodayMood() {
    if (!isSignedIn) return;
    const localDate = new Date().toISOString().split("T")[0];
    console.log("[Home] GET /api/moods/today?date=" + localDate);
    try {
      const res = await apiFetch(`/api/moods/today?date=${localDate}`);
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] GET /api/moods/today failed:", res.status, errText);
        return;
      }
      const data = await res.json();
      console.log("[Home] /api/moods/today response:", data);
      if (data && data.mood) {
        setTodayMood(data.mood);
      }
    } catch (e) {
      console.warn("[Home] loadTodayMood error:", e);
    }
  }

  async function handleMoodSelect(value: string) {
    console.log("[Home] Mood selected:", value);
    setTodayMood(value);
    if (!isSignedIn) return;
    setMoodSaving(true);
    const localDate = new Date().toISOString().split("T")[0];
    console.log("[Home] POST /api/moods — mood:", value, "date:", localDate);
    try {
      const res = await apiFetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: value, date: localDate }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] POST /api/moods failed:", res.status, errText);
      } else {
        console.log("[Home] Mood saved successfully");
        setMoodSaved(true);
        if (moodSavedTimer.current) clearTimeout(moodSavedTimer.current);
        moodSavedTimer.current = setTimeout(() => setMoodSaved(false), 1500);
      }
    } catch (e) {
      console.warn("[Home] handleMoodSelect error:", e);
    } finally {
      setMoodSaving(false);
    }
  }

  async function loadYesterdayAlignment() {
    if (!isSignedIn) return;
    const localDate = new Date().toISOString().split("T")[0];
    console.log("[Home] GET /api/alignments/yesterday?local_date=" + localDate);
    try {
      const res = await apiFetch(`/api/alignments/yesterday?local_date=${localDate}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.alignment) setYesterdayAlignment(data.alignment);
    } catch (e) {
      console.warn("[Home] loadYesterdayAlignment error:", e);
    }
  }

  async function handleCheckin(response: "practiced" | "thought_about" | "not_yet") {
    if (!yesterdayAlignment) return;
    console.log("[Home] Check-in button pressed — response:", response, "alignment_id:", yesterdayAlignment.id);
    setCheckinSaving(true);
    try {
      if (isSignedIn) {
        console.log("[Home] POST /api/alignments/checkin — alignment_id:", yesterdayAlignment.id, "response:", response);
        const res = await apiFetch("/api/alignments/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alignment_id: yesterdayAlignment.id, response }),
        });
        if (!res.ok) console.warn("[Home] checkin failed:", res.status);
      }
      setCheckinSaved(true);
      setTimeout(() => setCheckinDismissed(true), 1800);
    } catch (e) {
      console.warn("[Home] handleCheckin error:", e);
      setCheckinDismissed(true);
    } finally {
      setCheckinSaving(false);
    }
  }

  async function loadTodayAlignment() {
    setLoading(true);
    setError("");
    setAuthRequired(false);
    fadeAnim.setValue(0);
    const localDate = new Date().toISOString().split("T")[0];
    console.log("[Home] GET /api/alignments/today?local_date=" + localDate);
    try {
      const res = await apiFetch(`/api/alignments/today?local_date=${localDate}`);
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Home] GET /api/alignments/today failed:", res.status, errText);
        if (res.status === 401) {
          setAuthRequired(true);
        } else {
          setError("Couldn't load today's alignment.");
        }
        return;
      }
      const data: { alignment: DailyAlignment | null; reason?: string } = await res.json();
      console.log("[Home] alignment:", data.alignment?.id ?? "null", "reason:", data.reason ?? "none");
      if (data.alignment) {
        setAlignment(data.alignment);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      } else if (data.reason === "no_archetype") {
        setError("Complete your Sacred Design quiz to generate your alignment.");
      } else {
        setError("Couldn't generate today's alignment.");
      }
    } catch (e) {
      console.warn("[Home] loadTodayAlignment error:", e);
      setError("Couldn't load today's alignment.");
    } finally {
      setLoading(false);
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

  const greetingLine = firstName ? `Good to see you back, ${firstName}` : "Good to see you back";

  const showBanner =
    !bannerDismissed &&
    progress?.last_active_date != null &&
    getDaysAway(progress.last_active_date) >= 2;

  const daysAwayCount = progress?.last_active_date ? getDaysAway(progress.last_active_date) : 0;
  const bannerMessage = `You were away for ${daysAwayCount} days. Your sacred design is waiting for you. 🌿`;

  // Day 2+ upsell: show when user has completed Day 1 and is not subscribed
  const dayCount = progress?.day_count ?? 0;
  const showDay2Upsell = !isSubscribed && dayCount >= 1 && sacredDesignResult != null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _quizCompleted = quizCompleted;

  // ── State A: quiz not complete ──────────────────────────────────────────────
  if (!sacredDesignResult) {
    return (
      <ImageBackground
        source={SUNRISE_BG}
        resizeMode="cover"
        style={[styles.container, { paddingTop: topPadding }]}
        imageStyle={{ opacity: 0.82 }}
      >
        {/* Full-screen gradient overlay */}
        <LinearGradient
          colors={[
            "rgba(245,239,230,0.00)",
            "rgba(245,239,230,0.00)",
            "rgba(245,239,230,0.38)",
            "rgba(245,239,230,0.55)",
            "rgba(245,239,230,0.88)",
          ]}
          locations={[0, 0.30, 0.55, 0.72, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <FloatingParticles />
        <Pressable
          onPress={() => {
            console.log("[Home] Settings button pressed");
            router.push("/settings");
          }}
          style={[styles.settingsButton, { top: topPadding - 8 }]}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>

        <View style={styles.contentWrapper}>
          <Text style={styles.eyebrow}>SACRED DESIGN</Text>
          <Text style={styles.heroTitle}>Bring Your{"\n"}Design to Life</Text>
          <Text style={styles.subtitle}>One small step today makes it real.</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Begin Your Journey</Text>
            <Text style={styles.cardBody}>
              Discover how you naturally think, feel, and show up—and begin living it.
            </Text>
            <AnimatedPressable onPress={handleBeginPress}>
              <LinearGradient
                colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Bring Your Design to Life</Text>
              </LinearGradient>
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
      </ImageBackground>
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
    <ImageBackground
      source={SUNRISE_BG}
      resizeMode="cover"
      style={[styles.container, { paddingTop: topPadding }]}
      imageStyle={{ opacity: 0.82 }}
    >
      {/* Full-screen gradient overlay */}
      <LinearGradient
        colors={[
          "rgba(245,239,230,0.00)",
          "rgba(245,239,230,0.00)",
          "rgba(245,239,230,0.38)",
          "rgba(245,239,230,0.55)",
          "rgba(245,239,230,0.88)",
        ]}
        locations={[0, 0.30, 0.55, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <FloatingParticles />
      <Pressable
        onPress={() => {
          console.log("[Home] Settings button pressed");
          router.push("/settings");
        }}
        style={[styles.settingsButton, { top: topPadding - 8 }]}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </Pressable>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Atmospheric lower glow */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 80,
            left: -40,
            right: -40,
            height: 300,
            borderRadius: 200,
            backgroundColor: "rgba(200,160,60,0.07)",
          }}
        />
        <Text style={styles.eyebrow}>SACRED DESIGN</Text>

        {/* Blend subtitle — split into two lines */}
        {blendName ? (
          <View style={styles.blendSubtitleContainer}>
            <Text style={styles.blendSubtitleLine1}>Your sacred design:</Text>
            <Text style={styles.blendSubtitleLine2}>{blendName}</Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>Your daily practice awaits.</Text>
        )}

        {/* Yesterday's Alignment Check-In */}
        {yesterdayAlignment && !checkinDismissed && isSignedIn && (
          <View style={styles.checkinCard}>
            {checkinSaved ? (
              <View style={styles.checkinSavedRow}>
                <Text style={styles.checkinSavedText}>Saved to your journey. 🌿</Text>
              </View>
            ) : (
              <>
                <Text style={styles.checkinTitle}>How did yesterday's alignment go?</Text>
                <View style={styles.checkinReminder}>
                  <Text style={styles.checkinReminderLabel}>Yesterday's Alignment</Text>
                  <Text style={styles.checkinReminderAction}>"{yesterdayAlignment.action}"</Text>
                  {yesterdayAlignment.guidance ? (
                    <Text style={styles.checkinReminderGuidance} numberOfLines={2}>
                      {getFirstSentence(yesterdayAlignment.guidance)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.checkinButtons}>
                  {[
                    { label: "I practiced it", value: "practiced" as const },
                    { label: "I thought about it", value: "thought_about" as const },
                    { label: "Not yet", value: "not_yet" as const },
                  ].map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleCheckin(opt.value)}
                      disabled={checkinSaving}
                      style={styles.checkinButton}
                    >
                      <Text style={styles.checkinButtonText}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
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
        ) : authRequired ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In to Continue</Text>
            <Text style={styles.cardBody}>
              Sign in to generate your daily alignment and save your progress.
            </Text>
            <AnimatedPressable onPress={() => {
              console.log("[Home] 'Sign In' CTA pressed — navigating to auth-screen");
              router.push("/auth-screen");
            }}>
              <LinearGradient
                colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Sign In</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.fallbackText}>{error}</Text>
            <AnimatedPressable onPress={handleRetry}>
              <LinearGradient
                colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Try Again</Text>
              </LinearGradient>
            </AnimatedPressable>
          </View>
        ) : alignment ? (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            {/* Top row */}
            <View style={styles.cardTopRow}>
              <Text style={styles.cardEyebrow}>✦  TODAY'S ALIGNMENT</Text>
              {dayLabel ? <Text style={styles.dayBadge}>{dayLabel}</Text> : null}
            </View>

            {/* Action */}
            <Text style={styles.actionText}>{alignment.action}</Text>

            {/* Gold divider */}
            <View style={styles.cardDivider} />

            {/* Guidance preview */}
            <Text style={styles.guidancePreview} numberOfLines={2} ellipsizeMode="tail">
              {guidancePreview}
            </Text>

            {/* CTA */}
            <AnimatedPressable onPress={handleRespondPress}>
              <LinearGradient
                colors={[BUTTON_GRADIENT_START, BUTTON_GRADIENT_END]}
                style={[styles.buttonGradient, styles.buttonShadow]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.buttonText}>Respond to Today</Text>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>
        ) : null}

        <Pressable onPress={handleRetake} style={{ marginTop: 16, padding: 8 }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
            Retake Discovery
          </Text>
        </Pressable>
        {!isSignedIn && !authRequired && (
          <Pressable
            onPress={() => {
              console.log("[Home] 'Sign in to save your progress' pressed — navigating to auth-screen");
              router.push("/auth-screen");
            }}
            style={{ marginTop: 8, padding: 8 }}
          >
            <Text style={{
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              color: BUTTON_BG,
              textAlign: "center",
              textDecorationLine: "underline",
            }}>
              Sign in to save your progress
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
  },
  contentWrapper: {
    zIndex: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scrollView: {
    zIndex: 1,
    width: "100%",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  eyebrow: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    letterSpacing: 6,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 0,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.40)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 36,
    color: TEXT,
    textAlign: "center",
    lineHeight: 50,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.80)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
    marginTop: 200,
  },
  blendSubtitleContainer: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 200,
  },
  blendSubtitleLine1: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontStyle: "italic",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 6,
  },
  blendSubtitleLine2: {
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    color: "#FFFFFF",
    fontStyle: "italic",
    textAlign: "center",
    textShadowColor: "rgba(180,130,40,0.55)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
    lineHeight: 38,
    marginBottom: 4,
  },
  headerDivider: {
    width: 60,
    height: 1,
    backgroundColor: "rgba(255,220,120,0.55)",
    alignSelf: "center",
    marginTop: 18,
    marginBottom: 28,
  },
  // Mood section
  moodSection: {
    width: "100%",
    marginBottom: 24,
  },
  moodLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  moodLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  moodSavedText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: SUCCESS_TEXT,
  },
  moodScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  moodPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 50,
    gap: 5,
  },
  moodPillSelected: {
    backgroundColor: "rgba(92,110,74,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,220,140,0.35)",
  },
  moodPillUnselected: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,220,140,0.25)",
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodPillLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
  },
  moodPillLabelSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_500Medium",
  },
  reengageBanner: {
    width: "100%",
    backgroundColor: "rgba(253,246,227,0.65)",
    borderRadius: 14,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(200,169,107,0.50)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
    backgroundColor: "rgba(26,18,8,0.88)",
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
    borderColor: "rgba(200,169,107,0.2)",
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
    color: UPSELL_BG,
    letterSpacing: 0.2,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,250,235,0.48)",
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 32,
    shadowColor: "#7A5C10",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 32,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.25)",
    marginBottom: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardEyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(160,120,40,0.85)",
    textTransform: "uppercase",
  },
  dayBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: GOLD,
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  actionText: {
    fontFamily: "Lora_400Regular",
    fontSize: 18,
    color: "#2A3520",
    lineHeight: 30,
    marginBottom: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(220,185,100,0.30)",
    marginBottom: 18,
  },
  guidancePreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(42,53,32,0.65)",
    lineHeight: 23,
    marginBottom: 24,
    fontStyle: "italic",
    letterSpacing: 0.1,
  },
  buttonGradient: {
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonShadow: {
    shadowColor: "#4A5C38",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 5,
    borderRadius: 50,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.35)",
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 1,
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
    marginBottom: 20,
    justifyContent: "center",
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 50,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.28)",
  },
  statPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  settingsButton: {
    position: "absolute",
    right: 24,
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
  checkinCard: {
    width: "100%",
    backgroundColor: "rgba(245,238,215,0.45)",
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.22)",
  },
  checkinTitle: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    color: "rgba(42,53,32,0.90)",
    marginBottom: 12,
    lineHeight: 22,
  },
  checkinReminder: {
    backgroundColor: "#FAFAF7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: BUTTON_BG,
  },
  checkinReminderLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_MUTED,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  checkinReminderAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
    marginBottom: 4,
  },
  checkinReminderGuidance: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginTop: 4,
  },
  checkinButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  checkinButton: {
    flex: 1,
    backgroundColor: "rgba(255,250,235,0.45)",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.30)",
    shadowColor: "#8B6914",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  checkinButtonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(42,53,32,0.85)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  checkinSavedRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  checkinSavedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: SUCCESS_TEXT,
  },
});
