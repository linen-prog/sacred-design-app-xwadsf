import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
      console.log('[PartialReveal] Already subscribed/unlocked — navigating to /reveal');
      router.replace('/reveal');
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
  const NARRATIVE_HOOKS: Record<string, string> = {
    'Peacemaker':        'You sense what others are feeling before they say a word — and you quietly adjust the room.',
    'Courageous Leader': 'When the path isn\'t clear, you\'re already moving — and somehow others follow.',
    'Deep Feeler':       'You notice things most people walk past. That depth isn\'t a flaw. It\'s how you\'re wired.',
    'Faithful Steward':  'You show up when it matters, long after others have moved on. That\'s rarer than you think.',
    'Light Bearer':      'People leave conversations with you feeling more hopeful than when they arrived.',
    'Truth Seeker':      'You can\'t settle for surface answers. You need to understand why — and that changes everything.',
    'Justice Carrier':   'You feel the weight of what\'s wrong before anyone else names it. That fire has a purpose.',
  };
  const rawFirst = previewContent.narrative.split('. ')[0] + '.';
  const narrativeHook = NARRATIVE_HOOKS[primaryArchetype ?? ''] ?? (rawFirst.startsWith('You') ? rawFirst : `You carry something rare. ${rawFirst}`);

  const STRENGTH_HOOKS: Record<string, [string, string]> = {
    'Peacemaker':        ['You de-escalate tension without anyone noticing you did it', 'You absorb more than you let on — and carry it longer than you should'],
    'Courageous Leader': ['You make decisions when others are still weighing options', 'You move fast enough that people sometimes can\'t tell if you\'re leading or escaping'],
    'Deep Feeler':       ['You pick up on emotional undercurrents in a room instantly', 'You feel things so fully that it\'s hard to know where you end and others begin'],
    'Faithful Steward':  ['You follow through on things others quietly let slide', 'You\'d rather do it yourself than risk it being done wrong'],
    'Light Bearer':      ['You reframe problems in ways that make people feel capable', 'You\'re so good at holding hope for others that your own doubts go unspoken'],
    'Truth Seeker':      ['You ask the question that cuts through the noise', 'You can see the answer clearly and still not know what to do with it'],
    'Justice Carrier':   ['You speak up when others go quiet', 'The weight of what\'s wrong follows you home — even when you try to leave it at the door'],
  };
  const visibleStrengths: [string, string] = STRENGTH_HOOKS[primaryArchetype ?? ''] ?? [previewContent.strengths[0] ?? '', previewContent.strengths[1] ?? ''];
  const secondaryDisplay = secondaryArchetype ?? 'Secondary Archetype';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient glow orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ scale: glowScale }] }]} />
      <View style={styles.orb2} />

      <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={true}>

          {/* 1. Eyebrow */}
          <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>

          {/* 2. Primary + Secondary archetype names */}
          <Text style={styles.primaryName}>{primaryArchetype}</Text>
          <Text style={styles.secondaryName}>{secondaryDisplay}</Text>

          {/* 3. Narrative hook card */}
          <View style={styles.narrativeCard}>
            <Text style={styles.narrativeText}>{narrativeHook}</Text>
            <LinearGradient
              colors={['transparent', 'rgba(10,14,26,0.92)']}
              style={styles.narrativeFade}
              pointerEvents="none"
            />
          </View>

          {/* 4. Strengths — 2 visible only */}
          <Text style={styles.sectionLabel}>YOUR STRENGTHS</Text>
          {visibleStrengths.map((s) => (
            <PreviewBulletRow key={s} text={s} />
          ))}

          {/* 5. Lock wall */}
          <View style={styles.lockCard}>
            <View style={styles.lockIconCircle}>
              <Ionicons name="lock-closed" size={20} color="rgba(201,168,76,0.8)" />
            </View>
            <Text style={styles.lockTitle}>This is only part of the picture</Text>
            <Text style={[styles.lockBody, { marginBottom: 12 }]}>
              This explains more than you think it does.
            </Text>
            <View style={{ width: '100%', marginBottom: 20, gap: 6 }}>
              {['See your patterns', 'Understand what drives them', 'Learn how to shift them'].map((line) => (
                <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,168,76,0.5)' }} />
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(245,240,232,0.55)', lineHeight: 20 }}>{line}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleUnlock}
              activeOpacity={0.88}
            >
              <Text style={styles.ctaLabel}>Unlock Your Full Design</Text>
            </TouchableOpacity>
            <Text style={styles.trialNote}>$4.99/month • Auto-renews. Cancel anytime.</Text>
          </View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  content: {
    paddingHorizontal: 28,
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 48,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    color: COLORS.gold,
    textAlign: 'center',
    marginTop: 48,
    marginBottom: 28,
    alignSelf: 'center',
  },
  primaryName: {
    fontFamily: 'Lora_700Bold',
    fontSize: 40,
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    alignSelf: 'center',
  },
  secondaryName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.whiteMuted,
    textAlign: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  narrativeCard: {
    backgroundColor: 'rgba(245,240,232,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    padding: 20,
    marginBottom: 28,
    width: '100%',
    overflow: 'hidden',
  },
  narrativeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(245,240,232,0.88)',
    lineHeight: 26,
  },
  narrativeFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    color: COLORS.gold,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  lockCard: {
    backgroundColor: 'rgba(10,14,26,0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginTop: 28,
  },
  lockIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(245,240,232,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
    marginBottom: 24,
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#0A0E1A',
  },
  trialNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(245,240,232,0.55)',
    textAlign: 'center',
    marginTop: 12,
  },
});
