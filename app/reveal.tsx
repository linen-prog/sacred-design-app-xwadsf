import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiFetch } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

const REVEAL_COLORS = {
  background: '#F6F1E8',
  text: '#2F3E2F',
  accent: '#6F8A6A',
  glow: '#E6D3A3',
  surface: '#FFFFFF',
  textMuted: 'rgba(47,62,47,0.65)',
  border: 'rgba(111,138,106,0.15)',
};

export type ArchetypeName =
  | 'Peacemaker'
  | 'Courageous Leader'
  | 'Deep Feeler'
  | 'Faithful Steward'
  | 'Light Bearer'
  | 'Truth Seeker'
  | 'Justice Carrier';

export const ARCHETYPE_CONTENT: Record<ArchetypeName, {
  narrative: string;
  strengths: string[];
  stuckPatterns: string[];
  growthPath: string;
}> = {
  'Peacemaker': {
    narrative: "You carry a rare gift—the ability to hold space without losing yourself. You sense tension before it surfaces and instinctively move toward harmony. This isn't weakness. It's a form of strength the world desperately needs. People feel safe around you. You create room for others to breathe.",
    strengths: ['Deep presence', 'Empathy and attunement', 'De-escalation', 'Creating safety'],
    stuckPatterns: ['Avoiding necessary conflict', 'Losing your voice to keep the peace', "Carrying others' emotions as your own"],
    growthPath: "Learn to speak your truth as an act of love—not just for others, but for yourself.",
  },
  'Courageous Leader': {
    narrative: "You were made to move. When others hesitate, you step forward. You carry vision and the courage to act on it—even when the path isn't clear. Your leadership isn't about control. It's about calling others into what's possible. You see the horizon when others see only the obstacle.",
    strengths: ['Vision and initiative', 'Decisiveness under pressure', 'Inspiring others forward', 'Resilience'],
    stuckPatterns: ['Moving too fast', 'Carrying the weight alone', 'Confusing busyness with purpose'],
    growthPath: "True leadership begins in stillness. Let your vision be shaped by listening before leading.",
  },
  'Deep Feeler': {
    narrative: "You experience the world at a depth most people never reach. Your sensitivity is not a flaw—it's a form of perception. You feel what others miss, and that capacity for depth is one of your greatest gifts. You bring meaning to moments others pass by without noticing.",
    strengths: ['Emotional intelligence', 'Depth of connection', 'Creativity and intuition', 'Empathy'],
    stuckPatterns: ['Emotional overwhelm', "Absorbing others' pain", 'Withdrawing when hurt'],
    growthPath: "Your depth is a gift, not a burden. Learn to feel fully without losing your footing.",
  },
  'Faithful Steward': {
    narrative: "You are the one who shows up—quietly, consistently, without needing recognition. You build things that last. You care for what others overlook. Your faithfulness is a form of love that shapes the world in ways that rarely make headlines. Reliability is your signature.",
    strengths: ['Reliability and follow-through', 'Attention to detail', 'Creating order', 'Long-term thinking'],
    stuckPatterns: ['Perfectionism', 'Difficulty delegating', 'Finding worth in productivity'],
    growthPath: "Rest is not a reward for finishing—it's part of the design. You are enough before the work is done.",
  },
  'Light Bearer': {
    narrative: "You carry something that draws people in—a warmth, an encouragement, a sense that things can be better. You see potential where others see problems. Your presence lifts rooms and your words plant seeds that grow long after you've moved on. Hope is your native language.",
    strengths: ['Encouragement and hope', 'Seeing potential', 'Creating belonging', 'Inspiring growth'],
    stuckPatterns: ['Suppressing your own struggles to stay positive', 'People-pleasing', 'Neglecting your own needs'],
    growthPath: "You can only give light from a place of being filled. Tend to your own soul first.",
  },
  'Truth Seeker': {
    narrative: "You are wired for depth and clarity. You ask the questions others avoid and sit with complexity without rushing to easy answers. Your mind is a gift—and so is your willingness to pursue what's real, even when it's uncomfortable. You help others see what they couldn't see alone.",
    strengths: ['Discernment and wisdom', 'Intellectual depth', 'Honesty', 'Pattern recognition'],
    stuckPatterns: ['Overthinking', 'Isolation', 'Using analysis to avoid vulnerability'],
    growthPath: "Truth is not only found in the mind. Let your heart and body be part of the search.",
  },
  'Justice Carrier': {
    narrative: "You feel the weight of what's wrong in the world—and you can't look away. That fire in you is not anger without purpose. It's love with direction. You were made to stand in the gap, to speak up, to move toward what others walk past. Your courage is a form of compassion.",
    strengths: ['Moral clarity and courage', 'Advocacy', 'Persistence', 'Compassion for the marginalized'],
    stuckPatterns: ['Burnout', 'Righteous anger becoming bitterness', "Carrying the world's pain alone"],
    growthPath: "Sustainable justice flows from a grounded soul. You cannot pour from empty.",
  },
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

export default function RevealScreen() {
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);
  const { user } = useAuth();
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const [saving, setSaving] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const promptTranslateY = useRef(new Animated.Value(80)).current;
  const promptOpacity = useRef(new Animated.Value(0)).current;

  const primary = sacredDesignResult?.primary_archetype as ArchetypeName | undefined;
  const secondary = sacredDesignResult?.secondary_archetype as ArchetypeName | undefined;
  const blendName = sacredDesignResult?.blend_name ?? '';
  const content = primary ? ARCHETYPE_CONTENT[primary] : null;

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
    console.log('[Reveal] Saving archetype to backend via POST /api/archetypes/save');
    try {
      const body = {
        primary_archetype: sacredDesignResult.primary_archetype,
        secondary_archetype: sacredDesignResult.secondary_archetype,
        blend_name: sacredDesignResult.blend_name,
        scores: sacredDesignResult.archetypeScores,
      };
      const res = await apiFetch('/api/archetypes/save', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn('[Reveal] /api/archetypes/save failed:', res.status, errText);
      } else {
        console.log('[Reveal] Archetype saved to backend successfully');
      }
    } catch (e) {
      console.warn('[Reveal] /api/archetypes/save error (ignored):', e);
    }
  }

  const handleCTA = async () => {
    console.log('[Reveal] "Continue to My Daily Alignment" pressed');
    setSaving(true);
    try { await saveToBackend(); } catch (e) {}
    try { await AsyncStorage.setItem('hasCompletedQuiz', 'true'); } catch (e) {}
    setSaving(false);

    if (user) {
      console.log('[Reveal] User is signed in — navigating to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('[Reveal] User is not signed in — showing sign-in prompt');
      setShowSignInPrompt(true);
      Animated.parallel([
        Animated.timing(promptTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(promptOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  if (!sacredDesignResult || !content) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Your Sacred Design is being prepared…</Text>
        <AnimatedPressable onPress={() => router.back()} style={styles.fallbackButton}>
          <Text style={styles.fallbackButtonText}>Go Back</Text>
        </AnimatedPressable>
      </View>
    );
  }

  const ctaLabel = saving ? 'Saving…' : 'Continue to My Daily Alignment';

  return (
    <View style={styles.container}>
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

        {/* Section 6 — Stuck Patterns */}
        <View style={styles.section}>
          <SectionLabel label="When you feel stuck" />
          {content.stuckPatterns.map((pattern) => (
            <BulletItem key={pattern} text={pattern} muted />
          ))}
        </View>

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
            { transform: [{ translateY: promptTranslateY }], opacity: promptOpacity },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REVEAL_COLORS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: REVEAL_COLORS.background,
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
    backgroundColor: REVEAL_COLORS.surface,
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
    backgroundColor: REVEAL_COLORS.background,
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
