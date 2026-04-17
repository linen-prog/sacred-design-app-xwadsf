import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const PHASES = [
  'How You Operate',
  'What Drives You',
  'How You Show Up',
  'How You Stay Grounded',
];

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  function handleBack() {
    console.log('[Intro] Back pressed');
    router.back();
  }

  function handleContinue() {
    console.log('[Intro] Continue pressed');
    router.push('/onboarding/phase-1');
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ paddingTop: 16, paddingHorizontal: 16 }}>
        <AnimatedPressable
          onPress={handleBack}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={COLORS.textSecondary} />
        </AnimatedPressable>
      </View>

      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          opacity,
          transform: [{ translateY }],
        }}
      >
        <View style={{ gap: 20, alignItems: 'center', marginBottom: 40 }}>
          <Text
            style={{
              fontSize: 17,
              fontFamily: 'Inter_400Regular',
              color: COLORS.text,
              lineHeight: 28,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {"We'll guide you through a short discovery process to understand how you naturally think, feel, and show up."}
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontFamily: 'Inter_400Regular',
              color: COLORS.text,
              lineHeight: 28,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {"There are no right or wrong answers—just your honest experience."}
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontFamily: 'Inter_400Regular',
              color: COLORS.text,
              lineHeight: 28,
              textAlign: 'center',
              maxWidth: 320,
            }}
          >
            {"At the end, you'll receive your Sacred Design."}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          {PHASES.map((phase) => (
            <View
              key={phase}
              style={{
                backgroundColor: COLORS.accentMuted,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'Inter_400Regular',
                  color: COLORS.accent,
                }}
              >
                {phase}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}>
        <AnimatedPressable
          onPress={handleContinue}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text
            style={{
              color: COLORS.white,
              fontSize: 16,
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
            }}
          >
            Continue
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
