import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const PHASE_1_QUESTIONS = [
  { id: 'Q1', text: 'I feel energized being around people and engaging in conversation.' },
  { id: 'Q2', text: 'I often need quiet or alone time to reset.' },
  { id: 'Q3', text: 'I tend to notice and feel what others are experiencing emotionally.' },
  { id: 'Q4', text: 'I feel a strong pull to take responsibility and follow through.' },
  { id: 'Q5', text: 'I enjoy exploring new ideas and deeper meaning.' },
  { id: 'Q6', text: 'I can become overwhelmed when things feel uncertain.' },
  { id: 'Q7', text: 'I naturally step into leadership when needed.' },
  { id: 'Q8', text: 'I prefer structure and clear expectations.' },
  { id: 'Q9', text: 'I value harmony and avoid conflict when possible.' },
  { id: 'Q10', text: 'I am drawn to purpose and deeper meaning in life.' },
];

const scaleValues = [1, 2, 3, 4, 5];

export default function Phase1Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, computePhase1Scores } = useContext(DiscoveryContext);
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
        console.log('[Phase1] All questions answered, computing scores and navigating to reflection');
        computePhase1Scores();
        router.push('/onboarding/phase-1-reflection');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase1] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  const guidanceText = 'Go with your first instinct.';
  const leftLabel = 'Not like me';
  const rightLabel = 'Feels very true';

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 28,
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
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
          marginTop: 32,
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
            marginTop: 40,
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
    </Animated.View>
  );
}
