import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          opacity,
          transform: [{ translateY }],
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontFamily: 'Lora_700Bold',
            color: COLORS.text,
            textAlign: 'center',
            letterSpacing: -0.3,
            marginBottom: 12,
          }}
        >
          Sacred Design
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            color: COLORS.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          Your daily alignment will appear here.
        </Text>
      </Animated.View>
    </View>
  );
}
