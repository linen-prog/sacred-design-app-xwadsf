import React, { useContext, useEffect, useRef } from 'react';
import { Text, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeOnboarding } from '@/utils/onboardingStorage';
import { markQuizComplete } from '@/utils/quizState';

export default function PreparingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { computeSacredDesign, sacredDesignResult } = useContext(DiscoveryContext);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;
  const hasNavigated = useRef(false);

  // Navigate as soon as result is ready
  useEffect(() => {
    if (sacredDesignResult && !hasNavigated.current) {
      hasNavigated.current = true;
      console.log('[Preparing] sacredDesignResult ready — navigating to /reveal immediately');
      markQuizComplete(); // synchronous flag — must be first
      router.replace('/reveal'); // navigate immediately — don't wait for writes
      // writes happen in background — they'll be done before user taps CTA
      Promise.all([
        completeOnboarding(),
        AsyncStorage.setItem('hasCompletedQuiz', 'true'),
      ]).catch((e) => console.warn('[Preparing] Failed to write completion state:', e));
    }
  }, [sacredDesignResult, router]);

  useEffect(() => {
    console.log('[Preparing] Computing Sacred Design');
    computeSacredDesign();
  }, [computeSacredDesign]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseAnimation.start();

    // Fallback timeout in case state update is delayed
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        console.log('[Preparing] Fallback timeout — navigating to /reveal immediately');
        markQuizComplete(); // synchronous flag — must be first
        router.replace('/reveal'); // navigate immediately — don't wait for writes
        // writes happen in background — they'll be done before user taps CTA
        Promise.all([
          completeOnboarding(),
          AsyncStorage.setItem('hasCompletedQuiz', 'true'),
        ]).catch((e) => console.warn('[Preparing] Fallback: failed to write completion state:', e));
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [pulseScale, router, screenOpacity, screenTranslateY]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#000000',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
      {/* Back button */}
      <Pressable
        onPress={() => {
          console.log('[Preparing] Back pressed');
          router.back();
        }}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          zIndex: 999,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 22,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {/* logo */}
      <Animated.Image
        source={require('@/assets/images/e449825b-bcc9-4442-a79e-80d7eea37d18.jpeg')}
        style={{
          width: 120,
          height: 120,
          resizeMode: 'contain',
          marginBottom: 32,
          transform: [{ scale: pulseScale }],
        }}
      />

      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Lora_700Bold',
          color: '#FFFFFF',
          textAlign: 'center',
          lineHeight: 32,
          letterSpacing: -0.2,
          marginBottom: 12,
        }}
      >
        {"We're preparing\nyour Sacred Design\u2026"}
      </Text>

      <Text
        style={{
          fontSize: 15,
          fontFamily: 'Inter_400Regular',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
        }}
      >
        This will just take a moment.
      </Text>
    </Animated.View>
  );
}
