import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';

const MOCK_ANSWERS: Record<string, number> = {
  // Phase 1: Q1–Q10, all 4
  Q1: 4, Q2: 4, Q3: 4, Q4: 4, Q5: 4,
  Q6: 4, Q7: 4, Q8: 4, Q9: 4, Q10: 4,
  // Phase 2: P2_Q1–P2_Q12
  P2_Q1: 5, P2_Q2: 5, P2_Q3: 5, P2_Q4: 5,
  P2_Q5: 2, P2_Q6: 2, P2_Q7: 2, P2_Q8: 2,
  P2_Q9: 4, P2_Q10: 4, P2_Q11: 4, P2_Q12: 4,
  // Phase 3: P3_Q1–P3_Q10
  P3_Q1: 5, P3_Q2: 5, P3_Q3: 5, P3_Q4: 5, P3_Q5: 5,
  P3_Q6: 3, P3_Q7: 3, P3_Q8: 3, P3_Q9: 3, P3_Q10: 3,
  // Phase 4: P4_Q1–P4_Q8, all 3
  P4_Q1: 3, P4_Q2: 3, P4_Q3: 3, P4_Q4: 3,
  P4_Q5: 3, P4_Q6: 3, P4_Q7: 3, P4_Q8: 3,
};

export default function DevSkipScreen() {
  const router = useRouter();
  const {
    setAnswer,
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

  const step = useRef<'idle' | 'answers' | 'phases' | 'sacred' | 'navigate'>('idle');

  // Step 1: inject mock answers on mount
  useEffect(() => {
    if (step.current !== 'idle') return;
    step.current = 'answers';
    console.log('[DevSkip] Injecting mock answers');
    Object.entries(MOCK_ANSWERS).forEach(([id, value]) => setAnswer(id, value));
  }, [setAnswer]);

  // Step 2: once answers are set, compute all phase scores
  useEffect(() => {
    if (step.current !== 'answers') return;
    step.current = 'phases';
    console.log('[DevSkip] Computing phase scores');
    computePhase1Scores();
    computePhase2Scores();
    computePhase3Scores();
    computePhase4Scores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.keys(MOCK_ANSWERS).length]);

  // Step 3: once all phase scores are available, compute sacred design
  useEffect(() => {
    if (!phase1Scores || !phase2Scores || !phase3Scores || !phase4Scores) return;
    if (step.current !== 'phases') return;
    step.current = 'sacred';
    console.log('[DevSkip] Computing sacred design');
    computeSacredDesign();
  }, [phase1Scores, phase2Scores, phase3Scores, phase4Scores, computeSacredDesign]);

  // Step 4: once result is ready, persist and navigate to tabs
  useEffect(() => {
    if (!sacredDesignResult) return;
    if (step.current !== 'sacred') return;
    step.current = 'navigate';
    console.log('[DevSkip] Sacred design ready, persisting and navigating to tabs');
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
      router.replace('/(tabs)');
    }, 300);
    return () => clearTimeout(timer);
  }, [sacredDesignResult, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F1E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(47,62,47,0.5)',
    letterSpacing: 0.3,
  },
});
