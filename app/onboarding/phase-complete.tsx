import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { updateAppState } from '@/utils/appState';

const PHASE_DATA = {
  1: {
    emoji: '🌱',
    name: 'The Foundation',
    heading: 'Phase 1 Complete',
    message: "You've laid the foundation. Your roots run deep.",
    nextRoute: '/onboarding/phase-1-reflection' as const,
  },
  2: {
    emoji: '🔥',
    name: 'The Fire',
    heading: 'Phase 2 Complete',
    message: 'Your inner fire has spoken. Feel its warmth.',
    nextRoute: '/onboarding/phase-2-reflection' as const,
  },
  3: {
    emoji: '💧',
    name: 'The Flow',
    heading: 'Phase 3 Complete',
    message: "You've touched the flow. Let it carry you.",
    nextRoute: '/onboarding/phase-3-reflection' as const,
  },
  4: {
    emoji: '✨',
    name: 'The Spark',
    heading: 'Phase 4 Complete',
    message: 'Your spark is revealed. The full picture awaits.',
    nextRoute: '/onboarding/phase-4-reflection' as const,
  },
};

export default function PhaseCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phase: phaseParam } = useLocalSearchParams<{ phase: string }>();
  const phaseNum = (parseInt(phaseParam ?? '1', 10) as 1 | 2 | 3 | 4) || 1;
  const data = PHASE_DATA[phaseNum as keyof typeof PHASE_DATA] ?? PHASE_DATA[1];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const emojiScale = useRef(new Animated.Value(0.5)).current;
  const emojiOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stepMap: Record<number, string> = {
      1: '/onboarding/phase-complete?phase=1',
      2: '/onboarding/phase-complete?phase=2',
      3: '/onboarding/phase-complete?phase=3',
      4: '/onboarding/phase-complete?phase=4',
    };
    const step = stepMap[phaseNum] ?? '/onboarding/phase-complete?phase=1';
    console.log('[PhaseComplete] mount — updating currentOnboardingStep to', step);
    updateAppState({ currentOnboardingStep: step }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Stagger: background fades in, then emoji pops, then text
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(emojiScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(emojiOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    console.log(`[PhaseComplete] Continue to reflection pressed — phase ${phaseNum}`);
    router.push(data.nextRoute);
  }

  const topPadding = insets.top + 24;
  const bottomPadding = insets.bottom + 32;

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1F2E' }}>
      {/* Subtle radial glow behind emoji */}
      <View
        style={{
          position: 'absolute',
          top: '20%',
          alignSelf: 'center',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: 'rgba(201,168,76,0.07)',
        }}
      />

      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 40,
          paddingTop: topPadding,
          paddingBottom: bottomPadding,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Emoji */}
        <Animated.Text
          style={{
            fontSize: 80,
            marginBottom: 32,
            opacity: emojiOpacity,
            transform: [{ scale: emojiScale }],
          }}
        >
          {data.emoji}
        </Animated.Text>

        {/* Gold overline */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Inter_400Regular',
            color: '#C9A84C',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          {data.name}
        </Text>

        {/* Main heading */}
        <Text
          style={{
            fontSize: 30,
            fontFamily: 'Lora_700Bold',
            color: '#F5F0E8',
            textAlign: 'center',
            letterSpacing: -0.3,
            marginBottom: 20,
          }}
        >
          {data.heading}
        </Text>

        {/* Message */}
        <Text
          style={{
            fontSize: 18,
            fontFamily: 'Lora_400Regular',
            color: 'rgba(245,240,232,0.72)',
            textAlign: 'center',
            lineHeight: 28,
            maxWidth: 280,
          }}
        >
          {data.message}
        </Text>

        {/* Gold divider */}
        <View
          style={{
            width: 48,
            height: 1,
            backgroundColor: 'rgba(201,168,76,0.4)',
            marginTop: 36,
            marginBottom: 36,
          }}
        />
      </Animated.View>

      {/* CTA button */}
      <View style={{ paddingHorizontal: 28, paddingBottom: bottomPadding }}>
        <AnimatedPressable
          onPress={handleContinue}
          style={{
            backgroundColor: '#C9A84C',
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Continue to Reflection"
        >
          <Text
            style={{
              color: '#1A1F2E',
              fontSize: 16,
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
              letterSpacing: 0.2,
            }}
          >
            Continue to Reflection →
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
