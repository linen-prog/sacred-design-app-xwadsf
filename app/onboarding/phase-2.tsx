import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext, Phase2Answers } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { saveCheckpoint } from '@/utils/quizCheckpoint';
import { updateAppState } from '@/utils/appState';

const PHASE_2_QUESTIONS = [
  { id: 'P2_Q1', text: 'I would rather compromise than let a disagreement damage a relationship.' },
  { id: 'P2_Q2', text: "I feel most alive when I'm leading others toward a goal." },
  { id: 'P2_Q3', text: "I feel other people's pain or joy as if it were my own." },
  { id: 'P2_Q4', text: 'I feel unsettled when responsibilities are left unfinished or unclear.' },
  { id: 'P2_Q5', text: 'I naturally encourage others and help them see their potential.' },
  { id: 'P2_Q6', text: "I need to understand the deeper reason behind what I'm asked to do." },
  { id: 'P2_Q7', text: 'I feel a strong pull to speak up when someone is being treated unfairly.' },
  { id: 'P2_Q8', text: 'I feel most at peace when everyone around me is getting along.' },
  { id: 'P2_Q9', text: 'I am motivated by the chance to make a lasting impact.' },
  { id: 'P2_Q10', text: 'I find deep meaning in small, faithful acts that others might overlook.' },
];

const INTRO_TEXT = "Now we'll explore what moves you beneath the surface—your motivations and patterns.";

const scaleValues = [1, 2, 3, 4, 5];

export default function Phase2Screen() {
  const router = useRouter();
  const { resumeIndex } = useLocalSearchParams<{ resumeIndex?: string }>();
  const { answers, setAnswer, computePhase2Scores } = useContext(DiscoveryContext);
  const [showIntro, setShowIntro] = useState(() => {
    const idx = parseInt(resumeIndex ?? '0', 10);
    return isNaN(idx) || idx === 0;
  });
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
    console.log('[Phase2] mount — updating currentOnboardingStep to /onboarding/phase-2');
    updateAppState({ currentOnboardingStep: '/onboarding/phase-2' }).catch(() => {});
  }, [screenOpacity, screenTranslateY]);

  const currentQuestion = PHASE_2_QUESTIONS[currentIndex];
  const selectedValue = answers[currentQuestion?.id ?? ''];

  function handleBegin() {
    console.log('[Phase2] Begin questions pressed');
    setShowIntro(false);
  }

  function transitionToQuestion(nextIndex: number) {
    Animated.timing(questionOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentIndex(nextIndex);
      Animated.timing(questionOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }

  function handleSelect(value: number) {
    console.log(`[Phase2] Question ${currentQuestion.id} answered: ${value}`);
    setAnswer(currentQuestion.id, value);

    setTimeout(() => {
      if (currentIndex < PHASE_2_QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        const updatedAnswers = { ...answers, [currentQuestion.id]: value };
        const phaseAnswers: Phase2Answers = {
          P2_Q1: updatedAnswers['P2_Q1'] ?? 3,
          P2_Q2: updatedAnswers['P2_Q2'] ?? 3,
          P2_Q3: updatedAnswers['P2_Q3'] ?? 3,
          P2_Q4: updatedAnswers['P2_Q4'] ?? 3,
          P2_Q5: updatedAnswers['P2_Q5'] ?? 3,
          P2_Q6: updatedAnswers['P2_Q6'] ?? 3,
          P2_Q7: updatedAnswers['P2_Q7'] ?? 3,
          P2_Q8: updatedAnswers['P2_Q8'] ?? 3,
          P2_Q9: updatedAnswers['P2_Q9'] ?? 3,
          P2_Q10: updatedAnswers['P2_Q10'] ?? 3,
        };
        console.log('[Phase2] All questions answered, storing phase 2 answers:', phaseAnswers);
        computePhase2Scores(phaseAnswers);
        saveCheckpoint([1, 2], updatedAnswers, 2, PHASE_2_QUESTIONS.length - 1).catch(() => {});
        router.push('/onboarding/phase-complete?phase=2');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase2] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  async function handleSaveAndExit() {
    console.log('[Phase2] Save & Continue Later pressed — currentIndex:', currentIndex, 'answers:', Object.keys(answers).length);
    try {
      await saveCheckpoint([1], answers, 2, currentIndex);
      await updateAppState({ currentOnboardingStep: '/onboarding/phase-2', onboardingStarted: true });
      console.log('[Phase2] Checkpoint saved successfully');
    } catch (e) {
      console.warn('[Phase2] Failed to save checkpoint:', e);
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

  if (showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <OverallProgressBar phase={2} questionIndex={0} />
        <Animated.View
          style={{
            flex: 1,
            paddingHorizontal: 32,
            paddingBottom: 32,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: screenOpacity,
            transform: [{ translateY: screenTranslateY }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: '20%',
              alignSelf: 'center',
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: 'rgba(111,138,106,0.06)',
            }}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 10,
                fontFamily: 'Inter_400Regular',
                color: '#2F3E2F',
                opacity: 0.45,
                textTransform: 'uppercase',
                letterSpacing: 2.5,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Phase 2 of 4
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontFamily: 'Lora_700Bold',
                color: '#1E2E1E',
                lineHeight: 32,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              What Drives You
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Inter_400Regular',
                color: 'rgba(47,62,47,0.60)',
                lineHeight: 26,
                textAlign: 'center',
                maxWidth: 300,
              }}
            >
              {INTRO_TEXT}
            </Text>
          </View>

          <View style={{ width: '100%', paddingBottom: 16 }}>
            <AnimatedPressable
              onPress={handleBegin}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 14,
                height: 54,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Begin"
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 16,
                  fontFamily: 'Inter_600SemiBold',
                  fontWeight: '600',
                }}
              >
                Begin
              </Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </View>
    );
  }

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
        <OverallProgressBar phase={2} questionIndex={currentIndex} />
        <View style={{ height: 32 }} />
        <PhaseHeader
          phase={2}
          title="What Drives You"
          current={currentIndex + 1}
          total={PHASE_2_QUESTIONS.length}
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
