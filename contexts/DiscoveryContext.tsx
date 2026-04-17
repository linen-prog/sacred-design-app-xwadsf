import React, { createContext, useState, useCallback, useMemo } from 'react';

export interface Phase1Scores {
  social_energy_score: number;
  emotional_score: number;
  drive_score: number;
  openness_score: number;
  stress_score: number;
}

export interface Phase2Scores {
  peacemaker_score: number;
  leader_score: number;
  deep_feeler_score: number;
  steward_score: number;
  light_bearer_score: number;
  truth_seeker_score: number;
  justice_carrier_score: number;
}

export interface Phase3Scores {
  apostle_score: number;
  prophet_score: number;
  evangelist_score: number;
  shepherd_score: number;
  teacher_score: number;
}

export interface Phase4Scores {
  avoidant_score: number;
  anxious_score: number;
  overactive_score: number;
  grounded_score: number;
}

interface DiscoveryContextType {
  answers: Record<string, number>;
  setAnswer: (id: string, value: number) => void;
  resetAnswers: () => void;
  phase1Scores: Phase1Scores | null;
  computePhase1Scores: () => void;
  phase2Scores: Phase2Scores | null;
  computePhase2Scores: () => void;
  phase3Scores: Phase3Scores | null;
  computePhase3Scores: () => void;
  phase4Scores: Phase4Scores | null;
  computePhase4Scores: () => void;
}

