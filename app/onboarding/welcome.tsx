import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';

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

  const headlineText = 'Know your design.\nGrow in your calling.\nWalk in it\u2014daily.';
  const subtextContent = 'A simple path to understand how you\u2019re uniquely made\u2014and begin living it.';

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingTop: 80,
          paddingBottom: 60,
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
          {/* Logo */}
          <Image
            source={require('@/assets/images/6da5f013-3a42-4811-a914-2b2cf598ca43.jpeg')}
            style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 16 }}
          />

          {/* Headline */}
          <Text
            style={{
              fontFamily: 'Lora_600SemiBold',
              fontSize: 30,
              color: '#2F3E2F',
              textAlign: 'center',
              lineHeight: 44,
              marginBottom: 24,
            }}
          >
            {headlineText}
          </Text>

          {/* Subtext */}
          <Text
            style={{
              fontSize: 17,
              color: '#5A5A5A',
              textAlign: 'center',
              lineHeight: 26,
              paddingHorizontal: 8,
              marginBottom: 52,
            }}
          >
            {subtextContent}
          </Text>

          {/* Button */}
          <Pressable
            onPress={handleBegin}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#5A7355' : '#6F8A6A',
              borderRadius: 18,
              paddingVertical: 18,
              paddingHorizontal: 32,
              width: '100%',
              alignItems: 'center',
              boxShadow: '0 4px 14px rgba(111, 138, 106, 0.30)',
            })}
            accessibilityRole="button"
            accessibilityLabel="Begin Your Discovery"
          >
            <Text
              style={{
                color: 'white',
                fontSize: 17,
                fontWeight: '600',
                letterSpacing: 0.3,
              }}
            >
              Begin Your Discovery
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
