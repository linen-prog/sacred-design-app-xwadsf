import React, { useContext, useEffect, useState } from 'react';
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
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAppState } from '@/contexts/AppStateContext';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';

const BG = '#0A0E1A';
const TEXT = '#F5F0E8';
const TEXT_MUTED = '#8B7355';
const GOLD = '#C9A84C';
const INPUT_BG = '#131929';
const INPUT_BORDER = 'rgba(201,168,76,0.35)';

export default function Phase4ReflectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);
  const { isSubscribed } = useSubscription();
  const { appState, isLoading, updateAppState } = useAppState();
  const { sacredDesignResult } = useContext(DiscoveryContext);

  // Soft guard — allow entry if retakeQuiz() explicitly set this step, block accidental re-entry
  useEffect(() => {
    if (isLoading) return;
    if (!appState.quizCompleted) return; // quiz not done yet — allow normal flow

    // Quiz is completed. Only allow entry if retakeQuiz() explicitly set this step.
    if (appState.currentOnboardingStep !== '/onboarding/intro') {
      console.log('[Phase4Reflection] quizCompleted=true and not a retake — redirecting away');
      if (appState.revealViewed) {
        router.replace('/(tabs)');
      } else if (appState.revealUnlocked) {
        router.replace('/onboarding/preparing');
      } else {
        router.replace('/partial-reveal');
      }
    } else {
      console.log('[Phase4Reflection] quizCompleted=true but retakeQuiz() was called — allowing entry');
    }
  }, [isLoading, appState.quizCompleted, appState.currentOnboardingStep, appState.revealViewed, appState.revealUnlocked, router]);

  async function saveReflection() {
    if (reflectionText.trim()) {
      setSaving(true);
      try {
        await AsyncStorage.setItem('phase_4_reflection', reflectionText.trim());
        console.log('[Phase4Reflection] Saved phase_4_reflection to AsyncStorage');
      } catch (e) {
        console.warn('[Phase4Reflection] Failed to save reflection:', e);
      } finally {
        setSaving(false);
      }
    }
  }

  async function proceedAfterReflection() {
    // Save archetype data and quiz completion to appState before navigating
    const primaryArchetype = sacredDesignResult?.primary_archetype ?? null;
    const secondaryArchetype = sacredDesignResult?.secondary_archetype ?? null;
    const scoreBreakdown = sacredDesignResult?.archetypeScores ?? null;

    console.log('[Phase4Reflection] PRE-UPDATE appState — saving quiz completion, primary:', primaryArchetype, 'secondary:', secondaryArchetype);

    const newState = await updateAppState({
      quizCompleted: true,
      paywallReached: true,
      currentOnboardingStep: '/post-quiz-save',
      primaryArchetype,
      secondaryArchetype,
      scoreBreakdown,
    });

    console.log('[Phase4Reflection] POST-UPDATE state confirmed:', JSON.stringify(newState));
    await new Promise(resolve => setTimeout(resolve, 75));

    console.log('[Phase4Reflection] Navigating to /post-quiz-save');
    router.push('/post-quiz-save');
  }

  async function handleContinue() {
    console.log('[Phase4Reflection] Continue pressed — reflection length:', reflectionText.trim().length);
    await saveReflection();
    await proceedAfterReflection();
  }

  async function handleSkip() {
    console.log('[Phase4Reflection] Skip pressed — checking subscription status');
    await proceedAfterReflection();
  }

  const buttonLabel = saving ? 'Saving…' : 'Continue →';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OverallProgressBar phase={4} questionIndex={7} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: 32, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.phaseTag}>PHASE 4</Text>
        <Text style={styles.heading}>Pause & Reflect</Text>
        <Text style={styles.subheading}>The Spark — your purpose and calling</Text>

        <View style={styles.divider} />

        <Text style={styles.prompt}>
          What do you sense is your deeper calling? What would you do if nothing held you back?
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
