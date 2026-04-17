import React from 'react';
import { useRouter } from 'expo-router';
import { Sunrise } from 'lucide-react-native';
import { ReflectionScreen } from '@/components/ReflectionScreen';

export default function Phase3ReflectionScreen() {
  const router = useRouter();

  function handleContinue() {
    console.log('[Phase3Reflection] Continue pressed');
    router.push('/onboarding/phase-4');
  }

  return (
    <ReflectionScreen
      icon={Sunrise}
      text={"You're beginning to see how your design moves outward."}
      buttonLabel="Continue"
      onContinue={handleContinue}
    />
  );
}