export const DiscoveryContext = createContext<DiscoveryContextType>({
  answers: {},
  setAnswer: () => {},
  resetAnswers: () => {},
  phase1Scores: null,
  computePhase1Scores: () => {},
  phase2Scores: null,
  computePhase2Scores: () => {},
  phase3Scores: null,
  computePhase3Scores: () => {},
  phase4Scores: null,
  computePhase4Scores: () => {},
});

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase1Scores, setPhase1Scores] = useState<Phase1Scores | null>(null);
  const [phase2Scores, setPhase2Scores] = useState<Phase2Scores | null>(null);
  const [phase3Scores, setPhase3Scores] = useState<Phase3Scores | null>(null);
  const [phase4Scores, setPhase4Scores] = useState<Phase4Scores | null>(null);

  const setAnswer = useCallback((id: string, value: number) => {
    console.log(`[DiscoveryContext] setAnswer: ${id} = ${value}`);
    setAnswers(prev => ({ ...prev, [id]: value }));
  }, []);

  const resetAnswers = useCallback(() => {
    console.log('[DiscoveryContext] resetAnswers');
    setAnswers({});
    setPhase1Scores(null);
    setPhase2Scores(null);
    setPhase3Scores(null);
    setPhase4Scores(null);
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

  const computePhase2Scores = useCallback(() => {
    console.log('[DiscoveryContext] computePhase2Scores called');
    setAnswers(current => {
      const Q1  = current['P2_Q1']  ?? 0;
      const Q2  = current['P2_Q2']  ?? 0;
      const Q3  = current['P2_Q3']  ?? 0;
      const Q4  = current['P2_Q4']  ?? 0;
      const Q5  = current['P2_Q5']  ?? 0;
      const Q6  = current['P2_Q6']  ?? 0;
      const Q7  = current['P2_Q7']  ?? 0;
      const Q8  = current['P2_Q8']  ?? 0;
      const Q9  = current['P2_Q9']  ?? 0;
      const Q10 = current['P2_Q10'] ?? 0;
      const Q11 = current['P2_Q11'] ?? 0;
      const Q12 = current['P2_Q12'] ?? 0;

      const Peacemaker     = Q1 + Q8;
      const Leader         = Q2 + (Q9 * 0.5);
      const DeepFeeler     = Q3;
      const Steward        = Q4 + (Q9 * 0.5);
      const LightBearer    = Q5 + (6 - Q10);
      const TruthSeeker    = Q6 + (6 - Q11);
      const JusticeCarrier = Q7 + Q12;

      const scores: Phase2Scores = {
        peacemaker_score:     (Peacemaker     / 10)  * 10,
        leader_score:         (Leader         / 7.5) * 10,
        deep_feeler_score:    (DeepFeeler     / 5)   * 10,
        steward_score:        (Steward        / 7.5) * 10,
        light_bearer_score:   (LightBearer    / 10)  * 10,
        truth_seeker_score:   (TruthSeeker    / 10)  * 10,
        justice_carrier_score:(JusticeCarrier / 10)  * 10,
      };

      console.log('[DiscoveryContext] phase2Scores computed:', scores);
      setPhase2Scores(scores);
      return current;
    });
  }, []);

  const computePhase3Scores = useCallback(() => {
    console.log('[DiscoveryContext] computePhase3Scores called');
    setAnswers(current => {
      const Q1  = current['P3_Q1']  ?? 0;
      const Q2  = current['P3_Q2']  ?? 0;
      const Q3  = current['P3_Q3']  ?? 0;
      const Q4  = current['P3_Q4']  ?? 0;
      const Q5  = current['P3_Q5']  ?? 0;
      const Q6  = current['P3_Q6']  ?? 0;
      const Q7  = current['P3_Q7']  ?? 0;
      const Q8  = current['P3_Q8']  ?? 0;
      const Q9  = current['P3_Q9']  ?? 0;
      const Q10 = current['P3_Q10'] ?? 0;

      const Apostle    = Q1 + Q6;
      const Prophet    = Q2 + Q8;
      const Evangelist = Q3 + Q9;
      const Shepherd   = Q4 + Q7;
      const Teacher    = Q5 + Q10;

      const scores: Phase3Scores = {
        apostle_score:    (Apostle    / 10) * 10,
        prophet_score:    (Prophet    / 10) * 10,
        evangelist_score: (Evangelist / 10) * 10,
        shepherd_score:   (Shepherd   / 10) * 10,
        teacher_score:    (Teacher    / 10) * 10,
      };

      console.log('[DiscoveryContext] phase3Scores computed:', scores);
      setPhase3Scores(scores);
      return current;
    });
  }, []);

  const computePhase4Scores = useCallback(() => {
    console.log('[DiscoveryContext] computePhase4Scores called');
    setAnswers(current => {
      const Q1 = current['P4_Q1'] ?? 0;
      const Q2 = current['P4_Q2'] ?? 0;
      const Q3 = current['P4_Q3'] ?? 0;
      const Q4 = current['P4_Q4'] ?? 0;
      const Q5 = current['P4_Q5'] ?? 0;
      const Q6 = current['P4_Q6'] ?? 0;
      const Q7 = current['P4_Q7'] ?? 0;
      const Q8 = current['P4_Q8'] ?? 0;

      const Avoidant   = Q1 + Q4;              // max = 10
      const Anxious    = Q2 + Q7;              // max = 10
      const Overactive = Q5 + Q8;              // max = 10
      const Grounded   = (6 - Q3) + (6 - Q6); // max = 10

      const scores: Phase4Scores = {
        avoidant_score:   (Avoidant   / 10) * 10,
        anxious_score:    (Anxious    / 10) * 10,
        overactive_score: (Overactive / 10) * 10,
        grounded_score:   (Grounded   / 10) * 10,
      };

      console.log('[DiscoveryContext] phase4Scores computed:', scores);
      setPhase4Scores(scores);
      return current;
    });
  }, []);

  const value = useMemo(() => ({
    answers,
    setAnswer,
    resetAnswers,
    phase1Scores,
    computePhase1Scores,
    phase2Scores,
    computePhase2Scores,
    phase3Scores,
    computePhase3Scores,
    phase4Scores,
    computePhase4Scores,
  }), [answers, setAnswer, resetAnswers, phase1Scores, computePhase1Scores, phase2Scores, computePhase2Scores, phase3Scores, computePhase3Scores, phase4Scores, computePhase4Scores]);

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}
