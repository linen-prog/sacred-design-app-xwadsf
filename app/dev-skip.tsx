import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiscoveryContext, Phase1Answers, Phase2Answers, Phase3Answers, Phase4Answers } from '@/contexts/DiscoveryContext';

const MOCK_PHASE1: Phase1Answers = {
  Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 4, Q6: 4, Q7: 4,
};

const MOCK_PHASE2: Phase2Answers = {
  P2_Q1: 5, P2_Q2: 5, P2_Q3: 5, P2_Q4: 5, P2_Q5: 2, P2_Q6: 2, P2_Q7: 2,
};

const MOCK_PHASE3: Phase3Answers = {
  P3_Q1: 5, P3_Q2: 5, P3_Q3: 5, P3_Q4: 5, P3_Q5: 5, P3_Q6: 3, P3_Q7: 3,
};

const MOCK_PHASE4: Phase4Answers = {
  P4_Q1: 3, P4_Q2: 3, P4_Q3: 3, P4_Q4: 3, P4_Q5: 3, P4_Q6: 3, P4_Q7: 3,
};

const DESTINATIONS = [
  { label: 'Skip to: Partial Reveal', route: '/partial-reveal' as const },
  { label: 'Skip to: Full Reveal', route: '/reveal' as const },
  { label: 'Skip to: My Design (tabs)', route: '/(tabs)' as const },
] as const;

export default function DevSkipScreen() {
  const router = useRouter();
  const {
    computePhase1Scores,
    computePhase2Scores,
    computePhase3Scores,
    computePhase4Scores,
    computeSacredDesign,
    phase1Scores,
    phase2Scores,
    phase3Scores,
    phase4Scores,
    sacredDesignResult,
  } = useContext(DiscoveryContext);

  const step = useRef<'idle' | 'phases' | 'sacred' | 'ready'>('idle');
  const [isReady, setIsReady] = useState(false);

  // Step 1: inject all phase answers immediately on mount
  useEffect(() => {
    if (step.current !== 'idle') return;
    step.current = 'phases';
    console.log('[DevSkip] Injecting mock phase answers');
    computePhase1Scores(MOCK_PHASE1);
    computePhase2Scores(MOCK_PHASE2);
    computePhase3Scores(MOCK_PHASE3);
    computePhase4Scores(MOCK_PHASE4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step 2: once all phase scores are available, compute sacred design
  useEffect(() => {
    if (!phase1Scores || !phase2Scores || !phase3Scores || !phase4Scores) return;
    if (step.current !== 'phases') return;
    step.current = 'sacred';
    console.log('[DevSkip] Computing sacred design');
    computeSacredDesign();
  }, [phase1Scores, phase2Scores, phase3Scores, phase4Scores, computeSacredDesign]);

  // Step 3: once result is ready, persist and show menu
  useEffect(() => {
    if (!sacredDesignResult) return;
    if (step.current !== 'sacred') return;
    step.current = 'ready';
    console.log('[DevSkip] Sacred design ready, persisting');
    const timer = setTimeout(async () => {
      try {
        await AsyncStorage.multiSet([
          ['hasCompletedQuiz', 'true'],
          ['hasSeenOnboarding', 'true'],
          ['sacredDesignResult', JSON.stringify(sacredDesignResult)],
        ]);
        console.log('[DevSkip] Persisted sacredDesignResult:', sacredDesignResult);
      } catch (e) {
        console.log('[DevSkip] AsyncStorage error:', e);
      }
      setIsReady(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [sacredDesignResult]);

  function handleNavigate(route: string) {
    console.log('[DevSkip] Navigating to', route);
    router.replace(route as Parameters<typeof router.replace>[0]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dev Skip</Text>

      {isReady ? (
        <>
          <Text style={styles.subtitle}>Sacred design computed ✓</Text>

          <View style={styles.buttonGroup}>
            {DESTINATIONS.map((dest) => (
              <Pressable
                key={dest.route}
                onPress={() => handleNavigate(dest.route)}
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                accessibilityRole="button"
                accessibilityLabel={dest.label}
              >
                <Text style={styles.buttonText}>{dest.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.preparing}>Preparing...</Text>
      )}

      <Text style={styles.devNote}>Dev only — not visible in production</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontVariant: ['small-caps'],
    color: '#C9A84C',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6DBF7E',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  preparing: {
    fontSize: 15,
    color: 'rgba(201,168,76,0.5)',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  button: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(201,168,76,0.06)',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  buttonText: {
    color: '#C9A84C',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  devNote: {
    position: 'absolute',
    bottom: 32,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
