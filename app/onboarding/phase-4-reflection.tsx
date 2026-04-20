import React from 'react';
import { useRouter } from 'expo-router';
import { Anchor } from 'lucide-react-native';
import { ReflectionScreen } from '@/components/ReflectionScreen';

export default function Phase4ReflectionScreen() {
  const router = useRouter();

  function handleContinue() {
    console.log('[Phase4Reflection] See My Sacred Design pressed');
    router.push('/onboarding/preparing');
  }

  return (
    <ReflectionScreen
      icon={Anchor}
      text={"Your body has been supporting you all along.\nNow you'll learn how to work with it."}
      buttonLabel="See My Sacred Design"
      onContinue={handleContinue}
    />
  );
}
