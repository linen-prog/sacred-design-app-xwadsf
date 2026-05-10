import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext, Phase1Answers } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { OverallProgressBar } from '@/components/OverallProgressBar';
import { saveCheckpoint } from '@/utils/quizCheckpoint';
import { updateAppState } from '@/utils/appState';
import { saveAndExitOnboarding } from '@/utils/saveAndExit';

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
    if (saveState === 'saving') return;
    setSaveState('saving');
    console.log('[SaveExit] tapped');
    try {
      const { verified } = await saveAndExitOnboarding({
        phase: 1,
        questionIndex: currentIndex,
        answers,
        completedPhases: [],
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
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
