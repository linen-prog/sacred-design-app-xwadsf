import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import type { LucideIcon } from 'lucide-react-native';

interface ReflectionScreenProps {
  icon: LucideIcon;
  text: string;
  buttonLabel: string;
  onContinue: () => void;
  onBack?: () => void;
}

export function ReflectionScreen({ icon: Icon, text, buttonLabel, onContinue, onBack }: ReflectionScreenProps) {
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
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: [{ translateY }],
      }}
    >
      {onBack && (
        <Pressable
          onPress={onBack}
          style={{ position: 'absolute', top: insets.top + 8, left: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#6F8A6A" />
        </Pressable>
      )}
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

      <View style={{ position: 'absolute', bottom: insets.bottom + 32, left: 24, right: 24 }}>
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
    </Animated.View>
  );
}
