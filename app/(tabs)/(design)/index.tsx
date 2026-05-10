import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { ARCHETYPE_CONTENT, ArchetypeName } from "@/constants/ArchetypeContent";
import { getSessionToken, apiFetch, API_URL } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useRetakeQuiz } from "@/hooks/useRetakeQuiz";

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const ACCENT = "#6F8A6A";
const GOLD = "#C9A84C";
const TEXT_MUTED = "rgba(47,62,47,0.55)";
const TEXT_BODY = "rgba(47,62,47,0.8)";
const TEXT_ITEM = "rgba(47,62,47,0.75)";
const DIVIDER = "rgba(47,62,47,0.08)";
const PLACEHOLDER_BG = "rgba(47,62,47,0.12)";
const SECTION_LABEL_COLOR = "rgba(47,62,47,0.4)";
const FOCUS_CARD_BG = "#1A2035";
const FOCUS_CARD_TEXT = "#F5F0E8";
const FOCUS_CARD_MUTED = "rgba(245,240,232,0.55)";

interface TodayAlignment {
  id: string;
  action: string;
  guidance: string;
  somatic_cue: string;
  scripture: string;
  reflection_prompt: string;
  day_number: number;
  blend_name?: string;
}

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SECONDARY_INFLUENCE: Record<string, string> = {
  'Peacemaker': 'Brings a calming, relational quality to how you show up.',
  'Courageous Leader': 'Adds boldness and initiative to your expression.',
  'Deep Feeler': 'Deepens emotional attunement and sensitivity.',
  'Faithful Steward': 'Grounds your gifts in consistency and follow-through.',
  'Light Bearer': 'Infuses your presence with warmth and encouragement.',
  'Truth Seeker': 'Sharpens your discernment and desire for depth.',
  'Justice Carrier': 'Fuels a passion for what matters and who is overlooked.',
};

const PLACEHOLDER_ROWS = [
  { label: "Blend Name" },
  { label: "Archetypes" },
  { label: "Narrative" },
  { label: "Strengths" },
  { label: "Growth Path" },
];

function Divider() {
  return <View style={styles.divider} />;
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function DotRow({ text }: { text: string }) {
  return (
    <View style={styles.dotRow}>
      <View style={styles.dot} />
      <Text style={styles.dotText}>{text}</Text>
    </View>
  );
}

interface StuckCardProps {
  item: { stuck: string; pathForward: string; appHelp: string };
  index: number;
  archetypeName: string;
  onPress: (archetypeName: string, index: number) => void;
}

function StuckCard({ item, index, archetypeName, onPress }: StuckCardProps) {
  const handlePress = () => {
    console.log(`[MyDesign] Stuck card tapped — archetype: "${archetypeName}", index: ${index}, stuck: "${item.stuck}"`);
    onPress(archetypeName, index);
  };

  return (
    <AnimatedPressable onPress={handlePress} style={styles.stuckCard}>
      <View style={styles.stuckCardInner}>
        <View style={styles.stuckCardLeft}>
          <Text style={styles.stuckCardStuck}>{item.stuck}</Text>
          <Text style={styles.stuckCardPath}>{item.pathForward}</Text>
        </View>
        <Text style={styles.stuckCardArrow}>→</Text>
      </View>
    </AnimatedPressable>
  );
}

function renderListOrString(value: string[] | string | undefined, fallback?: string) {
  if (!value && fallback) {
    return <Text style={styles.bodyText}>{fallback}</Text>;
  }
  if (!value) return null;
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, i) => (
          <DotRow key={i} text={item} />
        ))}
      </>
    );
  }
  return <Text style={styles.bodyText}>{value}</Text>;
}

// Raw authenticated fetch — bypasses any caching layer, always reads token fresh
async function rawFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = await getSessionToken();
  console.log(`[rawFetch] ${options?.method ?? 'GET'} ${path} — token present: ${!!token}`);
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

interface TodayFocusCardProps {
  hasDesignResult: boolean;
  todayAlignment: TodayAlignment | null;
  loadingFocus: boolean;
  generating: boolean;
  onGenerate: () => void;
  onViewAlignment: () => void;
  onLoadFocus: () => void;
}

