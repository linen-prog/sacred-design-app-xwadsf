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
  { id: 'q3_1', text: 'People often come to me for guidance or perspective.' },
  { id: 'q3_2', text: 'I naturally encourage others and help them see their potential.' },
  { id: 'q3_3', text: 'I show up most powerfully in moments of crisis or challenge.' },
  { id: 'q3_4', text: 'I tend to lead by example rather than by instruction.' },
  { id: 'q3_5', text: 'I bring a sense of peace and calm to the spaces I enter.' },
  { id: 'q3_6', text: 'I often find myself advocating for those who can\'t speak for themselves.' },
  { id: 'q3_7', text: 'I show up as a truth-teller, even when it\'s not what people want to hear.' },
  { id: 'q3_8', text: 'I naturally create environments where others feel safe and seen.' },
  { id: 'q3_9', text: 'I show up as a builder—I love creating systems and structures that last.' },
  { id: 'q3_10', text: 'I tend to carry the emotional weight of the people around me.' },
];

const INTRO_TEXT = "You were created with a unique way of showing up in the world.";

export default function Phase3Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useContext(DiscoveryContext);
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
    console.log('[Phase3] Begin questions pressed');
    setShowIntro(false);
  }

  function transitionToQuestion(nextIndex: number) {
    Animated.timing(questionOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentIndex(nextIndex);
      Animated.timing(questionOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }

  function handleSelect(value: number) {
    console.log(`[Phase3] Question ${currentQuestion.id} answered: ${value}`);
    setAnswer(currentQuestion.id, value);

    setTimeout(() => {
      if (currentIndex < QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        console.log('[Phase3] All questions answered, navigating to reflection');
        router.push('/onboarding/phase-3-reflection');
      }
    }, 300);
  }

  function handlePrevious() {
    console.log('[Phase3] Previous question pressed');
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
            Phase 3 of 4
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
            How You Show Up
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
        phase={3}
        title="How You Show Up"
        current={currentIndex + 1}
        total={QUESTIONS.length}
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
