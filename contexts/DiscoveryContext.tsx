import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ArchetypeName =
  | 'Peacemaker'
  | 'Courageous Leader'
  | 'Deep Feeler'
  | 'Faithful Steward'
  | 'Light Bearer'
  | 'Truth Seeker'
  | 'Justice Carrier';

export interface ArchetypeWeightScores {
  Peacemaker: number;
  'Courageous Leader': number;
  'Deep Feeler': number;
  'Faithful Steward': number;
  'Light Bearer': number;
  'Truth Seeker': number;
  'Justice Carrier': number;
}

export interface SacredDesignResult {
  primary_archetype: ArchetypeName;
  secondary_archetype: ArchetypeName;
  archetypeScores: ArchetypeWeightScores;
  blend_name: string;
}

export interface Phase4Computed {
  anxious_score: number;
  avoidant_score: number;
  overactive_score: number;
  grounded_score: number;
}

// Explicit blend name map — order matters (primary first)
const BLEND_NAME_MAP: Partial<Record<string, string>> = {
  'Truth Seeker|Light Bearer':          'The Wayfinder',
  'Truth Seeker|Peacemaker':            'The Grounded Voice',
  'Truth Seeker|Faithful Steward':      'The Wise Builder',
  'Truth Seeker|Courageous Leader':     'The Strategic Guide',
  'Light Bearer|Peacemaker':            'The Gentle Light',
  'Light Bearer|Courageous Leader':     'The Inspiring Leader',
  'Light Bearer|Faithful Steward':      'The Steady Encourager',
  'Peacemaker|Faithful Steward':        'The Steady Presence',
  'Peacemaker|Deep Feeler':             'The Compassionate Heart',
  'Deep Feeler|Light Bearer':           'The Expressive Heart',
  'Deep Feeler|Truth Seeker':           'The Reflective Soul',
  'Courageous Leader|Faithful Steward': 'The Grounded Leader',
  'Courageous Leader|Justice Carrier':  'The Bold Advocate',
  'Justice Carrier|Truth Seeker':       'The Disciplined Voice',
  'Justice Carrier|Light Bearer':       'The Courageous Light',
};

// Fallback trait words per archetype (used when combination is not in the map)
const ARCHETYPE_TRAIT_WORD: Record<ArchetypeName, string> = {
  'Peacemaker':        'Peaceful',
  'Courageous Leader': 'Courageous',
  'Deep Feeler':       'Empathic',
  'Faithful Steward':  'Faithful',
  'Light Bearer':      'Luminous',
  'Truth Seeker':      'Discerning',
  'Justice Carrier':   'Steadfast',
};

const ARCHETYPE_EXPRESSION_WORD: Record<ArchetypeName, string> = {
  'Peacemaker':        'Keeper',
  'Courageous Leader': 'Leader',
  'Deep Feeler':       'Heart',
  'Faithful Steward':  'Builder',
  'Light Bearer':      'Guide',
  'Truth Seeker':      'Voice',
  'Justice Carrier':   'Advocate',
};

function getBlendName(primary: ArchetypeName, secondary: ArchetypeName): string {
  const key = `${primary}|${secondary}`;
  if (BLEND_NAME_MAP[key]) {
    return BLEND_NAME_MAP[key]!;
  }
  const traitWord = ARCHETYPE_TRAIT_WORD[primary];
  const expressionWord = ARCHETYPE_EXPRESSION_WORD[secondary];
  return `The ${traitWord} ${expressionWord}`;
}

// New phase answer interfaces — raw 1–5 answers per question
export interface Phase1Answers {
  Q1: number; Q2: number; Q3: number; Q4: number;
  Q5: number; Q6: number; Q7: number;
}

export interface Phase2Answers {
  P2_Q1: number; P2_Q2: number; P2_Q3: number; P2_Q4: number;
  P2_Q5: number; P2_Q6: number; P2_Q7: number;
}

export interface Phase3Answers {
  P3_Q1: number; P3_Q2: number; P3_Q3: number; P3_Q4: number;
  P3_Q5: number; P3_Q6: number; P3_Q7: number;
}

