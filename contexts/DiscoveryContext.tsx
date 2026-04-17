import React, { createContext, useState, useCallback, useMemo } from 'react';

export interface Phase1Scores {
  social_energy_score: number;
  emotional_score: number;
  drive_score: number;
  openness_score: number;
  stress_score: number;
}

interface DiscoveryContextType {
  answers: Record<string, number>;
  setAnswer: (id: string, value: number) => void;
  resetAnswers: () => void;
  phase1Scores: Phase1Scores | null;
  computePhase1Scores: () => void;
}

export const DiscoveryContext = createContext<DiscoveryContextType>({
  answers: {},
  setAnswer: () => {},
  resetAnswers: () => {},
  phase1Scores: null,
  computePhase1Scores: () => {},
});

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase1Scores, setPhase1Scores] = useState<Phase1Scores | null>(null);

  const setAnswer = useCallback((id: string, value: number) => {
    console.log(`[DiscoveryContext] setAnswer: ${id} = ${value}`);
    setAnswers(prev => ({ ...prev, [id]: value }));
  }, []);

  const resetAnswers = useCallback(() => {
    console.log('[DiscoveryContext] resetAnswers');
    setAnswers({});
    setPhase1Scores(null);
  }, []);

  const computePhase1Scores = useCallback(() => {
    console.log('[DiscoveryContext] computePhase1Scores called');
    setAnswers(current => {
      const Q1 = current['Q1'] ?? 0;
      const Q2 = current['Q2'] ?? 0;
      const Q3 = current['Q3'] ?? 0;
      const Q4 = current['Q4'] ?? 0;
      const Q5 = current['Q5'] ?? 0;
      const Q6 = current['Q6'] ?? 0;
      const Q7 = current['Q7'] ?? 0;
      const Q8 = current['Q8'] ?? 0;
      const Q9 = current['Q9'] ?? 0;
      const Q10 = current['Q10'] ?? 0;

      const SocialEnergy = Q1 + (6 - Q2);
      const EmotionalAttunement = Q3 + Q9;
      const Drive = Q4 + Q8 + (Q7 * 0.5);
      const Openness = Q5 + Q10;
      const Stress = Q6;

      const scores: Phase1Scores = {
        social_energy_score: (SocialEnergy / 10) * 10,
        emotional_score: (EmotionalAttunement / 10) * 10,
        drive_score: (Drive / 12) * 10,
        openness_score: (Openness / 10) * 10,
        stress_score: (Stress / 5) * 10,
      };

      console.log('[DiscoveryContext] phase1Scores computed:', scores);
      setPhase1Scores(scores);
      return current;
    });
  }, []);

  const value = useMemo(() => ({
    answers,
    setAnswer,
    resetAnswers,
    phase1Scores,
    computePhase1Scores,
  }), [answers, setAnswer, resetAnswers, phase1Scores, computePhase1Scores]);

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}
