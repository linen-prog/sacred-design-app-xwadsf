import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
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
};

export default function PostQuizSaveScreen() {
  const router = useRouter();
  const { updateAppState } = useAppState();

  useEffect(() => {
    console.log('[PostQuizSave] Auto-advancing — marking postQuizSaveCompleted');
    updateAppState({ currentOnboardingStep: '/post-quiz-save', postQuizSaveCompleted: true });
    const timer = setTimeout(async () => {
      console.log('[PostQuizSave] Navigating to /partial-reveal');
      router.replace('/partial-reveal');
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.orb1} />
      <View style={styles.orb2} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>✦</Text>
          </View>
          <Text style={styles.eyebrow}>QUIZ COMPLETE</Text>
          <Text style={styles.title}>Saving your results…</Text>
          <Text style={styles.subtitle}>
            Your Sacred Design is being prepared.
          </Text>
          <ActivityIndicator size="large" color={COLORS.gold} style={{ marginTop: 32 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
    alignItems: 'center',
  },
  iconWrap: {
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
  iconText: { fontSize: 26, color: COLORS.gold },
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
  },
});
