import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { LucideIcon } from 'lucide-react-native';

const QUIZ_BG = require('../assets/images/6203a26c-7e60-4d20-91a8-e4ec578007fc.jpeg');

interface ReflectionScreenProps {
  icon: LucideIcon;
  text: string;
  buttonLabel: string;
  onContinue: () => void;
}

export function ReflectionScreen({ icon: Icon, text, buttonLabel, onContinue }: ReflectionScreenProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <ImageBackground
      source={QUIZ_BG}
      style={{ flex: 1, backgroundColor: COLORS.background }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.55 }}
    >
      {/* Animated content area */}
      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: COLORS.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <Icon size={40} color={COLORS.accent} strokeWidth={1.5} />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontFamily: 'Lora_700Bold',
            color: COLORS.text,
            textAlign: 'center',
            lineHeight: 34,
            maxWidth: 300,
            letterSpacing: -0.2,
          }}
        >
          {text}
        </Text>
      </Animated.View>

      {/* Bottom button — outside Animated.View, in normal flow */}
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}>
        <AnimatedPressable
          onPress={onContinue}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text
            style={{
              color: COLORS.white,
              fontSize: 16,
              fontFamily: 'Inter_600SemiBold',
              fontWeight: '600',
            }}
          >
            {buttonLabel}
          </Text>
        </AnimatedPressable>
      </View>
    </ImageBackground>
  );
}
