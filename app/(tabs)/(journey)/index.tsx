import React, { useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/auth";

const JOURNEY_BG = require("../../../assets/images/3c13e2d7-0feb-4251-9c16-2d05c7546294.jpeg");

interface ReflectionItem {
  id: string;
  alignment_id: string;
  reflection_text: string;
  completed_at: string;
  day_number: number;
  action: string;
}

const BG = "#F6F1E8";
const TEXT = "#3D3530";
const TEXT_MUTED = "#8A8070";
const TEXT_LIGHT = "#A8B5A2";
const CARD_BG = "#FFFDF7";
const ACCENT = "#6F8A6A";
const GOLD = "#C9A84C";
const DIVIDER = "rgba(61,53,48,0.07)";

interface AlignmentHistoryItem {
  id: string;
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
  hasReflection?: boolean;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function truncateAction(text: string, maxLen = 72): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

function SkeletonLine({ width, height = 13 }: { width: number | string; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width, height, borderRadius: height / 2, backgroundColor: "#DDD8CE", opacity }}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardTop}>
        <SkeletonLine width={100} height={12} />
        <SkeletonLine width={40} height={12} />
      </View>
      <View style={{ gap: 7, marginTop: 12, marginBottom: 10 }}>
        <SkeletonLine width="90%" height={14} />
        <SkeletonLine width="65%" height={14} />
      </View>
      <SkeletonLine width="80%" height={12} />
    </View>
  );
}

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionHeaderLine} />
    </View>
  );
}

function ContemplativePhrase({ text }: { text: string }) {
  return (
    <View style={styles.phraseContainer}>
      <Text style={styles.phraseText}>{text}</Text>
    </View>
  );
}

