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
            <View style={styles.outerOrb} />
            <View style={styles.middleOrb} />
            <View style={styles.innerOrb} />
            <Compass size={32} color="#6F8A6A" strokeWidth={1.5} />
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

          {__DEV__ && (
            <Pressable
              onPress={() => {
                console.log('[Welcome] Dev skip pressed');
                router.push('/dev-skip');
              }}
              style={{ marginTop: 24, padding: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Skip quiz (dev only)"
            >
              <Text style={{ fontSize: 12, color: 'rgba(47,62,47,0.35)', textAlign: 'center' }}>
                ⚡ Skip quiz (dev only)
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 80 },
  outerOrb: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(111, 138, 106, 0.08)' },
  middleOrb: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(111, 138, 106, 0.12)' },
  innerOrb: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(111, 138, 106, 0.18)' },
});
