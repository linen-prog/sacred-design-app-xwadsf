import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface ScaleButtonProps {
  value: number;
  selected: boolean;
  onPress: () => void;
}

export function ScaleButton({ value, selected, onPress }: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);

  const bgColor = selected ? COLORS.primary : COLORS.surface;
  const textColor = selected ? COLORS.white : COLORS.textSecondary;
  const borderWidth = selected ? 0 : 1;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: bgColor,
          borderWidth,
          borderColor: COLORS.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={`Rate ${value}`}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: textColor,
            fontFamily: 'Inter_600SemiBold',
          }}
        >
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
