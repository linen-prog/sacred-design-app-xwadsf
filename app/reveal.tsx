import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { completeOnboarding } from '@/utils/onboardingStorage';
import { useAppState } from '@/contexts/AppStateContext';
import { ArchetypeName, ARCHETYPE_CONTENT } from '@/constants/ArchetypeContent';

const REVEAL_BG = require('../assets/images/3e2dad8c-e399-45fa-b232-efb5c39444a6.jpeg');

const REVEAL_COLORS = {
  background: '#F6F1E8',
  text: '#2F3E2F',
  accent: '#6F8A6A',
  glow: '#E6D3A3',
  surface: '#FFFFFF',
  textMuted: 'rgba(47,62,47,0.65)',
  border: 'rgba(111,138,106,0.15)',
};



const GROWTH_PHILOSOPHY =
  "God has already placed these gifts within you.\nEach time you practice a new way of showing up, old patterns begin to loosen and new ones take shape—allowing your gifts to come through more clearly.";

function BulletItem({ text, muted }: { text: string; muted?: boolean }) {
  const textColor = muted ? REVEAL_COLORS.textMuted : REVEAL_COLORS.text;
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={[styles.bulletText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

interface StuckCardProps {
  item: { stuck: string; pathForward: string; appHelp: string };
  index: number;
  archetypeName: string;
  onPress: (archetypeName: string, index: number) => void;
}

function StuckCard({ item, index, archetypeName, onPress }: StuckCardProps) {
  const handlePress = () => {
    console.log(`[Reveal] Stuck card tapped — archetype: "${archetypeName}", index: ${index}, stuck: "${item.stuck}"`);
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

export default function RevealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sacredDesignResult, restoreFromBackend } = useContext(DiscoveryContext);
  const { user } = useAuth();
  const { updateAppState } = useAppState();
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const promptTranslateY = useRef(new Animated.Value(80)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsWaiting(false), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isWaiting || sacredDesignResult) return;
    console.log('[Reveal] No sacredDesignResult after wait — attempting backend restore via GET /api/archetypes/me');
    apiFetch('/api/archetypes/me')
      .then(async (res) => {
        if (!res.ok) {
          console.warn('[Reveal] GET /api/archetypes/me failed:', res.status);
          return;
        }
        const data = await res.json();
        console.log('[Reveal] GET /api/archetypes/me response:', data);
        if (data && data.primary_archetype) {
          restoreFromBackend({
            primary_archetype: data.primary_archetype,
            secondary_archetype: data.secondary_archetype,
            blend_name: data.blend_name,
            scores: data.scores,
          });
        }
      })
      .catch(() => {});
  }, [isWaiting, sacredDesignResult, restoreFromBackend]);

  const primary = sacredDesignResult?.primary_archetype as ArchetypeName | undefined;
  const secondary = sacredDesignResult?.secondary_archetype as ArchetypeName | undefined;
  const blendName = sacredDesignResult?.blend_name ?? '';
  const content = primary ? ARCHETYPE_CONTENT[primary] : null;
  const secondaryContent = secondary ? ARCHETYPE_CONTENT[secondary] : null;

  const archetypeLine = primary && secondary ? `${primary}  ·  ${secondary}` : '';

  useEffect(() => {
    console.log('[Reveal] Screen mounted, sacredDesignResult:', sacredDesignResult);
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [screenOpacity, sacredDesignResult]);

  async function saveToBackend() {
    if (!sacredDesignResult) return;
    console.log('[Reveal] Upserting archetype to backend via POST /api/archetypes/upsert');
    try {
      const body = {
        primary_archetype: sacredDesignResult.primary_archetype,
        secondary_archetype: sacredDesignResult.secondary_archetype,
        blend_name: sacredDesignResult.blend_name,
        scores: sacredDesignResult.archetypeScores,
      };
      const res = await apiFetch('/api/archetypes/upsert', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn('[Reveal] /api/archetypes/upsert failed:', res.status, errText);
      } else {
        console.log('[Reveal] Archetype upserted to backend successfully');
      }
    } catch (e) {
      console.warn('[Reveal] /api/archetypes/upsert error (ignored):', e);
    }
  }

  const handleCTA = async () => {
    console.log('[Reveal] "Continue to My Daily Alignment" pressed');
    setSaving(true);
    try { await saveToBackend(); } catch (e) {}
    try { await AsyncStorage.setItem('hasCompletedQuiz', 'true'); } catch (e) {}
    try {
      await completeOnboarding();
      console.log('[Reveal] completeOnboarding() written to SecureStore');
    } catch (e) {
      console.warn('[Reveal] completeOnboarding() failed:', e);
    }
    // Mark reveal as viewed in appState — this is the gate that lets users into tabs
    let newState;
    try {
      console.log('[Reveal] PRE-UPDATE appState — setting revealViewed=true, dailyAlignmentReady=true');
      newState = await updateAppState({
        revealViewed: true,
        dailyAlignmentReady: true,
        currentOnboardingStep: null,
      });
      console.log('[Reveal] POST-UPDATE state confirmed:', JSON.stringify(newState));
    } catch (e) {
      console.warn('[Reveal] Failed to update appState:', e);
    }
    setSaving(false);

    if (user) {
      console.log('[Reveal] User is signed in — awaiting propagation delay then navigating to tabs');
      await new Promise(resolve => setTimeout(resolve, 75));
      router.replace('/(tabs)');
      console.log('[Reveal] Navigation triggered to /(tabs)');
    } else {
      console.log('[Reveal] User is not signed in — showing sign-in prompt');
      setShowSignInPrompt(true);
      Animated.parallel([
        Animated.timing(promptTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(promptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleStuckCardPress = (archetypeName: string, index: number) => {
    router.push(`/shadow-path?archetype=${encodeURIComponent(archetypeName)}&stuck=${index}`);
  };

  if (!sacredDesignResult || !content) {
    if (isWaiting) {
      return (
        <View style={styles.fallbackContainer}>
          <ActivityIndicator size="large" color={REVEAL_COLORS.accent} />
          <Text style={[styles.fallbackText, { marginTop: 20 }]}>Preparing your Sacred Design…</Text>
        </View>
      );
    }
    // Not waiting and still no result — attempt backend restore, then reset stale state
    const handleRetry = async () => {
      console.log('[Reveal] Retry pressed — attempting backend restore via GET /api/archetypes/me');
      try {
        const res = await apiFetch('/api/archetypes/me');
        if (res.ok) {
          const data = await res.json();
          console.log('[Reveal] Retry: GET /api/archetypes/me response:', data);
          if (data?.primary_archetype) {
            restoreFromBackend({
              primary_archetype: data.primary_archetype,
              secondary_archetype: data.secondary_archetype,
              blend_name: data.blend_name,
              scores: data.scores,
            });
            return; // sacredDesignResult will update and re-render
          }
        } else {
          console.warn('[Reveal] Retry: GET /api/archetypes/me failed:', res.status);
        }
      } catch (e) {
        console.warn('[Reveal] Retry: backend restore error:', e);
      }
      // Backend unavailable or unauthenticated — stale appState detected.
      // Reset quiz/reveal flags so the user can go through the flow properly.
      console.log('[Reveal] Retry: resetting stale appState and routing to onboarding');
      try {
        await updateAppState({
          quizCompleted: false,
          revealUnlocked: false,
          revealViewed: false,
          postQuizSaveCompleted: false,
          currentOnboardingStep: '/onboarding/welcome',
        });
      } catch (e) {
        console.warn('[Reveal] Retry: failed to reset appState:', e);
      }
      router.replace('/onboarding/welcome');
    };
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>We couldn't load your Sacred Design.</Text>
        <Text style={[styles.fallbackText, { fontSize: 14, marginTop: 8, opacity: 0.7 }]}>Tap Retry to try again, or start over to retake the quiz.</Text>
        <AnimatedPressable onPress={handleRetry} style={[styles.fallbackButton, { marginTop: 24 }]}>
          <Text style={styles.fallbackButtonText}>Retry</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={async () => {
            console.log('[Reveal] "Start Over" pressed from fallback — resetting stale state');
            try {
              await updateAppState({
                quizCompleted: false,
                revealUnlocked: false,
                revealViewed: false,
                postQuizSaveCompleted: false,
                currentOnboardingStep: '/onboarding/welcome',
              });
            } catch (e) {}
            router.replace('/onboarding/welcome');
          }}
          style={[styles.fallbackButton, { marginTop: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: REVEAL_COLORS.accent }]}
        >
          <Text style={[styles.fallbackButtonText, { color: REVEAL_COLORS.accent }]}>Start Over</Text>
        </AnimatedPressable>
      </View>
    );
  }

  const ctaLabel = saving ? 'Saving…' : 'Continue to My Daily Alignment';
  const secondaryLabel = secondary ? `Secondary Design · ${secondary}` : '';

  return (
    <ImageBackground
      source={REVEAL_BG}
      style={styles.container}
      resizeMode="cover"
      imageStyle={{ opacity: 0.60 }}
    >
      <LinearGradient
        colors={[
          "rgba(246,241,232,0.10)",
          "rgba(246,241,232,0.45)",
          "rgba(246,241,232,0.88)",
        ]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={{ opacity: screenOpacity }}>

        {/* Section 1 — Header */}
        <Text style={styles.headerLabel}>Your Sacred Design</Text>

        {/* Section 2 — Blend Name + Glow */}
        <View style={styles.blendContainer}>
          <View style={styles.glow} />
          <Text style={styles.blendName}>{blendName}</Text>
        </View>

        {/* Section 3 — Archetype line */}
        <Text style={styles.archetypeLine}>{archetypeLine}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section 4 — Narrative Card */}
        <View style={styles.narrativeCard}>
          <Text style={styles.narrativeText}>{content.narrative}</Text>
        </View>

        {/* Section 5 — Strengths */}
        <View style={styles.section}>
          <SectionLabel label="Your Strengths" />
          {content.strengths.map((strength) => (
            <BulletItem key={strength} text={strength} />
          ))}
        </View>

        {/* Section 6 — Primary Stuck Patterns (tappable cards) */}
        <View style={styles.section}>
          <SectionLabel label="When you feel stuck" />
          <Text style={styles.stuckHint}>Tap a pattern to explore your path forward</Text>
          {content.stuckToStrength.map((item, index) => (
            <StuckCard
              key={item.stuck}
              item={item}
              index={index}
              archetypeName={primary!}
              onPress={handleStuckCardPress}
            />
          ))}
        </View>

        {/* Section 6b — Secondary Stuck Patterns */}
        {secondaryContent && secondary && (
          <View style={styles.section}>
            <SectionLabel label={secondaryLabel} />
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
          </View>
        )}

        {/* Section 7 — Growth Philosophy */}
        <View style={styles.philosophyContainer}>
          <Text style={styles.philosophyText}>{GROWTH_PHILOSOPHY}</Text>
        </View>

        {/* Section 8 — Growth Path */}
        <View style={styles.section}>
          <SectionLabel label="Your Growth Path" />
          <View style={styles.growthPathContainer}>
            <Text style={styles.growthPathText}>{content.growthPath}</Text>
          </View>
        </View>

        {/* Section 9 — CTA Button */}
        <AnimatedPressable
          onPress={handleCTA}
          style={[styles.ctaButton, saving && { opacity: 0.6 }]}
          disabled={saving}
        >
          <Text style={styles.ctaLabel}>{ctaLabel}</Text>
        </AnimatedPressable>

      </Animated.View>
      </ScrollView>

      {/* Sign-in prompt overlay */}

      {showSignInPrompt && (
        <Animated.View
          style={[
            styles.promptCard,
            { transform: [{ translateY: promptTranslateY }], opacity: promptOpacity, paddingBottom: Math.max(40, insets.bottom + 24) },
          ]}
        >
          <View style={styles.promptHandle} />
          <Text style={styles.promptTitle}>Save Your Sacred Design</Text>
          <Text style={styles.promptBody}>
            Create a free account to keep your results and daily alignments across devices.
          </Text>
          <TouchableOpacity
            style={styles.promptPrimaryButton}
            onPress={() => {
              console.log('[Reveal] "Create Account" pressed — navigating to auth-screen');
              router.push('/auth-screen');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.promptPrimaryLabel}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.promptSecondaryButton}
            onPress={() => {
              console.log('[Reveal] "Continue without saving" pressed — navigating to tabs');
              router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.promptSecondaryLabel}>Continue without saving</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REVEAL_COLORS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  headerLabel: {
    paddingTop: 80,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    fontWeight: '500',
    color: REVEAL_COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  blendContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 120,
    backgroundColor: REVEAL_COLORS.glow,
    borderRadius: 60,
    opacity: 0.45,
  },
  blendName: {
    zIndex: 1,
    fontFamily: 'Lora_700Bold',
    fontSize: 32,
    fontWeight: '700',
    color: REVEAL_COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  archetypeLine: {
    marginTop: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: REVEAL_COLORS.accent,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  divider: {
    marginTop: 36,
    marginBottom: 36,
    height: 1,
    backgroundColor: REVEAL_COLORS.border,
    width: '40%',
    alignSelf: 'center',
  },
  narrativeCard: {
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: REVEAL_COLORS.border,
    shadowColor: '#2F3E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  narrativeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: REVEAL_COLORS.text,
    lineHeight: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: REVEAL_COLORS.accent,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: REVEAL_COLORS.accent,
    marginTop: 8,
  },
  bulletText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    flex: 1,
  },
  stuckHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: REVEAL_COLORS.textMuted,
    marginBottom: 12,
    marginTop: -6,
  },
  stuckCard: {
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: REVEAL_COLORS.border,
    shadowColor: '#2F3E2F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  stuckCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stuckCardLeft: {
    flex: 1,
    gap: 4,
  },
  stuckCardStuck: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: REVEAL_COLORS.text,
    lineHeight: 20,
  },
  stuckCardPath: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: REVEAL_COLORS.accent,
    lineHeight: 18,
  },
  stuckCardArrow: {
    fontSize: 18,
    color: REVEAL_COLORS.accent,
    opacity: 0.7,
  },
  philosophyContainer: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  philosophyText: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 16,
    color: REVEAL_COLORS.accent,
    lineHeight: 28,
    textAlign: 'center',
  },
  growthPathContainer: {
    borderLeftWidth: 3,
    borderLeftColor: REVEAL_COLORS.accent,
    paddingLeft: 16,
    paddingVertical: 4,
  },
  growthPathText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: REVEAL_COLORS.text,
    lineHeight: 26,
  },
  ctaButton: {
    marginBottom: 12,
    backgroundColor: REVEAL_COLORS.accent,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ctaSecondaryButton: {
    marginBottom: 0,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: REVEAL_COLORS.accent,
    backgroundColor: 'transparent',
  },
  ctaSecondaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: REVEAL_COLORS.accent,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  fallbackText: {
    fontFamily: 'Lora_400Regular',
    fontSize: 18,
    color: REVEAL_COLORS.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  fallbackButton: {
    backgroundColor: REVEAL_COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  fallbackButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  promptCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F6F1E8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 12,
  },
  promptHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(47,62,47,0.18)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  promptTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22,
    color: REVEAL_COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  promptBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: REVEAL_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  promptPrimaryButton: {
    backgroundColor: REVEAL_COLORS.accent,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  promptPrimaryLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  promptSecondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  promptSecondaryLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: REVEAL_COLORS.textMuted,
  },
});
