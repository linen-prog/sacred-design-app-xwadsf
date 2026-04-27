import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '@/contexts/AppStateContext';

const COLORS = {
  gradientTop: '#0A0E1A',
  gradientMid: '#1A1030',
  gradientBot: '#0D1A14',
  gold: '#C9A84C',
  goldLight: 'rgba(201,168,76,0.18)',
  goldBorder: 'rgba(201,168,76,0.35)',
  white: '#F5F0E8',
  whiteMuted: 'rgba(245,240,232,0.6)',
  whiteDim: 'rgba(245,240,232,0.4)',
  cardBg: 'rgba(245,240,232,0.07)',
  cardBorder: 'rgba(201,168,76,0.22)',
};

export default function PostQuizSaveScreen() {
  const router = useRouter();
  const { updateAppState } = useAppState();
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    console.log('[PostQuizSave] Screen mounted — updating currentOnboardingStep + marking postQuizSaveCompleted');
    updateAppState({ currentOnboardingStep: '/post-quiz-save', postQuizSaveCompleted: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSkip() {
    console.log('[PostQuizSave] "Continue without saving" pressed');
    setSkipping(true);
    try {
      await updateAppState({ postQuizSaveCompleted: true });
      await new Promise(resolve => setTimeout(resolve, 75));
      console.log('[PostQuizSave] postQuizSaveCompleted=true — navigating to /partial-reveal');
      router.replace('/partial-reveal');
    } catch (e) {
      console.warn('[PostQuizSave] Error skipping:', e);
      setSkipping(false);
    }
  }

  function handleCreateAccount() {
    console.log('[PostQuizSave] "Create Account" pressed — navigating to /auth-screen?from=post-quiz-save');
    router.push('/auth-screen?from=post-quiz-save');
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative orbs */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>✦</Text>
          </View>

          {/* Eyebrow */}
          <Text style={styles.eyebrow}>QUIZ COMPLETE</Text>

          {/* Title */}
          <Text style={styles.title}>Save your design</Text>

          {/* Subtext */}
          <Text style={styles.subtitle}>
            Create an account to keep your results and continue your journey anytime.
          </Text>

          {/* Benefits card */}
          <View style={styles.card}>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>◈</Text>
              <Text style={styles.benefitText}>Your archetype results, saved forever</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>◈</Text>
              <Text style={styles.benefitText}>Resume your journey on any device</Text>
            </View>
            <View style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>◈</Text>
              <Text style={styles.benefitText}>Daily alignment practice, personalized to you</Text>
            </View>
          </View>

          {/* Primary CTA */}
          <Pressable
            style={styles.primaryButton}
            onPress={handleCreateAccount}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </Pressable>

          {/* Secondary — skip */}
          <Pressable
            style={styles.skipLink}
            onPress={handleSkip}
            disabled={skipping}
          >
            {skipping ? (
              <ActivityIndicator size="small" color={COLORS.whiteDim} />
            ) : (
              <Text style={styles.skipLinkText}>Continue without saving</Text>
            )}
          </Pressable>
        </View>
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
  orb1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(201,168,76,0.05)',
    top: -100,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,168,76,0.04)',
    bottom: 80,
    left: -70,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 26,
    color: COLORS.gold,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'Lora_700Bold',
    fontSize: 34,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.whiteMuted,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    fontSize: 14,
    color: COLORS.gold,
    width: 18,
    textAlign: 'center',
  },
  benefitText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.white,
    flex: 1,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#0A0E1A',
    letterSpacing: 0.2,
  },
  skipLink: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipLinkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.whiteDim,
  },
});
