import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: '#F6F1E8' },
        headerShadowVisible: false,
        headerTintColor: '#6F8A6A',
        headerTitle: '',
        headerBackTitle: '',
        headerBackVisible: true,
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="intro" />
      <Stack.Screen name="phase-1" />
      <Stack.Screen name="phase-1-reflection" />
      <Stack.Screen name="phase-2" />
      <Stack.Screen name="phase-2-reflection" />
      <Stack.Screen name="phase-3" />
      <Stack.Screen name="phase-3-reflection" />
      <Stack.Screen name="phase-4" />
      <Stack.Screen name="phase-4-reflection" />
      <Stack.Screen name="preparing" options={{ headerShown: false }} />
    </Stack>
  );
}
