import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext, Phase1Answers } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { saveCheckpoint } from '@/utils/quizCheckpoint';
import { updateAppState } from '@/utils/appState';

const PHASE_1_QUESTIONS = [
  { id: 'Q1', text: 'When conflict arises, I tend to step back and let others work it out.' },
  { id: 'Q2', text: 'I naturally take charge when a group needs direction.' },
  { id: 'Q3', text: 'I process experiences through how they made me feel, not just what happened.' },
  { id: 'Q4', text: "I follow through on commitments even when it's inconvenient." },
  { id: 'Q5', text: 'I find it easy to connect with new people and make them feel welcome.' },
  { id: 'Q6', text: 'I ask "why" more than most people around me.' },
  { id: 'Q7', text: 'When I see something unfair, I feel compelled to do something about it.' },
  { id: 'Q8', text: "I often put others' needs before my own to avoid tension." },
  { id: 'Q9', text: 'I feel energized when I can rally people around a shared goal.' },
  { id: 'Q10', text: "I notice when someone in the room is hurting, even if they haven't said anything." },
];

const scaleValues = [1, 2, 3, 4, 5];

export default function Phase1Screen() {
  const router = useRouter();
  const { resumeIndex } = useLocalSearchParams<{ resumeIndex?: string }>();
  const { answers, setAnswer, computePhase1Scores } = useContext(DiscoveryContext);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = parseInt(resumeIndex ?? '0', 10);
    return isNaN(idx) ? 0 : idx;
  });
  const questionOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    console.log('[Phase1] mount — updating currentOnboardingStep to /onboarding/phase-1');
    updateAppState({ currentOnboardingStep: '/onboarding/phase-1' }).catch(() => {});
  }, [screenOpacity, screenTranslateY]);

  const currentQuestion = PHASE_1_QUESTIONS[currentIndex];
  const selectedValue = answers[currentQuestion.id];

  function transitionToQuestion(nextIndex: number) {
    Animated.timing(questionOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentIndex(nextIndex);
      Animated.timing(questionOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }

  function handleSelect(value: number) {
    console.log(`[Phase1] Question ${currentQuestion.id} answered: ${value}`);
    setAnswer(currentQuestion.id, value);

    setTimeout(() => {
      if (currentIndex < PHASE_1_QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        const updatedAnswers = { ...answers, [currentQuestion.id]: value };
        const phaseAnswers: Phase1Answers = {
          Q1: updatedAnswers['Q1'] ?? 3,
          Q2: updatedAnswers['Q2'] ?? 3,
          Q3: updatedAnswers['Q3'] ?? 3,
          Q4: updatedAnswers['Q4'] ?? 3,
          Q5: updatedAnswers['Q5'] ?? 3,
          Q6: updatedAnswers['Q6'] ?? 3,
          Q7: updatedAnswers['Q7'] ?? 3,
          Q8: updatedAnswers['Q8'] ?? 3,
          Q9: updatedAnswers['Q9'] ?? 3,
          Q10: updatedAnswers['Q10'] ?? 3,
        };
        console.log('[Phase1] All questions answered, storing phase 1 answers:', phaseAnswers);
        computePhase1Scores(phaseAnswers);
        saveCheckpoint([1], updatedAnswers, 1, PHASE_1_QUESTIONS.length - 1).catch(() => {});
        router.push('/onboarding/phase-complete?phase=1');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase1] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  async function handleSaveAndExit() {
    console.log('[Phase1] Save & Continue Later pressed — currentIndex:', currentIndex, 'answers:', Object.keys(answers).length);
    try {
      await saveCheckpoint([], answers, 1, currentIndex);
      await updateAppState({ currentOnboardingStep: '/onboarding/phase-1', onboardingStarted: true });
      console.log('[Phase1] Checkpoint saved successfully');
    } catch (e) {
      console.warn('[Phase1] Failed to save checkpoint:', e);
    }
    Alert.alert(
      'Progress Saved',
      'Your progress is saved. Come back anytime.',
      [{ text: 'OK', onPress: () => setTimeout(() => router.replace('/(tabs)'), 50) }]
    );
  }

  const guidanceText = 'Go with your first instinct.';
  const leftLabel = 'Never like me';
  const rightLabel = 'Always like me';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Animated.View
        style={{
          flex: 1,
          paddingTop: 0,
          paddingBottom: 24,
          paddingHorizontal: 28,
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        }}
      >
        <OverallProgressBar phase={1} questionIndex={currentIndex} />
        <View style={{ height: 32 }} />
        <PhaseHeader
          phase={1}
          title="How You Operate"
          current={currentIndex + 1}
          total={PHASE_1_QUESTIONS.length}
        />

        <Animated.View
          style={{
            opacity: questionOpacity,
            alignItems: 'center',
            marginTop: 40,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Lora_700Bold',
              color: '#2F3E2F',
              lineHeight: 32,
              textAlign: 'center',
            }}
          >
            {currentQuestion.text}
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              color: 'rgba(47,62,47,0.45)',
              textAlign: 'center',
              letterSpacing: 0.3,
            }}
          >
            {guidanceText}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
              paddingHorizontal: 4,
              marginTop: 44,
            }}
          >
            {scaleValues.map((v) => (
              <ScaleButton
                key={v}
                value={v}
                selected={selectedValue === v}
                onPress={() => handleSelect(v)}
              />
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%',
              paddingHorizontal: 4,
              marginTop: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_400Regular',
                color: 'rgba(47,62,47,0.45)',
              }}
            >
              {leftLabel}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_400Regular',
                color: 'rgba(47,62,47,0.45)',
              }}
            >
              {rightLabel}
            </Text>
          </View>
        </Animated.View>

        {currentIndex > 0 && (
          <AnimatedPressable
            onPress={handlePrevious}
            style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: 32 }}
            accessibilityRole="button"
            accessibilityLabel="Previous question"
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: 'Inter_400Regular',
                color: COLORS.textSecondary,
              }}
            >
              ← Previous
            </Text>
          </AnimatedPressable>
        )}

        {/* Save & Continue Later */}
        <AnimatedPressable
          onPress={handleSaveAndExit}
          style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, marginTop: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Save and continue later"
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'Inter_400Regular',
              color: 'rgba(47,62,47,0.38)',
              textDecorationLine: 'underline',
            }}
          >
            Save &amp; Continue Later
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}
