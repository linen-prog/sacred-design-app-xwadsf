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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateAppState } from '@/utils/appState';

const BG = '#0A0E1A';
const TEXT = '#F5F0E8';
const TEXT_MUTED = '#8B7355';
const GOLD = '#C9A84C';
const INPUT_BG = '#131929';
const INPUT_BORDER = 'rgba(201,168,76,0.35)';

export default function Phase2ReflectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[Phase2Reflection] mount — updating currentOnboardingStep to /onboarding/phase-2-reflection');
    updateAppState({ currentOnboardingStep: '/onboarding/phase-2-reflection' }).catch(() => {});
  }, []);

  async function handleContinue() {
    console.log('[Phase2Reflection] Continue pressed — reflection length:', reflectionText.trim().length);
    if (reflectionText.trim()) {
      setSaving(true);
      try {
        await AsyncStorage.setItem('phase_2_reflection', reflectionText.trim());
        console.log('[Phase2Reflection] Saved phase_2_reflection to AsyncStorage');
      } catch (e) {
        console.warn('[Phase2Reflection] Failed to save reflection:', e);
      } finally {
        setSaving(false);
      }
    }
    router.push('/onboarding/phase-3');
  }

  function handleSkip() {
    console.log('[Phase2Reflection] Skip pressed — navigating to phase-3');
    router.push('/onboarding/phase-3');
  }

  const buttonLabel = saving ? 'Saving…' : 'Continue to Phase 3 →';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OverallProgressBar phase={2} questionIndex={10} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 32, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.phaseTag}>PHASE 2</Text>
        <Text style={styles.heading}>Pause & Reflect</Text>
        <Text style={styles.subheading}>The Fire — your passion and drive</Text>

        <View style={styles.divider} />

        <Text style={styles.prompt}>
          Where do you feel the most alive? What lights you up?
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: BG,
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
    color: '#0A0E1A',
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
