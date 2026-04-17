import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  function handleBegin() {
    console.log('[Welcome] Begin Sacred Discovery pressed');
    router.push('/onboarding/intro');
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
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: COLORS.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 48,
          }}
        >
          <Compass size={64} color={COLORS.accent} strokeWidth={1.5} />
        </View>

        <Text
          style={{
            fontSize: 30,
            fontFamily: 'Lora_700Bold',
            color: COLORS.text,
            letterSpacing: -0.3,
            textAlign: 'center',
            lineHeight: 40,
            marginBottom: 20,
          }}
        >
          {'Know your design.\nGrow in your calling.\nWalk in it daily.'}
        </Text>

        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            color: COLORS.textSecondary,
            lineHeight: 24,
            textAlign: 'center',
            maxWidth: 300,
          }}
        >
          {'A gentle path to understand how you\'re uniquely made—and grow into it.'}
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 32,
          opacity,
        }}
      >
        <AnimatedPressable
          onPress={handleBegin}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Begin Sacred Discovery"
        >
          <Text
            style={{
              color: COLORS.white,
              fontSize: 16,
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
            }}
          >
            Begin Sacred Discovery
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}
