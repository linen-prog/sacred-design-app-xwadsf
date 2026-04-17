import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Zap, Heart, BookOpen, Wind } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';

interface Alignment {
  id: string;
  day_number: number;
  level: number;
  action: string;
  guidance: string;
  scripture: string;
  somatic_cue: string;
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  generated_at: string;
}

interface TodayResponse {
  alignment: Alignment | null;
}

// ─── Skeleton loader ────────────────────────────────────────────────────────

function SkeletonCard() {
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
      style={[
        styles.card,
        { opacity, height: 100 },
      ]}
    />
  );
}

// ─── Animated card wrapper ───────────────────────────────────────────────────

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Card label row ──────────────────────────────────────────────────────────

function CardLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.cardLabelRow}>
      {icon}
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult, phase4Scores } = useContext(DiscoveryContext);

  const [alignment, setAlignment] = useState<Alignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [headerOpacity, headerTranslateY]);

  const fetchAlignment = async () => {
    if (!sacredDesignResult) return;

    console.log('[HomeScreen] fetchAlignment called for:', sacredDesignResult.blend_name);
    setLoading(true);
    setError(false);

    try {
      // 1. Check for today's existing alignment first
      console.log('[HomeScreen] GET /api/daily-alignment/today');
      const todayData = await apiGet<TodayResponse>('/api/daily-alignment/today');
      console.log('[HomeScreen] today response:', todayData);

      if (todayData.alignment) {
        console.log('[HomeScreen] Using existing alignment, day:', todayData.alignment.day_number);
        setAlignment(todayData.alignment);
        setLoading(false);
        return;
      }

      // 2. Generate new alignment
      const body = {
        primary_archetype: sacredDesignResult.primary_archetype,
        secondary_archetype: sacredDesignResult.secondary_archetype,
        blend_name: sacredDesignResult.blend_name,
        avoidant_score: phase4Scores?.avoidant_score ?? 5,
        anxious_score: phase4Scores?.anxious_score ?? 5,
        overactive_score: phase4Scores?.overactive_score ?? 5,
        grounded_score: phase4Scores?.grounded_score ?? 5,
      };

      console.log('[HomeScreen] POST /api/daily-alignment body:', body);
      const data = await apiPost<Alignment>('/api/daily-alignment', body);
      console.log('[HomeScreen] New alignment generated, day:', data.day_number);
      setAlignment(data);
    } catch (e) {
      console.error('[HomeScreen] fetchAlignment error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sacredDesignResult) {
      fetchAlignment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult]);

  const primaryText = sacredDesignResult?.primary_archetype ?? '';
  const secondaryText = sacredDesignResult?.secondary_archetype ?? '';
  const archetypeLine = primaryText && secondaryText ? `${primaryText} · ${secondaryText}` : '';
  const blendName = sacredDesignResult?.blend_name ?? '';
  const dayNumber = alignment?.day_number ?? null;
  const dayBadgeText = dayNumber !== null ? `Day ${dayNumber}` : '';

  // ── No onboarding ──────────────────────────────────────────────────────────
  if (!sacredDesignResult) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.emptyIconCircle}>
          <BookOpen size={28} color={COLORS.primary} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Discover your Sacred Design</Text>
        <Text style={styles.emptySubtitle}>
          Complete your Sacred Discovery to unlock your daily alignment.
        </Text>
        <AnimatedPressable
          onPress={() => {
            console.log('[HomeScreen] Begin Discovery pressed');
            router.push('/onboarding/welcome');
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Begin Discovery</Text>
        </AnimatedPressable>
      </View>
    );
  }

  // ── Main content ───────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 20, paddingBottom: 100 },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          marginBottom: 28,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.headerTopRow}>
          <Text style={styles.todayLabel}>Today's Alignment</Text>
          {dayBadgeText ? (
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>{dayBadgeText}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.blendName}>{blendName}</Text>
        <Text style={styles.archetypeLine}>{archetypeLine}</Text>
      </Animated.View>

      {/* Loading skeletons */}
      {loading && (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      )}

      {/* Error state */}
      {!loading && error && (
        <View style={[styles.card, styles.errorCard, { marginHorizontal: 20 }]}>
          <Text style={styles.errorTitle}>Couldn't load today's alignment</Text>
          <Text style={styles.errorSubtitle}>Check your connection and try again.</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[HomeScreen] Try again pressed');
              fetchAlignment();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Alignment cards */}
      {!loading && !error && alignment && (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {/* Card 1 — Action */}
          <AnimatedCard index={0}>
            <View style={styles.card}>
              <CardLabel
                icon={<Zap size={16} color={COLORS.accent} strokeWidth={2} />}
                label="TODAY'S ACTION"
              />
              <Text style={styles.actionText}>{alignment.action}</Text>
            </View>
          </AnimatedCard>

          {/* Card 2 — Guidance */}
          <AnimatedCard index={1}>
            <View style={styles.card}>
              <CardLabel
                icon={<Heart size={16} color={COLORS.accent} strokeWidth={2} />}
                label="GUIDANCE"
              />
              <Text style={styles.bodyText}>{alignment.guidance}</Text>
            </View>
          </AnimatedCard>

          {/* Card 3 — Scripture */}
          <AnimatedCard index={2}>
            <View style={styles.card}>
              <CardLabel
                icon={<BookOpen size={16} color={COLORS.accent} strokeWidth={2} />}
                label="SCRIPTURE"
              />
              <View style={styles.scriptureAccent}>
                <Text style={styles.scriptureText}>{alignment.scripture}</Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Card 4 — Somatic Cue */}
          <AnimatedCard index={3}>
            <View style={styles.card}>
              <CardLabel
                icon={<Wind size={16} color={COLORS.accent} strokeWidth={2} />}
                label="BODY CHECK-IN"
              />
              <Text style={styles.bodyText}>{alignment.somatic_cue}</Text>
            </View>
          </AnimatedCard>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    maxWidth: 280,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.white,
  },
  // Header
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  todayLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  dayBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.primary,
  },
  blendName: {
    fontFamily: 'Lora_700Bold',
    fontSize: 26,
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  archetypeLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
  },
  actionText: {
    fontFamily: 'Lora_400Regular',
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
  },
  bodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  scriptureAccent: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: 14,
    marginTop: 8,
  },
  scriptureText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: COLORS.primary,
    lineHeight: 26,
  },
  // Error
  errorCard: {
    alignItems: 'center',
  },
  errorTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.white,
  },
});