function TodayFocusCard({
  hasDesignResult,
  todayAlignment,
  loadingFocus,
  generating,
  onGenerate,
  onViewAlignment,
  onLoadFocus,
}: TodayFocusCardProps) {
  const prevHasDesignResult = useRef(hasDesignResult);

  // Re-fetch only when hasDesignResult transitions from false → true (not on initial render)
  useEffect(() => {
    if (hasDesignResult && !prevHasDesignResult.current) {
      prevHasDesignResult.current = true;
      console.log("[TodayFocusCard] hasDesignResult transitioned false→true — re-fetching alignment");
      onLoadFocus();
    } else {
      prevHasDesignResult.current = hasDesignResult;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDesignResult]);

  if (loadingFocus) {
    return (
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>TODAY'S FOCUS</Text>
        <Text style={styles.focusLoadingText}>Loading…</Text>
      </View>
    );
  }

  if (!todayAlignment) {
    const generateButtonText = generating ? "Generating…" : "Start Today's Alignment →";
    return (
      <View style={styles.focusCard}>
        <Text style={styles.focusLabel}>TODAY'S FOCUS</Text>
        <Text style={styles.focusEmptyText}>You haven't started your alignment yet.</Text>
        <Pressable
          onPress={onGenerate}
          disabled={generating}
          style={styles.focusButton}
        >
          <Text style={styles.focusButtonText}>{generateButtonText}</Text>
        </Pressable>
      </View>
    );
  }

  const actionTruncated = todayAlignment.action.length > 120
    ? todayAlignment.action.slice(0, 120).trimEnd() + "…"
    : todayAlignment.action;

  return (
    <View style={styles.focusCard}>
      <Text style={styles.focusLabel}>TODAY'S FOCUS</Text>
      <Text style={styles.focusAction} numberOfLines={2}>{actionTruncated}</Text>
      <Pressable
        onPress={onViewAlignment}
        style={styles.focusButton}
      >
        <Text style={styles.focusButtonText}>View Full Alignment →</Text>
      </Pressable>
    </View>
  );
}

export default function MyDesignScreen() {
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);
  const { user } = useAuth();
  const hasSyncedRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const { promptRetake } = useRetakeQuiz();

  const [todayAlignment, setTodayAlignment] = useState<TodayAlignment | null>(null);
  const [loadingFocus, setLoadingFocus] = useState(true);
  const [generating, setGenerating] = useState(false);

  const hasDesignResult = !!sacredDesignResult;
  const isSignedIn = !!(user && (user as any).isAnonymous !== true);

  async function loadTodayFocus() {
    if (!isSignedIn) {
      console.log("[MyDesign] loadTodayFocus — user not signed in, skipping fetch");
      setLoadingFocus(false);
      return;
    }
    console.log("[MyDesign] GET /api/alignments/today — starting");
    setLoadingFocus(true);
    try {
      const localDate = getLocalDateString();
      console.log('[MyDesign] GET /api/alignments/today with local_date:', localDate);
      const res = await apiFetch(`/api/alignments/today?local_date=${localDate}`);
      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[MyDesign] GET /api/alignments/today — 401, auth required');
          // authRequired state is handled by the caller
        } else {
          console.warn('[MyDesign] GET /api/alignments/today failed:', res.status);
        }
        setLoadingFocus(false);
        return;
      }
      const data: { alignment: TodayAlignment | null } = await res.json();
      console.log("[MyDesign] Today alignment:", data.alignment ? data.alignment.id : "null");
      setTodayAlignment(data.alignment ?? null);
    } catch (e) {
      console.warn("[MyDesign] loadTodayFocus error:", e);
    } finally {
      setLoadingFocus(false);
    }
  }

  function handleViewAlignment() {
    if (!todayAlignment) return;
    console.log("[MyDesign] 'View Full Alignment' pressed — id:", todayAlignment.id);
    router.push({
      pathname: "/alignment-detail",
      params: {
        alignmentId: todayAlignment.id,
        action: todayAlignment.action,
        guidance: todayAlignment.guidance,
        somatic_cue: todayAlignment.somatic_cue,
        scripture: todayAlignment.scripture,
        reflection_prompt: todayAlignment.reflection_prompt,
        day_number: String(todayAlignment.day_number),
        blend_name: todayAlignment.blend_name ?? "",
      },
    });
  }

  async function handleGenerateAlignment() {
    console.log("[MyDesign] 'Generate Today's Alignment' pressed");
    setGenerating(true);
    try {
      // Step 1: ensure archetype is in the backend
      if (sacredDesignResult) {
        console.log("[MyDesign] Step 1 — POST /api/archetypes/upsert");
        const upsertRes = await apiFetch('/api/archetypes/upsert', {
          method: 'POST',
          body: JSON.stringify({
            primary_archetype: sacredDesignResult.primary_archetype,
            secondary_archetype: sacredDesignResult.secondary_archetype,
            blend_name: sacredDesignResult.blend_name,
            scores: sacredDesignResult.archetypeScores ?? {},
          }),
        });
        if (upsertRes.status === 401) {
          console.log('[MyDesign] POST /api/archetypes/upsert — 401, routing to auth-screen');
          setGenerating(false);
          router.push('/auth-screen' as any);
          return;
        }
      }

      // Step 2: generate alignment
      console.log("[MyDesign] Step 2 — POST /api/alignments/generate");
      const res = await apiFetch('/api/alignments/generate', {
        method: 'POST',
        body: JSON.stringify({ local_date: getLocalDateString() }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          console.log('[MyDesign] POST /api/alignments/generate — 401, routing to auth-screen');
          setGenerating(false);
          router.push('/auth-screen' as any);
          return;
        }
        const errText = await res.text();
        console.warn('[MyDesign] generate failed:', res.status, errText);
        Alert.alert('Could not generate alignment', 'Please try again.');
        return;
      }
      const data = await res.json();
      console.log("[MyDesign] POST /api/alignments/generate succeeded");
      setTodayAlignment(data.alignment);
    } catch (e) {
      console.warn('[MyDesign] handleGenerateAlignment error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // Mount effect — fire exactly once
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    console.log("[MyDesign] mount — calling loadTodayFocus once");
    loadTodayFocus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time sync: push existing local result to backend for users who completed
  // the quiz before the upsert call was added to computeSacredDesign.
  useEffect(() => {
    if (!sacredDesignResult || !user || hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    console.log('[MyDesign] One-time sync — POST /api/archetypes/upsert for existing result');
    rawFetch('/api/archetypes/upsert', {
      method: 'POST',
      body: JSON.stringify({
        primary_archetype: sacredDesignResult.primary_archetype,
        secondary_archetype: sacredDesignResult.secondary_archetype,
        blend_name: sacredDesignResult.blend_name,
        scores: sacredDesignResult.archetypeScores ?? {},
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errText = await res.text();
        console.warn('[MyDesign] One-time sync /api/archetypes/upsert failed:', res.status, errText);
      } else {
        console.log('[MyDesign] One-time sync /api/archetypes/upsert succeeded');
      }
    }).catch((e) => {
      console.warn('[MyDesign] One-time sync /api/archetypes/upsert error (ignored):', e);
    });
  }, [sacredDesignResult, user]);

  const handleStuckCardPress = (archetypeName: string, index: number) => {
    console.log(`[MyDesign] Navigating to shadow-path — archetype: "${archetypeName}", stuck: ${index}`);
    router.push(`/shadow-path?archetype=${encodeURIComponent(archetypeName)}&stuck=${index}`);
  };

  if (!sacredDesignResult) {
    console.log("[MyDesign] No sacredDesignResult — showing placeholder");
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.emptyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>My Design</Text>
        <Text style={styles.subtitle}>
          Your Sacred Design profile will appear here once your discovery is complete.
        </Text>

        <View style={styles.card}>
          {PLACEHOLDER_ROWS.map((row, index) => {
            const isLast = index === PLACEHOLDER_ROWS.length - 1;
            return (
              <View key={row.label}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardRowLabel}>{row.label}</Text>
                  <View style={styles.cardRowPill} />
                </View>
                {!isLast && <View style={styles.cardDivider} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  console.log("[MyDesign] Rendering sacredDesignResult:", sacredDesignResult);

  const primary = sacredDesignResult.primary_archetype as ArchetypeName;
  const secondary = sacredDesignResult.secondary_archetype as ArchetypeName;
  const content = ARCHETYPE_CONTENT[primary];

  const archetypeLine = `${primary} · ${secondary}`;
  const hasStuckPatterns = content?.stuckPatterns && content.stuckPatterns.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* Back arrow */}
      <TouchableOpacity
        onPress={() => {
          console.log('[MyDesign] Back arrow pressed — navigating to /reveal');
          router.push('/reveal');
        }}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Back to reveal"
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.resultContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Today's Focus card — top of Design tab */}
      <TodayFocusCard
        hasDesignResult={hasDesignResult}
        todayAlignment={todayAlignment}
        loadingFocus={loadingFocus}
        generating={generating}
        onGenerate={handleGenerateAlignment}
        onViewAlignment={handleViewAlignment}
        onLoadFocus={loadTodayFocus}
      />

      {/* Top section */}
      <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>

      <Text style={styles.blendName}>{sacredDesignResult.blend_name}</Text>
      <Text style={styles.archetypeLine}>{archetypeLine}</Text>
      <Text style={styles.designDefinition}>
        This is your Sacred Design — something you'll begin to live each day.
      </Text>

      <Divider />

      {/* How this becomes real */}
      <View style={styles.howRealSection}>
        <Text style={styles.howRealHeader}>How this becomes real</Text>
        <Text style={styles.howRealBody}>
          Your daily alignments give you simple, clear steps rooted in your design — helping you move forward with intention, energy, and direction.
        </Text>
      </View>
      <Divider />

      {/* Strengths */}
      <SectionLabel text="YOUR STRENGTHS" />
      {renderListOrString(content?.strengths)}

      <Divider />

      {/* Growth Path — primary */}
      <SectionLabel text="YOUR GROWTH PATH" />
      <View style={styles.growthPathCard}>
        <Text style={styles.bodyText}>{content?.growthPath}</Text>
      </View>

      {/* Stuck Patterns */}
      {hasStuckPatterns && (
        <>
          <SectionLabel text="WHERE YOU GET STUCK" />
          <Text style={styles.stuckHint}>Tap a pattern to explore your path forward</Text>
          {content.stuckToStrength.map((item, index) => (
            <StuckCard
              key={item.stuck}
              item={item}
              index={index}
              archetypeName={primary}
              onPress={handleStuckCardPress}
            />
          ))}
          <Divider />
        </>
      )}

      {/* Secondary archetype section */}
      {secondary && ARCHETYPE_CONTENT[secondary] && (() => {
        const secondaryContent = ARCHETYPE_CONTENT[secondary];
        const secondaryInfluence = SECONDARY_INFLUENCE[secondary] ?? "";
        const hasSecondaryStuck = secondaryContent.stuckToStrength && secondaryContent.stuckToStrength.length > 0;
        return (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.secondaryEyebrow}>YOUR SECONDARY ARCHETYPE</Text>
            <Text style={styles.secondaryName}>{secondary}</Text>
            {secondaryInfluence ? (
              <Text style={styles.secondaryInfluenceText}>{secondaryInfluence}</Text>
            ) : null}
            <Divider />
            <SectionLabel text="SECONDARY STRENGTHS" />
            {renderListOrString(secondaryContent.strengths)}
            {hasSecondaryStuck && (
              <>
                <Divider />
                <SectionLabel text="WHERE YOU GET STUCK" />
                <Text style={styles.stuckHint}>Tap a pattern to explore your path forward</Text>
                {secondaryContent.stuckToStrength.map((item, index) => (
                  <StuckCard
                    key={item.stuck}
                    item={item}
                    index={index}
                    archetypeName={secondary}
                    onPress={handleStuckCardPress}
                  />
                ))}
              </>
            )}
            <Divider />
            <SectionLabel text="GROWTH PATH" />
            <View style={styles.growthPathCard}>
              <Text style={styles.bodyText}>{secondaryContent.growthPath}</Text>
            </View>
          </>
        );
      })()}

      {/* Transition line + CTA */}
      <Text style={styles.ctaTransition}>
        {todayAlignment ? "Your alignment is ready." : "Your first alignment is where this begins."}
      </Text>
      <View style={styles.bottomCTAWrapper}>
        <AnimatedPressable
          onPress={() => {
            console.log('[BottomCTA] pressed, todayAlignment:', !!todayAlignment);
            if (todayAlignment) {
              handleViewAlignment();
            } else {
              handleGenerateAlignment();
            }
          }}
          style={[styles.bottomCTA, generating && { opacity: 0.6 }]}
        >
          <Text style={styles.bottomCTAText}>
            {generating ? "Generating…" : todayAlignment ? "View Today's Alignment" : "Start Today's Alignment"}
          </Text>
          <Text style={styles.bottomCTASub}>
            {todayAlignment ? "See your full alignment" : "Begin your first alignment"}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Retake — secondary action, bottom of screen */}
      <TouchableOpacity onPress={promptRetake} style={styles.retakeButton}>
        <Text style={styles.retakeButtonText}>Recalculate My Design</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  emptyContent: {
    paddingTop: 60,
    paddingHorizontal: 28,
    paddingBottom: 120,
  },
  resultContent: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  backButton: {
    position: 'absolute',
    top: 36,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backArrow: {
    fontSize: 22,
    color: TEXT,
    fontFamily: 'Inter_400Regular',
  },

  // Today's Focus card
  focusCard: {
    backgroundColor: FOCUS_CARD_BG,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  focusLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2.5,
    color: GOLD,
    marginBottom: 10,
  },
  focusAction: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    color: FOCUS_CARD_TEXT,
    lineHeight: 25,
    marginBottom: 16,
  },
  focusEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: FOCUS_CARD_MUTED,
    lineHeight: 21,
    marginBottom: 14,
  },
  focusLoadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: FOCUS_CARD_MUTED,
    lineHeight: 21,
  },
  focusButton: {
    alignSelf: "flex-start",
  },
  focusButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: GOLD,
    letterSpacing: 0.2,
  },

  // Empty state
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 32,
    color: TEXT,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    marginTop: 10,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 32,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  cardRowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },
  cardRowPill: {
    width: 100,
    height: 10,
    borderRadius: 5,
    backgroundColor: PLACEHOLDER_BG,
  },
  cardDivider: {
    height: 1,
    backgroundColor: DIVIDER,
  },

  // Result state
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 2.5,
    color: SECTION_LABEL_COLOR,
    marginBottom: 8,
  },
  blendName: {
    fontFamily: "Lora_700Bold",
    fontSize: 34,
    color: TEXT,
    lineHeight: 42,
  },
  archetypeLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: ACCENT,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  divider: {
    marginVertical: 28,
    height: 1,
    backgroundColor: DIVIDER,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    color: SECTION_LABEL_COLOR,
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_BODY,
    lineHeight: 24,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  dotText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_ITEM,
    lineHeight: 22,
    flex: 1,
  },
  growthPathCard: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    paddingLeft: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 32,
  },
  secondaryEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: ACCENT,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  secondaryName: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: TEXT,
    lineHeight: 32,
    marginBottom: 10,
  },
  secondaryInfluenceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginBottom: 4,
  },

  // Stuck pattern cards
  stuckHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 12,
    marginTop: -4,
  },
  stuckCard: {
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(111,138,106,0.15)",
    shadowColor: "#2F3E2F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  stuckCardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stuckCardLeft: {
    flex: 1,
    gap: 4,
  },
  stuckCardStuck: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
    lineHeight: 20,
  },
  stuckCardPath: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: ACCENT,
    lineHeight: 18,
  },
  stuckCardArrow: {
    fontSize: 18,
    color: ACCENT,
    opacity: 0.7,
  },
  designDefinition: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginTop: 14,
    marginBottom: 4,
  },
  howRealSection: {
    marginBottom: 4,
  },
  howRealHeader: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: TEXT,
    lineHeight: 26,
    marginBottom: 8,
  },
  howRealBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_BODY,
    lineHeight: 23,
  },
  ctaTransition: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 32,
    marginBottom: 14,
  },
  bottomCTAWrapper: {
    marginBottom: 4,
  },
  bottomCTA: {
    backgroundColor: "#1A2035",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#C9A84C",
  },
  bottomCTAText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#F5F0E8",
    letterSpacing: 0.2,
  },
  bottomCTASub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(245,240,232,0.55)",
    marginTop: 4,
  },
  retakeButton: {
    alignSelf: "center",
    marginTop: 32,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retakeButtonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
