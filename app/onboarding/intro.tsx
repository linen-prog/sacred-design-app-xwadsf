import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

  const bottomPadding = insets.bottom + 24;

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      {/* Back button */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <Pressable
          onPress={handleBack}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#6F8A6A" />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 36,
          paddingBottom: bottomPadding + 100,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top label */}
        <Text
          style={{
            fontSize: 12,
            color: '#6F8A6A',
            textAlign: 'center',
            fontWeight: '400',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          A simple discovery process
        </Text>

        {/* Main paragraph */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 19,
            color: '#2F3E2F',
            textAlign: 'center',
            lineHeight: 31,
            marginBottom: 28,
          }}
        >
          {"You'll answer a few simple questions to understand how you naturally think, feel, and show up."}
        </Text>

        {/* Reassurance line */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 17,
            color: '#4A5E4A',
            textAlign: 'center',
            lineHeight: 28,
            marginBottom: 28,
          }}
        >
          {"There are no right or wrong answers\u2014just your honest experience."}
        </Text>

        {/* Outcome line */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 17,
            color: '#5A5A5A',
            textAlign: 'center',
            lineHeight: 27,
            marginBottom: 44,
          }}
        >
          {"At the end, you'll receive your Sacred Design."}
        </Text>

        {/* Phase list — no bullets */}
        <View style={{ alignItems: 'center', gap: 18, marginBottom: 52 }}>
          {PHASES.map((phase) => (
            <Text
              key={phase}
              style={{
                fontSize: 15,
                color: '#6F8A6A',
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {phase}
            </Text>
          ))}
        </View>

        {/* Growth blurb */}
        <Text
          style={{
            fontSize: 13,
            color: 'rgba(47,62,47,0.65)',
            textAlign: 'center',
            lineHeight: 21,
            letterSpacing: 0.2,
            marginTop: 8,
            marginBottom: 40,
            paddingHorizontal: 8,
          }}
        >
          {"As you move through this, you'll begin to see yourself more clearly\u2014and grow into a more grounded version of who you already are."}
        </Text>

        {/* Micro-text above button */}
        <Text
          style={{
            fontSize: 12,
            color: '#A0A0A0',
            textAlign: 'center',
            marginBottom: 14,
            letterSpacing: 0.2,
          }}
        >
          Go with your first instinct.
        </Text>

        {/* Continue button */}
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
            shadowOpacity: 0.28,
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
