import React, { useRef, useCallback, useEffect } from 'react';
import { Animated, Pressable, Text } from 'react-native';

interface ScaleButtonProps {
  value: number;
  selected: boolean;
  onPress: () => void;
}

export function ScaleButton({ value, selected, onPress }: ScaleButtonProps) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const selectScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(selectScale, {
      toValue: selected ? 1.08 : 1.0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [selected, selectScale]);

  const animateIn = useCallback(() => {
    Animated.spring(pressScale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [pressScale]);

  const animateOut = useCallback(() => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [pressScale]);

  const bgColor = selected ? '#6F8A6A' : '#FFFFFF';
  const borderWidth = selected ? 0 : 1;
  const textColor = selected ? '#FFFFFF' : '#2F3E2F';
  const textOpacity = selected ? 1 : 0.6;

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }, { scale: selectScale }] }}>
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
          borderColor: 'rgba(47,62,47,0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityRole="button"
        accessibilityLabel={`Rate ${value}`}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Inter_600SemiBold',
            color: textColor,
            opacity: textOpacity,
          }}
        >
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
