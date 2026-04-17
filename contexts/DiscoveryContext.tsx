import React, { createContext, useState, useCallback, useMemo } from 'react';

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
  // Fallback: "The [Primary Trait] [Secondary Expression]"
  const traitWord = ARCHETYPE_TRAIT_WORD[primary];
  const expressionWord = ARCHETYPE_EXPRESSION_WORD[secondary];
  return `The ${traitWord} ${expressionWord}`;
}

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
  sacredDesignResult: SacredDesignResult | null;
  computeSacredDesign: () => void;
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
  sacredDesignResult: null,
  computeSacredDesign: () => {},
});

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [phase1Scores, setPhase1Scores] = useState<Phase1Scores | null>(null);
  const [phase2Scores, setPhase2Scores] = useState<Phase2Scores | null>(null);
  const [phase3Scores, setPhase3Scores] = useState<Phase3Scores | null>(null);
  const [phase4Scores, setPhase4Scores] = useState<Phase4Scores | null>(null);
  const [sacredDesignResult, setSacredDesignResult] = useState<SacredDesignResult | null>(null);

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

  const computeSacredDesign = useCallback(() => {
    console.log('[DiscoveryContext] computeSacredDesign called');

    const p1 = phase1Scores;
    const p2 = phase2Scores;
    const p3 = phase3Scores;
    const p4 = phase4Scores;

    if (!p1 || !p2 || !p3 || !p4) {
      console.log('[DiscoveryContext] computeSacredDesign: missing phase scores, aborting');
      return;
    }

    const { social_energy_score, emotional_score, drive_score, openness_score, stress_score } = p1;
    const { peacemaker_score, leader_score, deep_feeler_score, steward_score, light_bearer_score, truth_seeker_score, justice_carrier_score } = p2;
    const { apostle_score, prophet_score, evangelist_score, shepherd_score, teacher_score } = p3;
    const { avoidant_score, anxious_score, overactive_score } = p4;

    const PeacemakerScore =
      (peacemaker_score * 0.4) +
      (emotional_score * 0.2) +
      (shepherd_score * 0.2) +
      (anxious_score * 0.1) +
      (avoidant_score * 0.1);

    const LeaderScore =
      (leader_score * 0.4) +
      (drive_score * 0.2) +
      (apostle_score * 0.2) +
      (social_energy_score * 0.1) +
      ((10 - stress_score) * 0.1);

    const DeepFeelerScore =
      (deep_feeler_score * 0.4) +
      (emotional_score * 0.2) +
      (openness_score * 0.2) +
      (anxious_score * 0.1) +
      (shepherd_score * 0.1);

    const StewardScore =
      (steward_score * 0.4) +
      (drive_score * 0.3) +
      (teacher_score * 0.1) +
      ((10 - openness_score) * 0.1) +
      ((10 - emotional_score) * 0.1);

    const LightBearerScore =
      (light_bearer_score * 0.4) +
      (social_energy_score * 0.2) +
      (evangelist_score * 0.2) +
      (openness_score * 0.1) +
      ((10 - avoidant_score) * 0.1);

    const TruthSeekerScore =
      (truth_seeker_score * 0.4) +
      (openness_score * 0.3) +
      (teacher_score * 0.2) +
      ((10 - social_energy_score) * 0.1);

    const JusticeCarrierScore =
      (justice_carrier_score * 0.4) +
      (drive_score * 0.2) +
      (prophet_score * 0.2) +
      (anxious_score * 0.1) +
      (overactive_score * 0.1);

    const archetypeScores: ArchetypeWeightScores = {
      'Peacemaker': PeacemakerScore,
      'Courageous Leader': LeaderScore,
      'Deep Feeler': DeepFeelerScore,
      'Faithful Steward': StewardScore,
      'Light Bearer': LightBearerScore,
      'Truth Seeker': TruthSeekerScore,
      'Justice Carrier': JusticeCarrierScore,
    };

    const sorted = (Object.entries(archetypeScores) as [ArchetypeName, number][])
      .sort((a, b) => b[1] - a[1]);

    const primary = sorted[0];
    const primaryName = primary[0];
    const primaryScore = primary[1];

    const callingInfluence: Record<ArchetypeName, number> = {
      'Peacemaker': shepherd_score,
      'Courageous Leader': apostle_score,
      'Deep Feeler': shepherd_score,
      'Faithful Steward': teacher_score,
      'Light Bearer': evangelist_score,
      'Truth Seeker': teacher_score,
      'Justice Carrier': prophet_score,
    };

    let secondaryName: ArchetypeName | null = null;

    for (let i = 1; i < sorted.length; i++) {
      const candidate = sorted[i];
      if (candidate[0] === primaryName) continue;

      const meetsThreshold = candidate[1] >= primaryScore * 0.6;

      if (meetsThreshold) {
        const next = sorted[i + 1];
        if (
          next &&
          next[0] !== primaryName &&
          Math.abs(candidate[1] - next[1]) < 0.5
        ) {
          const candidateCalling = callingInfluence[candidate[0]];
          const nextCalling = callingInfluence[next[0]];
          secondaryName = nextCalling > candidateCalling ? next[0] : candidate[0];
        } else {
          secondaryName = candidate[0];
        }
        break;
      }
    }

    if (!secondaryName) {
      secondaryName = sorted.find(([name]) => name !== primaryName)![0];
    }

    const blend_name = getBlendName(primaryName, secondaryName);

    const result: SacredDesignResult = {
      primary_archetype: primaryName,
      secondary_archetype: secondaryName,
      archetypeScores,
      blend_name,
    };

    console.log('[DiscoveryContext] sacredDesignResult computed:', result);
    setSacredDesignResult(result);
  }, [phase1Scores, phase2Scores, phase3Scores, phase4Scores]);

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
    sacredDesignResult,
    computeSacredDesign,
  }), [answers, setAnswer, resetAnswers, phase1Scores, computePhase1Scores, phase2Scores, computePhase2Scores, phase3Scores, computePhase3Scores, phase4Scores, computePhase4Scores, sacredDesignResult, computeSacredDesign]);

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}
