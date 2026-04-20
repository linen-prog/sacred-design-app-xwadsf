import AsyncStorage from '@react-native-async-storage/async-storage';

const CHECKPOINT_KEY = 'quiz_checkpoint';

export interface QuizCheckpoint {
  completedPhases: number[];
  answers: Record<string, number>;
}

export async function saveCheckpoint(
  completedPhases: number[],
  answers: Record<string, number>
): Promise<void> {
  const checkpoint: QuizCheckpoint = { completedPhases, answers };
  console.log('[QuizCheckpoint] Saving checkpoint:', { completedPhases, answerCount: Object.keys(answers).length });
  await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint));
}

export async function loadCheckpoint(): Promise<QuizCheckpoint | null> {
  const raw = await AsyncStorage.getItem(CHECKPOINT_KEY);
  if (!raw) {
    console.log('[QuizCheckpoint] No checkpoint found');
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as QuizCheckpoint;
    console.log('[QuizCheckpoint] Loaded checkpoint:', { completedPhases: parsed.completedPhases, answerCount: Object.keys(parsed.answers).length });
    return parsed;
  } catch (e) {
    console.log('[QuizCheckpoint] Failed to parse checkpoint:', e);
    return null;
  }
}

export async function clearCheckpoint(): Promise<void> {
  console.log('[QuizCheckpoint] Clearing checkpoint');
  await AsyncStorage.removeItem(CHECKPOINT_KEY);
}

export function getNextPhaseRoute(completedPhases: number[]): string {
  if (completedPhases.includes(1) && completedPhases.includes(2) && completedPhases.includes(3)) {
    return '/onboarding/phase-4';
  }
  if (completedPhases.includes(1) && completedPhases.includes(2)) {
    return '/onboarding/phase-3';
  }
  if (completedPhases.includes(1)) {
    return '/onboarding/phase-2';
  }
  return '/onboarding/phase-1';
}
