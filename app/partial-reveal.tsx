import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppState } from '@/contexts/AppStateContext';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { getPreviewContent, ArchetypePreviewContent } from '@/constants/ArchetypeContent';

const COLORS = {
  gradientTop: '#0A0E1A',
  gradientMid: '#1A1030',
  gradientBot: '#0D1A14',
  gold: '#C9A84C',
  goldLight: 'rgba(201,168,76,0.20)',
  white: '#F5F0E8',
  whiteMuted: 'rgba(245,240,232,0.65)',
  whiteDim: 'rgba(245,240,232,0.40)',
  cardBg: 'rgba(245,240,232,0.07)',
  cardBorder: 'rgba(201,168,76,0.20)',
  blurOverlay: 'rgba(10,14,26,0.82)',
};

function LockedPreviewRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(201,168,76,0.4)' }} />
      <View style={{ flex: 1, position: 'relative' }}>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: 'rgba(245,240,232,0.15)', lineHeight: 22 }}>{text}</Text>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,14,26,0.7)', borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 12, color: 'rgba(201,168,76,0.5)' }}>🔒</Text>
    </View>
  );
}

function PreviewBulletRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#C9A84C', marginTop: 8 }} />
      <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: 'rgba(245,240,232,0.85)', lineHeight: 22, flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function PartialRevealScreen() {
  const router = useRouter();
  const { appState } = useAppState();
  const { sacredDesignResult, restoreFromBackend } = useContext(DiscoveryContext);

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  const [primaryArchetype, setPrimaryArchetype] = useState<string | null>(null);
  const [secondaryArchetype, setSecondaryArchetype] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<ArchetypePreviewContent | null>(null);
  const [loadingTooLong, setLoadingTooLong] = useState<boolean>(false);

  // Resolve archetype from priority sources
  useEffect(() => {
    // Priority 1: live DiscoveryContext result
    if (sacredDesignResult?.primary_archetype) {
      const primary = sacredDesignResult.primary_archetype;
      const secondary = sacredDesignResult.secondary_archetype ?? null;
      setPrimaryArchetype(primary);
      setSecondaryArchetype(secondary);
      const content = getPreviewContent(primary);
      setPreviewContent(content);
      console.log('[PartialReveal] Preview loaded — archetype:', primary);
      return;
    }

    // Priority 2: persisted appState
    if (appState.primaryArchetype) {
      const primary = appState.primaryArchetype;
      const secondary = appState.secondaryArchetype ?? null;
      setPrimaryArchetype(primary);
      setSecondaryArchetype(secondary);
      const content = getPreviewContent(primary);
      setPreviewContent(content);
      console.log('[PartialReveal] Preview loaded — archetype:', primary);
      return;
    }

    // Priority 3: AsyncStorage direct read
    AsyncStorage.getItem('sacredDesignResult').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.primary_archetype) {
            const primary = parsed.primary_archetype;
            const secondary = parsed.secondary_archetype ?? null;
            setPrimaryArchetype(primary);
            setSecondaryArchetype(secondary);
            const content = getPreviewContent(primary);
            setPreviewContent(content);
            console.log('[PartialReveal] Preview loaded — archetype:', primary);
            return;
          }
        } catch (_) {}
      }

      // Priority 4: attempt backend restore after 1.5s
      console.log('[PartialReveal] Preview missing — regenerating');
      let backendResolved = false;
      const backendTimer = setTimeout(async () => {
        try {
          const { apiFetch } = await import('@/lib/auth');
          const res = await apiFetch('/api/archetypes/me');
          if (!res.ok) {
            console.warn('[PartialReveal] Backend restore failed with status:', res.status);
          } else {
            const data = await res.json();
            if (data?.primary_archetype) {
              backendResolved = true;
              console.log('[PartialReveal] Restored from backend:', data.primary_archetype);
              restoreFromBackend({
                primary_archetype: data.primary_archetype,
                secondary_archetype: data.secondary_archetype,
                blend_name: data.blend_name,
                scores: data.scores,
              });
              const primary = data.primary_archetype;
              const secondary = data.secondary_archetype ?? null;
              setPrimaryArchetype(primary);
              setSecondaryArchetype(secondary);
              const content = getPreviewContent(primary);
              setPreviewContent(content);
              console.log('[PartialReveal] Preview loaded — archetype:', primary);
            }
          }
        } catch (e) {
          console.warn('[PartialReveal] Backend restore failed:', e);
        }
      }, 1500);

      // Final fallback: if still no data after 4s total, show hardcoded fallback content
      // Do NOT reset quiz state — the user's data may still be in AsyncStorage; we just can't reach the backend right now
      const fallbackTimer = setTimeout(async () => {
        if (backendResolved) return;
        console.log('[PartialReveal] All restore paths failed — showing fallback content without resetting state');
        // Use the hardcoded fallback content — do NOT reset quizCompleted or route to welcome
        // The user's quiz data may still be in AsyncStorage; we just can't reach the backend right now
        const fallbackContent = getPreviewContent(''); // returns hardcoded fallback
        console.log('[PartialReveal] Preview fallback used');
        setPrimaryArchetype('Your Sacred Design');
        setSecondaryArchetype(null);
        setPreviewContent(fallbackContent);
      }, 4000);

      return () => {
        clearTimeout(backendTimer);
        clearTimeout(fallbackTimer);
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sacredDesignResult, appState.primaryArchetype]);

  useEffect(() => {
    const tooLongTimer = setTimeout(() => setLoadingTooLong(true), 3000);
    return () => clearTimeout(tooLongTimer);
  }, []);

  useEffect(() => {
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1.0, duration: 2000, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [screenOpacity, glowScale]);

  function handleUnlock() {
    console.log('[PartialReveal] "Unlock Your Full Design" pressed');
    if (appState.revealUnlocked || appState.subscriptionActive) {
      console.log('[PartialReveal] Already subscribed/unlocked — skipping paywall, navigating to /onboarding/preparing');
      router.replace('/onboarding/preparing');
      return;
    }
    console.log('[PartialReveal] Navigating to /paywall');
    router.replace('/paywall?source=quiz_complete');
  }

  // Loading state
  if (!previewContent || !primaryArchetype) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Loading your Sacred Design…</Text>
        {loadingTooLong && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(245,240,232,0.4)', textAlign: 'center', marginTop: 8 }}>
            This is taking longer than expected…
          </Text>
        )}
      </View>
    );
  }

  // Derived display values
  const narrativeSentences = previewContent.narrative.split('. ');
  const narrativeFirstSentence = narrativeSentences[0] + (narrativeSentences.length > 1 ? '.' : '');
  const narrativeSecondLine = narrativeSentences.length > 1 ? narrativeSentences[1] + '.' : 'Your design runs deeper than you know.';

  const visibleStrengths = previewContent.strengths.slice(0, 2);
  const lockedStrengths = previewContent.strengths.slice(2, 4);
  const lockedStrengthFallbacks = ['Your hidden strength', 'Your deepest gift'];
  const lockedStrength1 = lockedStrengths[0] ?? lockedStrengthFallbacks[0];
  const lockedStrength2 = lockedStrengths[1] ?? lockedStrengthFallbacks[1];

  const visibleShadow = previewContent.shadowPatterns[0] ?? 'A pattern worth exploring';
  const lockedShadow1 = previewContent.shadowPatterns[1] ?? 'A hidden pattern';
  const lockedShadow2 = previewContent.shadowPatterns[2] ?? 'Another pattern to uncover';

  const growthWords = previewContent.growthPath.split(' ');
  const growthTeaser = growthWords.slice(0, 8).join(' ') + '...';

  const secondaryDisplay = secondaryArchetype ?? 'Secondary Archetype';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient glow orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ scale: glowScale }] }]} />
      <View style={styles.orb2} />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <Animated.View style={[styles.animatedWrapper, { opacity: screenOpacity }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Eyebrow */}
            <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>

            {/* 2. Primary archetype */}
            <View style={styles.primaryContainer}>
              <View style={styles.glowBehind} />
              <Text style={styles.primaryLabel}>Primary Archetype</Text>
              <Text style={styles.primaryName}>{primaryArchetype}</Text>
            </View>

            {/* 3. Secondary archetype */}
            <View style={styles.secondaryContainer}>
              <Text style={styles.secondaryLabel}>Secondary Archetype</Text>
              <Text style={styles.secondaryName}>{secondaryDisplay}</Text>
            </View>

            {/* 4. Divider */}
            <View style={styles.divider} />

            {/* 5. Narrative teaser card */}
            <View style={styles.sectionCard}>
              <Text style={styles.narrativeVisible}>{narrativeFirstSentence}</Text>
              <View style={{ position: 'relative', marginTop: 10 }}>
                <Text style={styles.narrativeLocked}>{narrativeSecondLine}</Text>
                <View style={styles.narrativeBlurOverlay} />
                <Text style={styles.narrativeLockIcon}>🔒</Text>
              </View>
            </View>

            {/* 6. Strengths preview */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR STRENGTHS</Text>
              {visibleStrengths.map((s) => (
                <PreviewBulletRow key={s} text={s} />
              ))}
              <LockedPreviewRow text={lockedStrength1} />
              <LockedPreviewRow text={lockedStrength2} />
            </View>

            {/* 7. Shadow patterns preview */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>WHEN YOU FEEL STUCK</Text>
              <PreviewBulletRow text={visibleShadow} />
              <LockedPreviewRow text={lockedShadow1} />
              <LockedPreviewRow text={lockedShadow2} />
            </View>

            {/* 8. Growth path teaser */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR GROWTH PATH</Text>
              <View style={styles.growthTeaserRow}>
                <Text style={styles.growthTeaserText}>{growthTeaser}</Text>
                <Text style={styles.growthLockIcon}>🔒</Text>
              </View>
            </View>

            {/* 9. Lock CTA card */}
            <View style={styles.lockCtaCard}>
              <View style={styles.lockIconCircle}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.lockTitle}>Unlock Your Full Design</Text>
              <Text style={styles.lockBody}>
                See your complete narrative, all strengths, growth path, and daily alignment practice.
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleUnlock}
                activeOpacity={0.88}
              >
                <Text style={styles.ctaLabel}>Unlock Your Full Design</Text>
              </TouchableOpacity>
            </View>

            {/* 10. Trial note */}
            <Text style={styles.trialNote}>Start your 7-day free trial — cancel anytime</Text>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.65)',
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  animatedWrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(201,168,76,0.07)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.04)',
    bottom: 120,
    left: -60,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 36,
  },
  primaryContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  glowBehind: {
    position: 'absolute',
    width: 240,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  primaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.whiteDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    zIndex: 1,
  },
  primaryName: {
    fontFamily: 'Lora_700Bold',
    fontSize: 36,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    zIndex: 1,
  },
  secondaryContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  secondaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.whiteDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  secondaryName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 22,
    color: COLORS.whiteMuted,
    textAlign: 'center',
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.18)',
    marginBottom: 28,
  },
  sectionCard: {
    width: '100%',
    backgroundColor: 'rgba(245,240,232,0.07)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.20)',
    marginBottom: 28,
  },
  narrativeVisible: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.85)',
    lineHeight: 24,
  },
  narrativeLocked: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.15)',
    lineHeight: 24,
  },
  narrativeBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,14,26,0.7)',
    borderRadius: 4,
  },
  narrativeLockIcon: {
    position: 'absolute',
    right: 0,
    top: 2,
    fontSize: 12,
    color: 'rgba(201,168,76,0.5)',
  },
  section: {
    width: '100%',
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    color: COLORS.gold,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  growthTeaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  growthTeaserText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 24,
    flex: 1,
    fontStyle: 'italic',
  },
  growthLockIcon: {
    fontSize: 14,
    color: 'rgba(201,168,76,0.5)',
  },
  lockCtaCard: {
    width: '100%',
    backgroundColor: 'rgba(245,240,232,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.20)',
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  lockIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockIcon: {
    fontSize: 24,
  },
  lockTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  lockBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.whiteMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#0A0E1A',
    letterSpacing: 0.2,
  },
  trialNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.whiteDim,
    textAlign: 'center',
  },
});
