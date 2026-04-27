import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const PHASE_QUESTION_COUNTS = [10, 10, 10, 7];
const TOTAL_QUESTIONS = 37;

function getCompletedQuestions(phase: number, questionIndex: number): number {
  let completed = 0;
  for (let p = 0; p < phase - 1; p++) {
    completed += PHASE_QUESTION_COUNTS[p];
  }
  completed += questionIndex;
  return completed;
}

interface OverallProgressBarProps {
  phase: number;
  questionIndex: number;
}

export function OverallProgressBar({ phase, questionIndex }: OverallProgressBarProps) {
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
    <View style={{ width: '100%', height: 1.5, backgroundColor: 'rgba(47,62,47,0.06)' }}>
      <Animated.View
        style={{
          height: 1.5,
          backgroundColor: 'rgba(111,138,106,0.35)',
          width: widthInterpolated,
          borderRadius: 1,
        }}
      />
    </View>
  );
}
