import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveCheckpoint } from '@/utils/quizCheckpoint';
import { updateAppState } from '@/utils/appState';

export interface SaveAndExitParams {
  phase: number;
  questionIndex: number;
  answers: Record<string, number>;
  completedPhases: number[];
}

export async function saveAndExitOnboarding(params: SaveAndExitParams): Promise<void> {
  const { phase, questionIndex, answers, completedPhases } = params;
  const payload = { phase, questionIndex, completedPhases, answerCount: Object.keys(answers).length };
  console.log('[SaveExit] tapped');
  console.log('[SaveExit] payload:', payload);

  await saveCheckpoint(completedPhases, answers, phase, questionIndex);

  // Verify the save actually persisted
  const key = `quiz_checkpoint:anonymous`;
  const allKeys = await AsyncStorage.getAllKeys();
  const checkpointKey = allKeys.find(k => k.startsWith('quiz_checkpoint:')) ?? key;
  const raw = await AsyncStorage.getItem(checkpointKey);
  const verified = raw ? JSON.parse(raw) : null;
  console.log('[SaveExit] verified checkpoint:', verified);

  await updateAppState({ currentOnboardingStep: `/onboarding/phase-${phase}`, onboardingStarted: true });
  console.log('[SaveExit] save complete');
}
