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
  { id: 'q1_1', text: 'I tend to think things through carefully before acting.' },
  { id: 'q1_2', text: 'I feel most alive when I\'m helping others find their way.' },
  { id: 'q1_3', text: 'I naturally take charge when a situation needs direction.' },
  { id: 'q1_4', text: 'I notice details that others often miss.' },
  { id: 'q1_5', text: 'I prefer harmony over conflict, even when I disagree.' },
  { id: 'q1_6', text: 'I find meaning in understanding the deeper \'why\' behind things.' },
  { id: 'q1_7', text: 'I feel energized by bringing people together.' },
  { id: 'q1_8', text: 'I tend to feel things deeply, even when I don\'t show it.' },
  { id: 'q1_9', text: 'I\'m drawn to creating order and structure in my environment.' },
  { id: 'q1_10', text: 'I often sense what others are feeling before they say it.' },
];

export default function Phase1Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { answers, setAnswer } = useContext(DiscoveryContext);
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
      if (currentIndex < QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        console.log('[Phase1] All questions answered, navigating to reflection');
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

  const scaleValues = [1, 2, 3, 4, 5];

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
        phase={1}
        title="How You Operate"
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
