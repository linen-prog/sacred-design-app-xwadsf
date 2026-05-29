import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateAppState } from '@/utils/appState';

const QUIZ_BG = require('../../assets/images/6203a26c-7e60-4d20-91a8-e4ec578007fc.jpeg');

const BG = '#F7F4EF';
const TEXT = '#2C3A2C';
const TEXT_MUTED = '#8A8070';
const GOLD = '#C9A84C';
const INPUT_BG = 'rgba(255,252,245,0.85)';
const INPUT_BORDER = 'rgba(201,168,76,0.35)';

export default function Phase1ReflectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[Phase1Reflection] mount — updating currentOnboardingStep to /onboarding/phase-1-reflection');
    updateAppState({ currentOnboardingStep: '/onboarding/phase-1-reflection' }).catch(() => {});
  }, []);

  async function handleContinue() {
    console.log('[Phase1Reflection] Continue pressed — reflection length:', reflectionText.trim().length);
    if (reflectionText.trim()) {
      setSaving(true);
      try {
        await AsyncStorage.setItem('phase_1_reflection', reflectionText.trim());
        console.log('[Phase1Reflection] Saved phase_1_reflection to AsyncStorage');
      } catch (e) {
        console.warn('[Phase1Reflection] Failed to save reflection:', e);
      } finally {
        setSaving(false);
      }
    }
    router.push('/onboarding/phase-2');
  }

  function handleSkip() {
    console.log('[Phase1Reflection] Skip pressed — navigating to phase-2');
    router.push('/onboarding/phase-2');
  }

  const buttonLabel = saving ? 'Saving…' : 'Continue to Phase 2 →';

  return (
    <ImageBackground
      source={QUIZ_BG}
      style={{ flex: 1, backgroundColor: '#F7F4EF' }}
      resizeMode="cover"
      imageStyle={{ opacity: 0.55 }}
    >
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OverallProgressBar phase={1} questionIndex={10} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 32, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.phaseTag}>PHASE 1</Text>
        <Text style={styles.heading}>Pause & Reflect</Text>
        <Text style={styles.subheading}>The Foundation — your roots and values</Text>

        <View style={styles.divider} />

        <Text style={styles.prompt}>
          What did you notice about yourself in those questions? What felt most true?
        </Text>

        <TextInput
          style={styles.input}
          multiline
          numberOfLines={5}
          placeholder="Write freely — this is just for you…"
          placeholderTextColor={TEXT_MUTED}
          value={reflectionText}
          onChangeText={setReflectionText}
          textAlignVertical="top"
          keyboardAppearance="light"
        />

        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipLink}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 28,
    alignItems: 'stretch',
  },
  phaseTag: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 3,
    color: GOLD,
    marginBottom: 16,
  },
  heading: {
    fontFamily: 'Lora_700Bold',
    fontSize: 34,
    color: TEXT,
    lineHeight: 44,
    marginBottom: 10,
  },
  subheading: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.15)',
    marginBottom: 28,
  },
  prompt: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 17,
    color: TEXT,
    lineHeight: 28,
    marginBottom: 24,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: TEXT,
    lineHeight: 22,
    minHeight: 130,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    marginBottom: 28,
    // color already uses TEXT (dark green)
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  skipLink: {
    alignSelf: 'center',
    padding: 8,
  },
  skipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: TEXT_MUTED,
  },
});
