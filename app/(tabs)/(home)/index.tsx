import React, { useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';

const discoveryStatus: 'none' | 'in_progress' | 'completed' = 'none';

export default function HomeScreen() {
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);

  const status: 'none' | 'in_progress' | 'completed' =
    sacredDesignResult ? 'completed' : discoveryStatus;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {/* Warm glow bloom at top */}
        <View style={styles.glowWrap} pointerEvents="none">
          <View style={styles.glow} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.headline}>Bring Your Design{'\n'}to Life</Text>
          <Text style={styles.sub}>One small step today makes it real.</Text>

          {status !== 'completed' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Begin Your Journey</Text>
              <Text style={styles.cardBody}>
                Discover how you naturally think, feel, and show up—and begin living it.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.82 }]}
                onPress={() => {
                  console.log('[HomeScreen] Begin Journey pressed — navigating to /onboarding/welcome');
                  router.push('/onboarding/welcome');
                }}
              >
                <Text style={styles.btnText}>Bring Your Design to Life</Text>
              </Pressable>
            </View>
          )}

          {status === 'completed' && (
            <View style={styles.card}>
              <Text style={styles.eyebrow}>TODAY'S ALIGNMENT</Text>
              <Text style={styles.cardTitle}>Begin Your Journey</Text>
              <Text style={styles.cardBody}>
                Discover how you naturally think, feel, and show up—and begin living it.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.82 }]}
                onPress={() => {
                  console.log('[HomeScreen] Alignment CTA pressed');
                }}
              >
                <Text style={styles.btnText}>Bring Your Design to Life</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F1E8',
  },
  root: {
    flex: 1,
    position: 'relative',
  },
  glowWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 0,
  },
  glow: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(230, 211, 163, 0.38)',
    marginTop: -80,
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 120,
    alignItems: 'center',
    zIndex: 1,
  },
  headline: {
    fontFamily: 'Lora_700Bold',
    fontSize: 34,
    lineHeight: 44,
    color: '#2F3E2F',
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(47,62,47,0.48)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    marginTop: 44,
    shadowColor: '#2F3E2F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  eyebrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#A8B5A2',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 20,
    color: '#2F3E2F',
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(47,62,47,0.58)',
    lineHeight: 22,
  },
  btn: {
    backgroundColor: '#6F8A6A',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#6F8A6A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
