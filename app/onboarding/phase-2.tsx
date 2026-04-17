import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const PHASE_2_QUESTIONS = [
  { id: 'P2_Q1',  text: 'I tend to keep the peace, even if it means not fully expressing myself.' },
  { id: 'P2_Q2',  text: 'I feel a strong responsibility to step up and take charge.' },
  { id: 'P2_Q3',  text: 'I experience emotions deeply and they often shape my day.' },
  { id: 'P2_Q4',  text: 'I feel most secure when things are organized and under control.' },
  { id: 'P2_Q5',  text: 'I sense when I\'m meant to step forward and influence.' },
  { id: 'P2_Q6',  text: 'I am driven to understand the deeper meaning behind things.' },
  { id: 'P2_Q7',  text: 'I feel a strong pull to stand up for what is right.' },
  { id: 'P2_Q8',  text: 'I avoid conflict because it feels uncomfortable.' },
  { id: 'P2_Q9',  text: 'I feel pressure to do things well and follow through.' },
  { id: 'P2_Q10', text: 'I sometimes hold back from being fully seen.' },
  { id: 'P2_Q11', text: 'I can get stuck thinking instead of taking action.' },
  { id: 'P2_Q12', text: 'When something feels unjust, I feel it strongly.' },
];

const INTRO_TEXT = "Now we'll explore what moves you beneath the surface—your motivations and patterns.";

export default function Phase2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, computePhase2Scores } = useContext(DiscoveryContext);
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const questionOpacity = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
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
        console.log('[Phase2] All questions answered, computing phase2 scores');
        computePhase2Scores();
        router.push('/onboarding/phase-2-reflection');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase2] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  const scaleValues = [1, 2, 3, 4, 5];

  if (showIntro) {
    return (
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 32,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              color: COLORS.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 1,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Phase 2 of 4
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Lora_700Bold',
              color: COLORS.text,
              textAlign: 'center',
              letterSpacing: -0.2,
              marginBottom: 32,
            }}
          >
            What Drives You
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontFamily: 'Inter_400Regular',
              color: COLORS.textSecondary,
              lineHeight: 28,
              textAlign: 'center',
              maxWidth: 300,
            }}
          >
            {INTRO_TEXT}
          </Text>
        </View>

        <View style={{ width: '100%' }}>
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
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
      <PhaseHeader
        phase={2}
        title="What Drives You"
        current={currentIndex + 1}
        total={PHASE_2_QUESTIONS.length}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            opacity: questionOpacity,
            alignItems: 'center',
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Lora_700Bold',
              color: COLORS.text,
              lineHeight: 30,
              textAlign: 'center',
              marginBottom: 48,
              letterSpacing: -0.2,
            }}
          >
            {currentQuestion.text}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
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
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_400Regular',
                color: COLORS.textTertiary,
              }}
            >
              Not like me
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'Inter_400Regular',
                color: COLORS.textTertiary,
              }}
            >
              Very much like me
            </Text>
          </View>
        </Animated.View>
      </View>

      {currentIndex > 0 && (
        <AnimatedPressable
          onPress={handlePrevious}
          style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 }}
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
    </Animated.View>
  );
}
