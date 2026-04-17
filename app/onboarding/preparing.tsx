import React, { useContext, useEffect, useRef } from 'react';
import { Text, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
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

    const timer = setTimeout(() => {
      console.log('[Preparing] Navigating to reveal screen');
      router.replace('/reveal');
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
      {/* logo */}
      <Animated.Image
        source={require('@/assets/images/72057605-fb00-4601-8fac-ab7091e359b9.jpeg')}
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
