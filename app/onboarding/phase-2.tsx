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
  { id: 'q2_1', text: 'I feel driven to make things right when I see injustice.' },
  { id: 'q2_2', text: 'I often put others\' needs before my own.' },
  { id: 'q2_3', text: 'I\'m motivated by achieving goals and seeing results.' },
  { id: 'q2_4', text: 'I seek deep, meaningful connections over many surface-level ones.' },
  { id: 'q2_5', text: 'I feel compelled to speak truth, even when it\'s uncomfortable.' },
  { id: 'q2_6', text: 'I find purpose in serving quietly behind the scenes.' },
  { id: 'q2_7', text: 'I\'m motivated by a desire to protect and care for others.' },
  { id: 'q2_8', text: 'I feel most fulfilled when I\'m learning or teaching something new.' },
  { id: 'q2_9', text: 'I tend to take on more than I can handle because I care so much.' },
  { id: 'q2_10', text: 'I\'m driven by a sense of calling or purpose larger than myself.' },
  { id: 'q2_11', text: 'I feel unsettled when things feel chaotic or out of order.' },
  { id: 'q2_12', text: 'I\'m motivated by seeing others grow and flourish.' },
];

const INTRO_TEXT = "Now we'll explore what moves you beneath the surface—your motivations and patterns.";

export default function Phase2Screen() {
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
      if (currentIndex < QUESTIONS.length - 1) {
        transitionToQuestion(currentIndex + 1);
      } else {
        console.log('[Phase2] All questions answered, navigating to reflection');
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
