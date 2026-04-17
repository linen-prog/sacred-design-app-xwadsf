import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="intro" />
      <Stack.Screen name="phase-1" />
      <Stack.Screen name="phase-1-reflection" />
      <Stack.Screen name="phase-2" />
      <Stack.Screen name="phase-2-reflection" />
      <Stack.Screen name="phase-3" />
      <Stack.Screen name="phase-3-reflection" />
      <Stack.Screen name="phase-4" />
      <Stack.Screen name="phase-4-reflection" />
      <Stack.Screen name="preparing" />
    </Stack>
  );
}
