import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Phase 1 = 10, Phase 2 = 10, Phase 3 = 10, Phase 4 = 7 → 37 total
const PHASE_QUESTION_COUNTS = [10, 10, 10, 7];
const TOTAL_QUESTIONS = 37;

function getCompletedQuestions(phase: number, questionIndex: number): number {
  // Sum all questions from completed phases before this one
  let completed = 0;
  for (let p = 0; p < phase - 1; p++) {
    completed += PHASE_QUESTION_COUNTS[p];
  }
  // Add current question index (0-based) within this phase
  completed += questionIndex;
  return completed;
}

interface OverallProgressBarProps {
  /** 1-4 */
  phase: number;
  /** 0-based index within the phase. Pass PHASE_QUESTION_COUNTS[phase-1] to show full phase completion. */
  questionIndex: number;
}

export function OverallProgressBar({ phase, questionIndex }: OverallProgressBarProps) {
  const insets = useSafeAreaInsets();
  const completed = getCompletedQuestions(phase, questionIndex);
  const ratio = Math.min(completed / TOTAL_QUESTIONS, 1);

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: ratio,
      duration: 350,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(201,168,76,0.18)',
        zIndex: 100,
      }}
    >
      <Animated.View
        style={{
          height: 4,
          backgroundColor: '#C9A84C',
          width: widthInterpolated,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}
