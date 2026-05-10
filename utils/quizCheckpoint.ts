import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuizCheckpoint {
  completedPhases: number[];
  answers: Record<string, number>;
  currentPhase: number;           // which phase the user was on when they saved (1–4)
  currentQuestionIndex: number;   // which question index within that phase (0-based)
}

function getCheckpointKey(userId?: string | null): string {
  return `quiz_checkpoint:${userId || 'anonymous'}`;
}

export async function saveCheckpoint(
  completedPhases: number[],
  answers: Record<string, number>,
  currentPhase: number,
  currentQuestionIndex: number,
  userId?: string | null
): Promise<void> {
  const key = getCheckpointKey(userId);
  const checkpoint: QuizCheckpoint = { completedPhases, answers, currentPhase, currentQuestionIndex };
  console.log('[QuizCheckpoint] Saving checkpoint:', { key, completedPhases, currentPhase, currentQuestionIndex, answerCount: Object.keys(answers).length });
  await AsyncStorage.setItem(key, JSON.stringify(checkpoint));
}

export async function loadCheckpoint(userId?: string | null): Promise<QuizCheckpoint | null> {
  const key = getCheckpointKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    console.log('[QuizCheckpoint] No checkpoint found for key:', key);
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as QuizCheckpoint;
    console.log('[QuizCheckpoint] Loaded checkpoint:', { key, completedPhases: parsed.completedPhases, currentPhase: parsed.currentPhase, currentQuestionIndex: parsed.currentQuestionIndex, answerCount: Object.keys(parsed.answers).length });
    return parsed;
  } catch (e) {
    console.log('[QuizCheckpoint] Failed to parse checkpoint:', e);
    return null;
  }
}

export async function clearCheckpoint(userId?: string | null): Promise<void> {
  const key = getCheckpointKey(userId);
  console.log('[QuizCheckpoint] Clearing checkpoint for key:', key);
  await AsyncStorage.removeItem(key);
}

export function getNextPhaseRoute(checkpoint: QuizCheckpoint): string {
  const { completedPhases, currentPhase } = checkpoint;
  // All 4 done
  if ([1, 2, 3, 4].every(p => completedPhases.includes(p))) return '/onboarding/preparing';
  // Mid-phase resume: currentPhase is in progress (not yet completed)
  if (currentPhase && !completedPhases.includes(currentPhase)) {
    const map: Record<number, string> = {
      1: '/onboarding/phase-1',
      2: '/onboarding/phase-2',
      3: '/onboarding/phase-3',
      4: '/onboarding/phase-4',
    };
    return map[currentPhase] ?? '/onboarding/phase-1';
  }
  // Next phase after last completed
  if (completedPhases.includes(1) && completedPhases.includes(2) && completedPhases.includes(3)) return '/onboarding/phase-4';
  if (completedPhases.includes(1) && completedPhases.includes(2)) return '/onboarding/phase-3';
  if (completedPhases.includes(1)) return '/onboarding/phase-2';
  return '/onboarding/phase-1';
}