function SymbolicDivider() {
  return (
    <View style={styles.symbolicDivider}>
      <View style={styles.symbolicLine} />
      <Text style={styles.symbolicGlyph}>✦</Text>
      <View style={styles.symbolicLine} />
    </View>
  );
}

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<AlignmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reflections, setReflections] = useState<ReflectionItem[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(true);
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      loadReflections();
    }, [])
  );

  async function loadReflections() {
    setReflectionsLoading(true);
    console.log("[Journey] GET /api/reflections");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await apiFetch("/api/reflections", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Journey] /api/reflections failed:", res.status, errText);
        return;
      }
      const reflJson = await res.json();
      const data: ReflectionItem[] = Array.isArray(reflJson) ? reflJson : (reflJson.reflections ?? reflJson.data ?? []);
      console.log("[Journey] Reflections loaded:", data.length, "entries");
      setReflections(data);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        console.warn("[Journey] loadReflections TIMEOUT");
        return;
      }
      console.warn("[Journey] loadReflections error:", e);
    } finally {
      setReflectionsLoading(false);
    }
  }

  async function loadHistory() {
    setLoading(true);
    setError("");
    console.log("[Journey] GET /api/alignments/history");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await apiFetch("/api/alignments/history", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Journey] /api/alignments/history failed:", res.status, errText);
        setError("Couldn't load your journey. Tap to retry.");
        return;
      }
      const histJson = await res.json();
      const data: AlignmentHistoryItem[] = Array.isArray(histJson) ? histJson : (histJson.alignments ?? histJson.data ?? []);
      console.log("[Journey] History loaded:", data.length, "entries");
      const sorted = [...data].sort((a, b) => b.day_number - a.day_number);
      setHistory(sorted);
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        console.warn("[Journey] loadHistory TIMEOUT");
        setError("Couldn't load your journey. Check your connection.");
        return;
      }
      console.warn("[Journey] loadHistory error:", e);
      setError("Couldn't load your journey. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleCardPress(item: AlignmentHistoryItem) {
    console.log("[Journey] History card pressed — alignmentId:", item.id, "day:", item.day_number);
    router.push({
      pathname: "/alignment-detail",
      params: {
        alignmentId: item.id,
        action: item.action,
        guidance: item.guidance,
        somatic_cue: item.somatic_cue,
        scripture: item.scripture,
        reflection_prompt: item.reflection_prompt,
        day_number: String(item.day_number),
        blend_name: item.blend_name,
      },
    });
  }

  function toggleReflectionExpand(id: string) {
    console.log("[Journey] Toggle reflection expand — id:", id);
    setExpandedReflections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const totalDays = history.length;

  return (
    <ImageBackground
      source={JOURNEY_BG}
      style={{ flex: 1, backgroundColor: BG }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.82 }}
    >
      <LinearGradient
        colors={[
          "rgba(246,241,232,0.08)",
          "rgba(246,241,232,0.32)",
          "rgba(246,241,232,0.52)",
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>SACRED PATH</Text>
          <Text style={styles.title}>Your Journey</Text>
          <Text style={styles.subtitle}>
            {totalDays > 0
              ? `Day ${history[history.length - 1]?.day_number ?? totalDays} of becoming more fully yourself.`
              : "Notice what has been unfolding."}
          </Text>
          <View style={styles.headerDivider} />
        </View>

        {/* ── Section 1: Moments of Alignment ── */}
        <ContemplativePhrase text="Awareness often grows quietly." />
        <SectionHeader title="Moments of Alignment" />

        {loading ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <Pressable
            onPress={() => {
              console.log("[Journey] Error state retry pressed");
              loadHistory();
            }}
          >
            <View style={styles.emptyArea}>
              <View style={styles.emptyInner}>
                <Text style={styles.emptyIcon}>⚠</Text>
                <Text style={styles.emptyText}>Couldn't load your journey</Text>
                <Text style={styles.emptyHint}>{error}</Text>
              </View>
            </View>
          </Pressable>
        ) : history.length === 0 ? (
          <View style={styles.emptyArea}>
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>🔥</Text>
              <Text style={styles.emptyText}>Your path begins with the first step.</Text>
              <Text style={styles.emptyHint}>
                Complete today's alignment on the Home tab to begin your sacred archive.
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {history.map((item, index) => {
              const dateStr = formatDate(item.generated_at);
              const dayLevelLabel = item.day_number != null ? `Day ${item.day_number}` : "Sacred Day";
              const actionTruncated = truncateAction(item.action);
              const hasReflection = item.hasReflection === true;
              const showDivider = index % 3 === 2 && index < history.length - 1;
              return (
                <React.Fragment key={item.id}>
                  <AnimatedCard index={index}>
                    <Pressable
                      onPress={() => handleCardPress(item)}
                      style={({ pressed }) => [
                        styles.historyCard,
                        pressed && styles.historyCardPressed,
                      ]}
                    >
                      <View style={styles.historyCardTop}>
                        <View style={styles.archetypeAccent}>
                          <Text style={styles.flameSymbol}>🔥</Text>
                          <Text style={styles.historyMeta}>{dayLevelLabel}</Text>
                        </View>
                        <View style={styles.historyCardTopRight}>
                          {hasReflection && (
                            <View style={styles.reflectedBadge}>
                              <Text style={styles.reflectedBadgeText}>✦ Reflected</Text>
                            </View>
                          )}
                          <Text style={styles.historyDate}>{dateStr}</Text>
                        </View>
                      </View>
                      <Text style={styles.historyAction}>
                        {actionTruncated}
                      </Text>
                      <View style={styles.historyCardFooter}>
                        <Text style={styles.historyBlend}>{item.blend_name}</Text>
                        <Text style={styles.historyChevron}>›</Text>
                      </View>
                    </Pressable>
                  </AnimatedCard>
                  {showDivider && <SymbolicDivider />}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {/* ── Section 2: Echoes Along the Path ── */}
        {!reflectionsLoading && reflections.length > 0 && (
          <View style={styles.reflectionsSection}>
            <ContemplativePhrase text="The patterns you notice begin to loosen their grip." />
            <SectionHeader title="Echoes Along the Path" />
            <View style={{ gap: 12 }}>
              {reflections.map((item) => {
                const dateStr = formatDate(item.completed_at);
                const dayLabel = item.day_number != null ? `Day ${item.day_number}` : "Sacred Day";
                const actionTruncated = (item.action ?? '').length > 60 ? (item.action ?? '').slice(0, 60).trimEnd() + "…" : (item.action ?? '');
                const isExpanded = expandedReflections.has(item.id);
                return (
                  <AnimatedCard key={item.id} index={0}>
                    <Pressable
                      onPress={() => toggleReflectionExpand(item.id)}
                      style={styles.reflectionCard}
                    >
                      <View style={styles.reflectionCardTop}>
                        <Text style={styles.reflectionDayLabel}>{dayLabel}</Text>
                        <Text style={styles.reflectionDate}>{dateStr}</Text>
                      </View>
                      <Text style={styles.reflectionAction}>{actionTruncated}</Text>
                      <Text
                        style={styles.reflectionText}
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {item.reflection_text}
                      </Text>
                      {item.reflection_text && item.reflection_text.length > 120 && (
                        <Text style={styles.expandToggle}>
                          {isExpanded ? "Show less ↑" : "Read more ↓"}
                        </Text>
                      )}
                    </Pressable>
                  </AnimatedCard>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24 },

  headerBlock: {
    marginBottom: 8,
    paddingTop: 8,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#C9A84C",
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  title: {
    fontFamily: "Lora_400Regular",
    fontSize: 34,
    color: "#3D3530",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#8A8070",
    lineHeight: 23,
    marginBottom: 20,
    fontStyle: "italic",
  },
  headerDivider: {
    height: 1,
    backgroundColor: "rgba(201,168,76,0.18)",
    marginBottom: 28,
  },

  phraseContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  phraseText: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    color: "#8A8070",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.2,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  sectionHeaderText: {
    fontFamily: "Lora_400Regular",
    fontSize: 18,
    color: "#3D3530",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(61,53,48,0.08)",
  },

  symbolicDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 10,
  },
  symbolicLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(201,168,76,0.15)",
  },
  symbolicGlyph: {
    fontSize: 10,
    color: "#C9A84C",
    opacity: 0.6,
  },

  emptyArea: {
    backgroundColor: "rgba(255,250,238,0.72)",
    borderRadius: 20,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.32)",
    shadowColor: "#7A5C10",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyInner: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    color: "#8A8070",
    textAlign: "center",
  },
  emptyHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#A8B5A2",
    textAlign: "center",
    lineHeight: 21,
  },

  historyCard: {
    backgroundColor: "rgba(255,250,238,0.78)",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#7A5C10",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.28)",
  },
  historyCardPressed: { opacity: 0.78 },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  archetypeAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  flameSymbol: {
    fontSize: 13,
  },
  historyCardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#6F8A6A",
    letterSpacing: 0.3,
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A8070",
  },
  reflectedBadge: {
    backgroundColor: "rgba(201,168,76,0.14)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reflectedBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#C9A84C",
    letterSpacing: 0.3,
  },
  historyAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    color: "#3D3530",
    lineHeight: 24,
    marginBottom: 14,
  },
  historyCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyBlend: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A8070",
    fontStyle: "italic",
  },
  historyChevron: {
    fontSize: 18,
    color: "#8A8070",
    lineHeight: 22,
  },

  reflectionsSection: { marginTop: 40 },
  reflectionCard: {
    backgroundColor: "rgba(255,250,238,0.78)",
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#7A5C10",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(220,185,100,0.28)",
  },
  reflectionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reflectionDayLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#6F8A6A",
    letterSpacing: 0.3,
  },
  reflectionDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#8A8070",
  },
  reflectionAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: "#3D3530",
    lineHeight: 22,
    marginBottom: 10,
  },
  reflectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#8A8070",
    lineHeight: 22,
  },
  expandToggle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#6F8A6A",
    marginTop: 8,
    letterSpacing: 0.2,
  },
});
