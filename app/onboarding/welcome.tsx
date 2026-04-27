import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { Compass } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const router = useRouter();
  console.log('[Welcome] Screen mounted');
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

  async function handleBegin() {
    console.log('[Welcome] Begin Your Discovery pressed');
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      console.log('[Welcome] hasSeenOnboarding set to true');
    } catch (e) {
      console.log('[Welcome] AsyncStorage error:', e);
    }
    router.push('/onboarding/intro');
  }

  const headlineText = 'Know your design.\nGrow in your calling.\nWalk in it\u2014daily.';
  const subtextContent = 'A simple path to understand how you\u2019re uniquely made\u2014and begin living it.';

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      {/* Change 2 — background radial glow */}
      <View
        style={{
          position: 'absolute',
          top: '10%',
          alignSelf: 'center',
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: 'rgba(201,168,76,0.07)',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingTop: 40,
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
          <View style={styles.logoContainer}>
            {/* Change 1 — gold glow bg */}
            <View style={styles.glowBg} />
            <View style={styles.outerOrb} />
            <View style={styles.middleOrb} />
            <View style={styles.innerOrb} />
            <Compass size={34} color="#B8922A" strokeWidth={1.5} />
          </View>

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
              marginBottom: 28,
            }}
          >
            {subtextContent}
          </Text>

          {/* Change 3 — CTA support text */}
          <Text
            style={{
              fontFamily: 'Lora_600SemiBold',
              fontSize: 15,
              color: '#3D3530',
              textAlign: 'center',
              marginBottom: 6,
              letterSpacing: 0.1,
            }}
          >
            Start with a few questions
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: 'rgba(61,53,48,0.68)',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 19,
            }}
          >
            It only takes a few minutes to begin.
          </Text>

          {/* Button */}
          <Pressable
            onPress={handleBegin}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#4A6647' : '#5C7A57',
              borderRadius: 18,
              paddingVertical: 18,
              paddingHorizontal: 32,
              width: '100%',
              alignItems: 'center',
              boxShadow: '0 5px 18px rgba(80, 110, 75, 0.42)',
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

          {__DEV__ && (
            <Pressable
              onPress={() => {
                console.log('[Welcome] Dev skip pressed');
                router.push('/dev-skip');
              }}
              style={styles.devSkipButton}
              accessibilityRole="button"
              accessibilityLabel="Dev Skip"
            >
              <Text style={styles.devSkipText}>Dev Skip →</Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 72,
  },
  glowBg: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(201,168,76,0.10)',
  },
  outerOrb: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  middleOrb: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(201,168,76,0.13)',
  },
  innerOrb: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(201,168,76,0.20)',
  },
  devSkipButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 4,
  },
  devSkipText: {
    fontSize: 11,
    color: 'rgba(47,62,47,0.3)',
  },
});
