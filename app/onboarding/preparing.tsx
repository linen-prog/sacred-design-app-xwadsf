import React, { useContext, useEffect, useRef } from 'react';
import { Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';

export default function PreparingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { computeSacredDesign } = useContext(DiscoveryContext);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;

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

    const timer = setTimeout(async () => {
      try {
        console.log('[Preparing] Marking onboarding complete');
        await AsyncStorage.setItem('onboarding_complete', 'true');
        console.log('[Preparing] Navigating to main tabs');
        router.replace('/(tabs)');
      } catch (e) {
        console.log('[Preparing] AsyncStorage error:', e);
        router.replace('/(tabs)');
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [pulseScale, router, screenOpacity, screenTranslateY]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
      <Animated.View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: COLORS.accentMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          transform: [{ scale: pulseScale }],
        }}
      >
        <Compass size={36} color={COLORS.accent} strokeWidth={1.5} />
      </Animated.View>

      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Lora_700Bold',
          color: COLORS.text,
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
          color: COLORS.textSecondary,
          textAlign: 'center',
        }}
      >
        This will just take a moment.
      </Text>
    </Animated.View>
  );
}
