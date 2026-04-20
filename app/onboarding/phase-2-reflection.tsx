import React from 'react';
import { useRouter } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { ReflectionScreen } from '@/components/ReflectionScreen';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { View } from 'react-native';

export default function Phase2ReflectionScreen() {
  const router = useRouter();

  function handleContinue() {
    console.log('[Phase2Reflection] Continue pressed');
    router.push('/onboarding/phase-3');
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Show bar at full phase 2 completion: 20/37 */}
      <OverallProgressBar phase={2} questionIndex={10} />
      <ReflectionScreen
        icon={Layers}
        text={"These patterns aren't flaws—they're ways you've learned to move through the world."}
        buttonLabel="Continue"
        onContinue={handleContinue}
      />
    </View>
  );
}
