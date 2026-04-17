import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';

const PHASES = [
  'How You Operate',
  'What Drives You',
  'How You Show Up',
  'How You Stay Grounded',
];

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_600SemiBold });

  function handleBack() {
    console.log('[Intro] Back pressed');
    router.back();
  }

  function handleContinue() {
    console.log('[Intro] Continue pressed');
    router.push('/onboarding/phase-1');
  }

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F6F1E8' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Pressable
          onPress={handleBack}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color="#6F8A6A" />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingVertical: 48,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 15,
            color: '#6F8A6A',
            textAlign: 'center',
            fontWeight: '400',
            marginBottom: 32,
          }}
        >
          A simple discovery process
        </Text>

        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 19,
            color: '#2F3E2F',
            textAlign: 'center',
            lineHeight: 30,
            marginBottom: 20,
          }}
        >
          {"We'll guide you through a short series of questions to understand how you naturally think, feel, and show up."}
        </Text>

        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 19,
            color: '#2F3E2F',
            textAlign: 'center',
            lineHeight: 30,
            marginBottom: 20,
          }}
        >
          {"There are no right or wrong answers\u2014just your honest experience."}
        </Text>

        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 17,
            color: '#5A5A5A',
            textAlign: 'center',
            lineHeight: 26,
            marginTop: 8,
            marginBottom: 36,
          }}
        >
          {"At the end, you'll receive your Sacred Design."}
        </Text>

        <View style={{ alignItems: 'center', gap: 14, marginBottom: 48 }}>
          {PHASES.map((phase) => (
            <Text
              key={phase}
              style={{
                fontSize: 16,
                color: '#6F8A6A',
                textAlign: 'center',
                lineHeight: 24,
              }}
            >
              {'• '}
              {phase}
            </Text>
          ))}
        </View>

        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_400Regular',
            color: 'rgba(47,62,47,0.5)',
            textAlign: 'center',
            lineHeight: 22,
            letterSpacing: 0.2,
            marginTop: 28,
            marginBottom: 8,
            paddingHorizontal: 8,
          }}
        >
          {"As you move through this process, you'll begin to see yourself more clearly\u2014and naturally grow into a stronger, more grounded version of who you already are."}
        </Text>

        <Pressable
          onPress={handleContinue}
          style={{
            backgroundColor: '#6F8A6A',
            borderRadius: 18,
            paddingVertical: 18,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#6F8A6A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 4,
          }}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 17,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
