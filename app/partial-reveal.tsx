import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppState } from '@/contexts/AppStateContext';

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

function LockedRow({ label }: { label: string }) {
  return (
    <View style={styles.lockedRow}>
      <View style={styles.lockedBar} />
      <Text style={styles.lockedLabel}>{label}</Text>
    </View>
  );
}

export default function PartialRevealScreen() {
  const router = useRouter();
  const { appState } = useAppState();

  const screenOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  const primaryArchetype = appState.primaryArchetype ?? 'Your Archetype';
  const secondaryArchetype = appState.secondaryArchetype ?? 'Secondary Archetype';

  useEffect(() => {
    console.log('[PartialReveal] Screen mounted — primaryArchetype:', primaryArchetype, 'secondaryArchetype:', secondaryArchetype);

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
  }, [screenOpacity, glowScale, primaryArchetype, secondaryArchetype]);

  function handleUnlock() {
    console.log('[PartialReveal] "Unlock Your Full Design" pressed — navigating to /paywall');
    router.replace('/paywall?source=quiz_complete');
  }

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
            {/* Header label */}
            <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>

            {/* Primary archetype — fully visible */}
            <View style={styles.primaryContainer}>
              <View style={styles.glowBehind} />
              <Text style={styles.primaryLabel}>Primary Archetype</Text>
              <Text style={styles.primaryName}>{primaryArchetype}</Text>
            </View>

            {/* Secondary archetype — visible but smaller */}
            <View style={styles.secondaryContainer}>
              <Text style={styles.secondaryLabel}>Secondary Archetype</Text>
              <Text style={styles.secondaryName}>{secondaryArchetype}</Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Locked content card */}
            <View style={styles.lockedCard}>
              {/* Lock overlay */}
              <View style={styles.lockOverlay}>
                <View style={styles.lockIconCircle}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
                <Text style={styles.lockTitle}>Full Design Locked</Text>
                <Text style={styles.lockBody}>
                  Unlock your complete Sacred Design to see your narrative, strengths, growth path, and daily alignment practice.
                </Text>
              </View>

              {/* Blurred rows beneath the overlay */}
              <View style={styles.lockedRows}>
                <LockedRow label="Your Narrative" />
                <LockedRow label="Core Strengths" />
                <LockedRow label="Shadow Patterns" />
                <LockedRow label="Growth Path" />
                <LockedRow label="Daily Alignment Practice" />
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleUnlock}
              activeOpacity={0.88}
            >
              <Text style={styles.ctaLabel}>Unlock Your Full Design</Text>
            </TouchableOpacity>

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
  lockedCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardBg,
    overflow: 'hidden',
    marginBottom: 28,
  },
  lockOverlay: {
    backgroundColor: COLORS.blurOverlay,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 2,
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
  },
  lockedRows: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    opacity: 0.3,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.whiteMuted,
  },
  lockedLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.whiteMuted,
    width: 140,
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
    marginBottom: 14,
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
