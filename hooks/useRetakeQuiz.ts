import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppState } from '@/contexts/AppStateContext';

export function useRetakeQuiz() {
  const { retakeQuiz } = useAppState();
  const router = useRouter();

  const promptRetake = () => {
    console.log('[useRetakeQuiz] promptRetake called — showing confirmation alert');
    Alert.alert(
      'Retake the Quiz?',
      'Retaking the quiz will replace your current design results. Do you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('[useRetakeQuiz] User cancelled retake'),
        },
        {
          text: 'Retake Quiz',
          style: 'destructive',
          onPress: async () => {
            console.log('[useRetakeQuiz] User confirmed retake — running retakeQuiz()');
            await retakeQuiz();
            await new Promise(resolve => setTimeout(resolve, 75));
            console.log('[useRetakeQuiz] Navigating to /onboarding/intro');
            router.replace('/onboarding/intro');
          },
        },
      ]
    );
  };

  return { promptRetake };
}
