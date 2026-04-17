import React from 'react';
import { useRouter } from 'expo-router';
import { Wind } from 'lucide-react-native';
import { ReflectionScreen } from '@/components/ReflectionScreen';

export default function Phase1ReflectionScreen() {
  const router = useRouter();

  function handleContinue() {
    console.log('[Phase1Reflection] Continue pressed');
    router.push('/onboarding/phase-2');
  }

  return (
    <ReflectionScreen
      icon={Wind}
      text={"Take a breath.\nYou're beginning to notice patterns that have been with you all along."}
      buttonLabel="Continue"
      onContinue={handleContinue}
    />
  );
}
