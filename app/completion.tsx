import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const COMPLETION_BG = require('../assets/images/27a782a0-e03d-4fe1-8cc7-0609fb7761ec.jpeg');

const DAY_MESSAGES = [
  'Each time you do this, it becomes easier.',
  'What feels unfamiliar will become natural.',
  "You're building something that lasts.",
];

export default function CompletionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);
  const { source } = useLocalSearchParams<{ source?: string }>();

  const isReflectionSaved = source === 'reflection_saved';

  const dayIndex = new Date().getDay() % 3;
  const markDoneRotatingMessage = DAY_MESSAGES[dayIndex];
  const rotatingMessage = isReflectionSaved
    ? 'Your words matter. Your journey is unfolding.'
    : markDoneRotatingMessage;

  const primaryMessage = isReflectionSaved
    ? 'Your reflection has been saved.'
    : "You're strengthening a new pattern.";

  const supportingLine = isReflectionSaved
    ? 'Every reflection you write becomes part of your sacred journey — a record of your growth over time.'
    : 'This is how your design becomes part of your life.';

  const somaticCue = isReflectionSaved
    ? 'Take a breath and honour the insight you just captured.'
    : 'Take one slow breath and let this moment land.';

  const blendName = sacredDesignResult?.blend_name ?? null;
  const identityLine = blendName ? `This is ${blendName} in motion.` : null;

  // Glow pulse animation
  const glowScale = useRef(new Animated.Value(1)).current;

  // Staggered fade-in animations
  const fadeAnim0 = useRef(new Animated.Value(0)).current;
  const fadeAnim1 = useRef(new Animated.Value(0)).current;
  const fadeAnim2 = useRef(new Animated.Value(0)).current;
  const fadeAnim3 = useRef(new Animated.Value(0)).current;
  const fadeAnim4 = useRef(new Animated.Value(0)).current;
  const fadeAnimButtons = useRef(new Animated.Value(0)).current;

  // Continue button press opacity
  const continueOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Glow pulse loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // Staggered text fade-ins
    const delays = [200, 400, 600, 800, 1000];
    const anims = [fadeAnim0, fadeAnim1, fadeAnim2, fadeAnim3, fadeAnim4];
    anims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: delays[i],
        useNativeDriver: true,
      }).start();
    });

    // Buttons fade in at 1200ms
    Animated.timing(fadeAnimButtons, {
      toValue: 1,
      duration: 300,
      delay: 1200,
      useNativeDriver: true,
    }).start();

    return () => glowLoop.stop();
  }, [glowScale, fadeAnim0, fadeAnim1, fadeAnim2, fadeAnim3, fadeAnim4, fadeAnimButtons]);

  const handleContinue = () => {
    console.log('[CompletionScreen] "Continue" pressed — source:', source ?? 'mark_done');
    Animated.timing(continueOpacity, {
      toValue: 0.6,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)');
    });
  };

  const handleReflect = () => {
    console.log('[CompletionScreen] "Reflect on this moment" pressed');
    router.replace('/(tabs)');
  };

  return (
    <ImageBackground
      source={COMPLETION_BG}
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
      resizeMode="cover"
      imageStyle={{ opacity: 0.72 }}
    >
      {/* Glow circle */}
      <Animated.View
        style={[
          styles.glow,
          { transform: [{ scale: glowScale }] },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.primaryMessage, { opacity: fadeAnim0 }]}>
          {primaryMessage}
        </Animated.Text>

        <Animated.Text style={[styles.supportingLine, { opacity: fadeAnim1 }]}>
          {supportingLine}
        </Animated.Text>

        <Animated.Text style={[styles.rotatingMessage, { opacity: fadeAnim2 }]}>
          {rotatingMessage}
        </Animated.Text>

        {identityLine !== null && (
          <Animated.Text style={[styles.identityLine, { opacity: fadeAnim3 }]}>
            {identityLine}
          </Animated.Text>
        )}

        <Animated.Text style={[styles.somaticCue, { opacity: fadeAnim4 }]}>
          {somaticCue}
        </Animated.Text>
      </View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnimButtons }]}>
        <Animated.View style={{ opacity: continueOpacity }}>
          <AnimatedPressable onPress={handleContinue} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </AnimatedPressable>
        </Animated.View>

        {!isReflectionSaved && (
          <AnimatedPressable onPress={handleReflect} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Reflect on this moment</Text>
          </AnimatedPressable>
        )}
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(246,241,232,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E6D3A3',
    opacity: 0.35,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    backgroundColor: 'transparent',
  },
  primaryMessage: {
    fontFamily: 'Lora_700Bold',
    fontSize: 24,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  supportingLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  rotatingMessage: {
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
  },
  identityLine: {
    fontFamily: 'Lora_400Regular',
    fontSize: 18,
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  somaticCue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 40,
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
