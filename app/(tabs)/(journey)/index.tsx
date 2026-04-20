import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/auth";

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

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [history, setHistory] = useState<AlignmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reflections, setReflections] = useState<ReflectionItem[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(true);
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
    loadReflections();
  }, []);

  async function loadReflections() {
    setReflectionsLoading(true);
    console.log("[Journey] GET /api/reflections");
    try {
      const res = await apiFetch("/api/reflections");
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Journey] /api/reflections failed:", res.status, errText);
        return;
      }
      const data: ReflectionItem[] = await res.json();
      console.log("[Journey] Reflections loaded:", data.length, "entries");
      setReflections(data);
    } catch (e) {
      console.warn("[Journey] loadReflections error:", e);
    } finally {
      setReflectionsLoading(false);
    }
  }

  async function loadHistory() {
    setLoading(true);
    setError("");
    console.log("[Journey] GET /api/alignments/history");
    try {
      const res = await apiFetch("/api/alignments/history");
      if (!res.ok) {
        const errText = await res.text();
        console.warn("[Journey] /api/alignments/history failed:", res.status, errText);
        setError("Couldn't load your journey. Tap to retry.");
        return;
      }
      const data: AlignmentHistoryItem[] = await res.json();
      console.log("[Journey] History loaded:", data.length, "entries");
      const sorted = [...data].sort((a, b) => b.day_number - a.day_number);
      setHistory(sorted);
    } catch (e) {
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
  const subtitleText = totalDays > 0
    ? `Day ${history[history.length - 1]?.day_number ?? totalDays} of your Sacred Design`
    : "Your Sacred Design journey";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Journey</Text>
      <Text style={styles.subtitle}>{subtitleText}</Text>

      {/* ── Section 1: Past Alignments ── */}
      <SectionHeader title="Past Alignments" />

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
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptyHint}>
              Complete your Sacred Discovery to begin your journey.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {history.map((item, index) => {
            const dateStr = formatDate(item.generated_at);
            const dayLevelLabel = `Day ${item.day_number}`;
            const actionTruncated = truncateAction(item.action);
            const hasReflection = item.hasReflection === true;
            return (
              <AnimatedCard key={item.id} index={index}>
                <Pressable
                  onPress={() => handleCardPress(item)}
                  style={({ pressed }) => [
                    styles.historyCard,
                    pressed && styles.historyCardPressed,
                  ]}
                >
                  <View style={styles.historyCardTop}>
                    <Text style={styles.historyMeta}>{dayLevelLabel}</Text>
                    <View style={styles.historyCardTopRight}>
                      {hasReflection && (
                        <View style={styles.reflectedBadge}>
                          <Text style={styles.reflectedBadgeText}>✓ Reflected</Text>
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
            );
          })}
        </View>
      )}

      {/* ── Section 2: Your Reflections ── */}
      {!reflectionsLoading && reflections.length > 0 && (
        <View style={styles.reflectionsSection}>
          <SectionHeader title="Your Reflections" />
          <View style={{ gap: 12 }}>
            {reflections.map((item) => {
              const dateStr = formatDate(item.completed_at);
              const dayLabel = `Day ${item.day_number}`;
              const actionTruncated = item.action.length > 60 ? item.action.slice(0, 60).trimEnd() + "…" : item.action;
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
  title: {
    fontFamily: "Lora_400Regular",
    fontSize: 32,
    color: TEXT,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    fontFamily: "Lora_400Regular",
    fontSize: 20,
    color: TEXT,
    letterSpacing: -0.3,
    flexShrink: 0,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: DIVIDER,
  },
  emptyArea: {
    backgroundColor: CARD_BG,
    borderRadius: 20,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    // @ts-expect-error — RN web supports boxShadow
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  },
  emptyInner: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
    color: TEXT_LIGHT,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    color: TEXT_MUTED,
  },
  emptyHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_LIGHT,
    textAlign: "center",
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  historyCardPressed: {
    opacity: 0.75,
  },
  historyCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  historyCardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: ACCENT,
    letterSpacing: 0.3,
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
  },
  reflectedBadge: {
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reflectedBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 0.2,
  },
  historyAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    color: TEXT,
    lineHeight: 23,
    marginBottom: 12,
  },
  historyCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyBlend: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },
  historyChevron: {
    fontSize: 18,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  reflectionsSection: {
    marginTop: 36,
  },
  reflectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: DIVIDER,
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
    color: ACCENT,
    letterSpacing: 0.3,
  },
  reflectionDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
  },
  reflectionAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 14,
    color: TEXT,
    lineHeight: 21,
    marginBottom: 8,
  },
  reflectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 21,
  },
  expandToggle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: ACCENT,
    marginTop: 6,
  },
});