export interface Phase4Answers {
  P4_Q1: number; P4_Q2: number; P4_Q3: number; P4_Q4: number;
  P4_Q5: number; P4_Q6: number; P4_Q7: number;
}

// Keep legacy type aliases so any external code referencing Phase1Scores etc. still compiles
export type Phase1Scores = Phase1Answers;
export type Phase2Scores = Phase2Answers;
export type Phase3Scores = Phase3Answers;
export type Phase4Scores = Phase4Answers;

const MIN_GAP = 1.5;

interface DiscoveryContextType {
  answers: Record<string, number>;
  setAnswer: (id: string, value: number) => void;
  resetAnswers: () => void;
  phase1Scores: Phase1Answers | null;
  computePhase1Scores: (answers: Phase1Answers) => void;
  phase2Scores: Phase2Answers | null;
  computePhase2Scores: (answers: Phase2Answers) => void;
  phase3Scores: Phase3Answers | null;
  computePhase3Scores: (answers: Phase3Answers) => void;
  phase4Scores: Phase4Answers | null;
  computePhase4Scores: (answers: Phase4Answers) => void;
  phase4Computed: Phase4Computed | null;
  sacredDesignResult: SacredDesignResult | null;
  computeSacredDesign: () => void;
  clearSacredDesign: () => void;
  quizCompleted: boolean;
  restoreFromBackend: (data: { primary_archetype: string; secondary_archetype: string; blend_name: string; scores: ArchetypeWeightScores }) => void;
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
  phase4Computed: null,
  sacredDesignResult: null,
  computeSacredDesign: () => {},
  clearSacredDesign: () => {},
  quizCompleted: false,
  restoreFromBackend: () => {},
});

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase1Scores, setPhase1Scores] = useState<Phase1Answers | null>(null);
  const [phase2Scores, setPhase2Scores] = useState<Phase2Answers | null>(null);
  const [phase3Scores, setPhase3Scores] = useState<Phase3Answers | null>(null);
  const [phase4Scores, setPhase4Scores] = useState<Phase4Answers | null>(null);
  const [phase4Computed, setPhase4Computed] = useState<Phase4Computed | null>(null);
  const [sacredDesignResult, setSacredDesignResult] = useState<SacredDesignResult | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Restore persisted result on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('sacredDesignResult'),
      AsyncStorage.getItem('phase4Scores'),
      AsyncStorage.getItem('phase4Computed'),
      AsyncStorage.getItem('quizCompleted'),
    ]).then(([storedResult, storedPhase4, storedPhase4Computed, storedQuizCompleted]) => {
      if (storedResult) {
        try {
          const parsed = JSON.parse(storedResult);
          setSacredDesignResult(parsed);
          console.log('[DiscoveryContext] Restored sacredDesignResult from storage:', parsed);
        } catch (e) {
          console.log('[DiscoveryContext] Failed to parse stored sacredDesignResult:', e);
        }
      }
      if (storedPhase4) {
        try {
          setPhase4Scores(JSON.parse(storedPhase4));
          console.log('[DiscoveryContext] Restored phase4Scores from storage');
        } catch (e) {
          console.log('[DiscoveryContext] Failed to parse stored phase4Scores:', e);
        }
      }
      if (storedPhase4Computed) {
        try {
          setPhase4Computed(JSON.parse(storedPhase4Computed));
          console.log('[DiscoveryContext] Restored phase4Computed from storage');
        } catch (e) {
          console.log('[DiscoveryContext] Failed to parse stored phase4Computed:', e);
        }
      }
      if (storedQuizCompleted === 'true') {
        setQuizCompleted(true);
        console.log('[DiscoveryContext] Restored quizCompleted=true from storage');
      }
    });
  }, []);

  // Persist phase4Scores whenever it changes
  useEffect(() => {
    if (phase4Scores) {
      AsyncStorage.setItem('phase4Scores', JSON.stringify(phase4Scores)).catch(() => {});
    }
  }, [phase4Scores]);

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
    setPhase4Computed(null);
    setSacredDesignResult(null);
    setQuizCompleted(false);
    AsyncStorage.multiRemove(['sacredDesignResult', 'phase4Scores', 'phase4Computed', 'quizCompleted']).catch(() => {});
  }, []);

  const clearSacredDesign = useCallback(() => {
    console.log('[DiscoveryContext] clearSacredDesign — clearing result and quiz flags');
    setSacredDesignResult(null);
    setPhase4Computed(null);
    setQuizCompleted(false);
    AsyncStorage.multiRemove(['sacredDesignResult', 'phase4Scores', 'phase4Computed', 'quizCompleted', 'hasCompletedQuiz', 'hasSeenOnboarding']).catch(() => {});
  }, []);

  // Each computePhaseNScores just stores the raw answers — no computation yet
  const computePhase1Scores = useCallback((phaseAnswers: Phase1Answers) => {
    console.log('[DiscoveryContext] computePhase1Scores — storing answers:', phaseAnswers);
    setPhase1Scores(phaseAnswers);
    setAnswers(prev => ({ ...prev, ...phaseAnswers }));
  }, []);

  const computePhase2Scores = useCallback((phaseAnswers: Phase2Answers) => {
    console.log('[DiscoveryContext] computePhase2Scores — storing answers:', phaseAnswers);
    setPhase2Scores(phaseAnswers);
    setAnswers(prev => ({ ...prev, ...phaseAnswers }));
  }, []);

  const computePhase3Scores = useCallback((phaseAnswers: Phase3Answers) => {
    console.log('[DiscoveryContext] computePhase3Scores — storing answers:', phaseAnswers);
    setPhase3Scores(phaseAnswers);
    setAnswers(prev => ({ ...prev, ...phaseAnswers }));
  }, []);

  const computePhase4Scores = useCallback((phaseAnswers: Phase4Answers) => {
    console.log('[DiscoveryContext] computePhase4Scores — storing answers:', phaseAnswers);
    setPhase4Scores(phaseAnswers);
    setAnswers(prev => ({ ...prev, ...phaseAnswers }));
  }, []);

  // All archetype computation happens here from stored answers
  const computeSacredDesign = useCallback(() => {
    console.log('[DiscoveryContext] computeSacredDesign called');

    const p1 = phase1Scores;
    const p2 = phase2Scores;
    const p3 = phase3Scores;
    const p4 = phase4Scores;

    if (!p1 || !p2 || !p3 || !p4) {
      console.log('[DiscoveryContext] computeSacredDesign: missing phase answers, aborting');
      return;
    }

    // Per-archetype raw score = sum of 4 answers (one per phase), range 4–20
    // Normalized to 0–10: (rawScore - 4) / 16 * 10
    function normalize(raw: number): number {
      return ((raw - 4) / 16) * 10;
    }

    const peacemakerRaw      = p1.Q1    + p2.P2_Q1 + p3.P3_Q1 + p4.P4_Q1;
    const leaderRaw          = p1.Q2    + p2.P2_Q2 + p3.P3_Q2 + p4.P4_Q2;
    const deepFeelerRaw      = p1.Q3    + p2.P2_Q3 + p3.P3_Q3 + p4.P4_Q3;
    const stewardRaw         = p1.Q4    + p2.P2_Q4 + p3.P3_Q4 + p4.P4_Q4;
    const lightBearerRaw     = p1.Q5    + p2.P2_Q5 + p3.P3_Q5 + p4.P4_Q5;
    const truthSeekerRaw     = p1.Q6    + p2.P2_Q6 + p3.P3_Q6 + p4.P4_Q6;
    const justiceCarrierRaw  = p1.Q7    + p2.P2_Q7 + p3.P3_Q7 + p4.P4_Q7;

    console.log('[DiscoveryContext] raw scores:', {
      Peacemaker: peacemakerRaw,
      'Courageous Leader': leaderRaw,
      'Deep Feeler': deepFeelerRaw,
      'Faithful Steward': stewardRaw,
      'Light Bearer': lightBearerRaw,
      'Truth Seeker': truthSeekerRaw,
      'Justice Carrier': justiceCarrierRaw,
    });

    const archetypeScores: ArchetypeWeightScores = {
      'Peacemaker':        normalize(peacemakerRaw),
      'Courageous Leader': normalize(leaderRaw),
      'Deep Feeler':       normalize(deepFeelerRaw),
      'Faithful Steward':  normalize(stewardRaw),
      'Light Bearer':      normalize(lightBearerRaw),
      'Truth Seeker':      normalize(truthSeekerRaw),
      'Justice Carrier':   normalize(justiceCarrierRaw),
    };

    console.log('[DiscoveryContext] normalized scores:', archetypeScores);

    // Sort descending by score
    const sorted = (Object.entries(archetypeScores) as [ArchetypeName, number][])
      .sort((a, b) => b[1] - a[1]);

    let primaryName: ArchetypeName = sorted[0][0];
    let secondaryName: ArchetypeName = sorted[1][0];

    // Score-gap tie-break: if gap between #1 and #2 is less than MIN_GAP,
    // use alphabetical order on archetype name for deterministic stability
    const gap = sorted[0][1] - sorted[1][1];
    if (gap < MIN_GAP) {
      const top2 = [sorted[0][0], sorted[1][0]].sort((a, b) => a.localeCompare(b));
      primaryName = top2[0];
      secondaryName = top2[1];
      console.log(`[DiscoveryContext] gap=${gap.toFixed(3)} < MIN_GAP=${MIN_GAP}, applied alphabetical tie-break`);
    }

    const blend_name = getBlendName(primaryName, secondaryName);

    const result: SacredDesignResult = {
      primary_archetype: primaryName,
      secondary_archetype: secondaryName,
      archetypeScores,
      blend_name,
    };

    // Compute phase4Computed from raw P4 answers
    const computed: Phase4Computed = {
      anxious_score: (p4.P4_Q1 + p4.P4_Q2) / 2,
      avoidant_score: (p4.P4_Q3 + p4.P4_Q4) / 2,
      overactive_score: (p4.P4_Q5 + p4.P4_Q6) / 2,
      grounded_score: p4.P4_Q7,
    };

    console.log('[DiscoveryContext] sacredDesignResult computed:', result);
    console.log('[DiscoveryContext] phase4Computed:', computed);

    setSacredDesignResult(result);
    setPhase4Computed(computed);
    setQuizCompleted(true);

    AsyncStorage.setItem('sacredDesignResult', JSON.stringify(result)).catch(() => {});
    AsyncStorage.setItem('phase4Computed', JSON.stringify(computed)).catch(() => {});
    AsyncStorage.setItem('quizCompleted', 'true').catch(() => {});
  }, [phase1Scores, phase2Scores, phase3Scores, phase4Scores]);

  const restoreFromBackend = useCallback((data: {
    primary_archetype: string;
    secondary_archetype: string;
    blend_name: string;
    scores: ArchetypeWeightScores;
  }) => {
    console.log('[DiscoveryContext] restoreFromBackend:', data);
    const result: SacredDesignResult = {
      primary_archetype: data.primary_archetype as ArchetypeName,
      secondary_archetype: data.secondary_archetype as ArchetypeName,
      archetypeScores: data.scores,
      blend_name: data.blend_name,
    };
    setSacredDesignResult(result);
    setQuizCompleted(true);
    AsyncStorage.setItem('sacredDesignResult', JSON.stringify(result)).catch(() => {});
    AsyncStorage.setItem('quizCompleted', 'true').catch(() => {});
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
    phase4Computed,
    sacredDesignResult,
    computeSacredDesign,
    clearSacredDesign,
    quizCompleted,
    restoreFromBackend,
  }), [answers, setAnswer, resetAnswers, phase1Scores, computePhase1Scores, phase2Scores, computePhase2Scores, phase3Scores, computePhase3Scores, phase4Scores, computePhase4Scores, phase4Computed, sacredDesignResult, computeSacredDesign, clearSacredDesign, quizCompleted, restoreFromBackend]);

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}
