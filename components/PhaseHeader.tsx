import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface PhaseHeaderProps {
  phase: number;
  title: string;
  current: number;
  total: number;
}

export function PhaseHeader({ phase, title, current, total }: PhaseHeaderProps) {
  const progress = total > 0 ? current / total : 0;

  return (
    <View style={{ gap: 8, marginBottom: 32 }}>
      <Text
        style={{
          fontSize: 12,
          fontFamily: 'Inter_400Regular',
          color: COLORS.textTertiary,
          textTransform: 'uppercase',
          letterSpacing: 1,
          textAlign: 'center',
        }}
      >
        {'Phase '}
        {phase}
        {' of 4'}
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Lora_700Bold',
          color: COLORS.text,
          textAlign: 'center',
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: COLORS.primaryMuted,
          marginTop: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: COLORS.primary,
            width: `${progress * 100}%`,
          }}
        />
      </View>
    </View>
  );
}
