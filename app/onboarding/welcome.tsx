import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { AnimatedPressable } from '@/components/AnimatedPressable';

export default function WelcomeScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_600SemiBold });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  if (!fontsLoaded) return null;

  function handleBegin() {
    console.log('[Welcome] Begin Your Discovery pressed');
    router.push('/onboarding/intro');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingVertical: 60,
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            alignItems: 'center',
            opacity,
            transform: [{ translateY }],
          }}
        >
          {/* Icon area */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer glow */}
            <View
              style={{
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(230, 211, 163, 0.10)',
              }}
            />
            {/* Inner circle */}
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: 'rgba(230, 211, 163, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={42} color="#8A7A5A" strokeWidth={1} />
            </View>
          </View>

          {/* 40px spacer */}
          <View style={{ height: 40 }} />

          {/* Headline */}
          <Text
            style={{
              fontFamily: 'Lora_600SemiBold',
              fontSize: 30,
              color: '#2F3E2F',
              textAlign: 'center',
              lineHeight: 42,
            }}
          >
            {'Know your design.\nGrow in your calling.\nWalk in it\u2014daily.'}
          </Text>

          {/* 24px spacer */}
          <View style={{ height: 24 }} />

          {/* Subtext */}
          <Text
            style={{
              fontSize: 17,
              color: '#5A5A5A',
              textAlign: 'center',
              lineHeight: 26,
              paddingHorizontal: 28,
            }}
          >
            {
              'A simple path to understand how you\u2019re uniquely made\u2014and begin living it.'
            }
          </Text>

          {/* 48px spacer */}
          <View style={{ height: 48 }} />

          {/* Button */}
          <AnimatedPressable
            onPress={handleBegin}
            style={{
              backgroundColor: '#6F8A6A',
              borderRadius: 18,
              paddingVertical: 18,
              paddingHorizontal: 32,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(111, 138, 106, 0.25)',
            }}
            accessibilityRole="button"
            accessibilityLabel="Begin Your Discovery"
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Begin Your Discovery
            </Text>
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
