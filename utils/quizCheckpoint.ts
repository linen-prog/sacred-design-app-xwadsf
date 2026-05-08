import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QuizCheckpoint {
  completedPhases: number[];
  answers: Record<string, number>;
}

function getCheckpointKey(userId?: string | null): string {
  return `quiz_checkpoint:${userId || 'anonymous'}`;
}

export async function saveCheckpoint(
  completedPhases: number[],
  answers: Record<string, number>,
  userId?: string | null
): Promise<void> {
  const key = getCheckpointKey(userId);
  const checkpoint: QuizCheckpoint = { completedPhases, answers };
  console.log('[QuizCheckpoint] Saving checkpoint:', { key, completedPhases, answerCount: Object.keys(answers).length });
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
    console.log('[QuizCheckpoint] Loaded checkpoint:', { key, completedPhases: parsed.completedPhases, answerCount: Object.keys(parsed.answers).length });
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

export function getNextPhaseRoute(completedPhases: number[]): string {
  if (
    completedPhases.includes(1) &&
    completedPhases.includes(2) &&
    completedPhases.includes(3) &&
    completedPhases.includes(4)
  ) {
    // All 4 phases done — go straight to results computation
    return '/onboarding/preparing';
  }
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
