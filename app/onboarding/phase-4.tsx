import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext, Phase4Answers } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { saveCheckpoint } from '@/utils/quizCheckpoint';
import { updateAppState } from '@/utils/appState';
import { saveAndExitOnboarding } from '@/utils/saveAndExit';

const QUESTIONS = [
  { id: 'P4_Q1', text: 'I need peace and low conflict in my environment to feel safe.' },
  { id: 'P4_Q2', text: 'I recharge by taking on challenges and moving forward, not by resting.' },
  { id: 'P4_Q3', text: 'I need time to process my emotions before I can move on.' },
  { id: 'P4_Q4', text: 'Having a clear plan or routine helps me feel grounded.' },
  { id: 'P4_Q5', text: 'Being around people who are positive and hopeful restores me.' },
  { id: 'P4_Q6', text: 'I need solitude and reflection to feel centered.' },
  { id: 'P4_Q7', text: "I feel most grounded when I'm working toward something that matters." },
];

const INTRO_TEXT = "Growth becomes lasting when it feels supported in your body.";

const scaleValues = [1, 2, 3, 4, 5];

export default function Phase4Screen() {
  const router = useRouter();
  const { resumeIndex } = useLocalSearchParams<{ resumeIndex?: string }>();
  const { answers, setAnswer, computePhase4Scores } = useContext(DiscoveryContext);
  const [showIntro, setShowIntro] = useState(() => {
    const idx = parseInt(resumeIndex ?? '0', 10);
    return isNaN(idx) || idx === 0;
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = parseInt(resumeIndex ?? '0', 10);
    return isNaN(idx) ? 0 : idx;
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSavedModal, setShowSavedModal] = useState(false);
  const questionOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    console.log('[Phase4] mount — updating currentOnboardingStep to /onboarding/phase-4');
    updateAppState({ currentOnboardingStep: '/onboarding/phase-4' }).catch(() => {});
  }, [screenOpacity, screenTranslateY]);

  const currentQuestion = QUESTIONS[currentIndex];
  const selectedValue = answers[currentQuestion?.id ?? ''];

  function handleBegin() {
    console.log('[Phase4] Begin questions pressed');
    setShowIntro(false);
  }

  function transitionToQuestion(nextIndex: number) {
    Animated.timing(questionOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentIndex(nextIndex);
      Animated.timing(questionOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }

  function handleSelect(value: number) {
    console.log(`[Phase4] Question ${currentQuestion.id} answered: ${value}`);
    setAnswer(currentQuestion.id, value);

    setTimeout(() => {
      if (currentIndex < QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        const updatedAnswers = { ...answers, [currentQuestion.id]: value };
        const phaseAnswers: Phase4Answers = {
          P4_Q1: updatedAnswers['P4_Q1'] ?? 3,
          P4_Q2: updatedAnswers['P4_Q2'] ?? 3,
          P4_Q3: updatedAnswers['P4_Q3'] ?? 3,
          P4_Q4: updatedAnswers['P4_Q4'] ?? 3,
          P4_Q5: updatedAnswers['P4_Q5'] ?? 3,
          P4_Q6: updatedAnswers['P4_Q6'] ?? 3,
          P4_Q7: updatedAnswers['P4_Q7'] ?? 3,
        };
        console.log('[Phase4] All questions answered, storing phase 4 answers:', phaseAnswers);
        computePhase4Scores(phaseAnswers);
        saveCheckpoint([1, 2, 3, 4], updatedAnswers, 4, QUESTIONS.length - 1).catch(() => {});
        console.log('[Phase4] Navigating to phase-complete screen');
        router.push('/onboarding/phase-complete?phase=4');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase4] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  async function handleSaveAndExit() {
    if (saveState === 'saving') return;
    setSaveState('saving');
    console.log('[SaveExit] tapped');
    try {
      const { verified } = await saveAndExitOnboarding({
        phase: 4,
        questionIndex: currentIndex,
        answers,
        completedPhases: [1, 2, 3],
      });
      if (verified) {
        setSaveState('saved');
        setShowSavedModal(true);
      } else {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    } catch (e) {
      console.error('[SaveExit] failed:', e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  const guidanceText = 'Go with your first instinct.';
  const leftLabel = 'Never like me';
  const rightLabel = 'Always like me';

  const saveButtonColor = saveState === 'error'
    ? '#C0392B'
    : saveState === 'saved'
    ? '#4A7C59'
    : 'rgba(47,62,47,0.38)';
  const saveButtonDecoration = saveState === 'idle' ? 'underline' : 'none';
  const saveButtonText = saveState === 'saving'
    ? 'Saving\u2026'
    : saveState === 'saved'
    ? 'Saved \u2713'
    : saveState === 'error'
    ? "Couldn't save. Tap to retry."
    : 'Save & Continue Later';

  const savedModal = (
    <Modal
      visible={showSavedModal}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            backgroundColor: '#F6F1E8',
            borderRadius: 24,
            paddingVertical: 36,
            paddingHorizontal: 28,
            alignItems: 'center',
            width: '100%',
            maxWidth: 380,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 8,
          }}
        >
          <View
            style={{
              width: 40,
              height: 3,
              borderRadius: 2,
              backgroundColor: '#C9A84C',
              marginBottom: 24,
            }}
          />
          <Text
            style={{
              fontFamily: 'Lora_700Bold',
              fontSize: 22,
              color: '#2F3E2F',
              textAlign: 'center',
              marginBottom: 14,
              lineHeight: 30,
            }}
          >
            Your progress is saved
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: 'rgba(47,62,47,0.65)',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 32,
            }}
          >
            {"You've completed this part of your discovery. You can come back anytime and continue when you're ready."}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[SaveExit] Return Home pressed');
              setShowSavedModal(false);
              setTimeout(() => router.replace('/onboarding/welcome'), 50);
            }}
            style={{
              backgroundColor: '#6F8A6A',
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 40,
              alignItems: 'center',
              width: '100%',
              shadowColor: '#6F8A6A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel="Return Home"
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontFamily: 'Inter_600SemiBold',
                fontWeight: '600',
              }}
            >
              Return Home
            </Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );

  if (showIntro) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {savedModal}
        <OverallProgressBar phase={4} questionIndex={0} />
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
              Phase 4 of 4
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontFamily: 'Lora_700Bold',
                color: '#1E2E1E',
                textAlign: 'center',
                lineHeight: 32,
                marginBottom: 16,
              }}
            >
              How You Stay Grounded
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
      {savedModal}
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
        <OverallProgressBar phase={4} questionIndex={currentIndex} />
        <View style={{ height: 32 }} />
        <PhaseHeader
          phase={4}
          title="How You Stay Grounded"
          current={currentIndex + 1}
          total={QUESTIONS.length}
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
          disabled={saveState === 'saving' || saveState === 'saved'}
          style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Save and continue later"
        >
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'Inter_400Regular',
              color: saveButtonColor,
              textDecorationLine: saveButtonDecoration,
            }}
          >
            {saveButtonText}
          </Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}
