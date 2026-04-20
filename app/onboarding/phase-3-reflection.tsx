import React from 'react';
import { useRouter } from 'expo-router';
import { Sunrise } from 'lucide-react-native';
import { ReflectionScreen } from '@/components/ReflectionScreen';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { View } from 'react-native';

export default function Phase3ReflectionScreen() {
  const router = useRouter();

  function handleContinue() {
    console.log('[Phase3Reflection] Continue pressed');
    router.push('/onboarding/phase-4');
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Show bar at full phase 3 completion: 30/37 */}
      <OverallProgressBar phase={3} questionIndex={10} />
      <ReflectionScreen
        icon={Sunrise}
        text={"You're beginning to see how your design moves outward."}
        buttonLabel="Continue"
        onContinue={handleContinue}
      />
    </View>
  );
}
