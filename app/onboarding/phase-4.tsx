import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { PhaseHeader } from '@/components/PhaseHeader';
import { ScaleButton } from '@/components/ScaleButton';
import { AnimatedPressable } from '@/components/AnimatedPressable';

const QUESTIONS = [
  { id: 'P4_Q1', text: 'When I feel overwhelmed, I tend to shut down or withdraw.' },
  { id: 'P4_Q2', text: 'When something feels stressful, I feel it strongly in my body.' },
  { id: 'P4_Q3', text: 'I can usually return to a calm state after stress without much difficulty.' },
  { id: 'P4_Q4', text: 'I often stay busy or distracted to avoid uncomfortable feelings.' },
  { id: 'P4_Q5', text: 'I feel most at ease when things are predictable and steady.' },
  { id: 'P4_Q6', text: 'I can stay present and connected without feeling overwhelmed or shut down.' },
  { id: 'P4_Q7', text: 'I notice tension in my body when I\'m stressed (tight chest, shoulders, etc.).' },
  { id: 'P4_Q8', text: 'It\'s hard for me to slow down, even when I need rest.' },
];

const INTRO_TEXT = "Growth becomes lasting when it feels supported in your body.";

const scaleValues = [1, 2, 3, 4, 5];

export default function Phase4Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer, computePhase4Scores } = useContext(DiscoveryContext);
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
        console.log('[Phase4] All questions answered, computing phase4 scores');
        computePhase4Scores();
        console.log('[Phase4] Navigating to phase-4-reflection');
        router.push('/onboarding/phase-4-reflection');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase4] Previous question pressed');
    if (currentIndex > 0) {
      transitionToQuestion(currentIndex - 1);
    }
  }

  const guidanceText = 'Go with your first instinct.';
  const leftLabel = 'Not like me';
  const rightLabel = 'Feels very true';

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
              fontSize: 10,
              fontFamily: 'Inter_400Regular',
              color: '#2F3E2F',
              opacity: 0.45,
              textTransform: 'uppercase',
              letterSpacing: 2.5,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Phase 4 of 4
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Lora_700Bold',
              color: '#2F3E2F',
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            How You Stay Grounded
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
        paddingHorizontal: 28,
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
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
