import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  const step = useRef<'idle' | 'phases' | 'sacred' | 'navigate'>('idle');

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

  // Step 3: once result is ready, persist and navigate to tabs
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
