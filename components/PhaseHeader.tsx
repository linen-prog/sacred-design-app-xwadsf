import React from 'react';
import { View, Text } from 'react-native';

interface PhaseHeaderProps {
  phase: number;
  title: string;
  current: number;
  total: number;
}

export function PhaseHeader({ phase, title, current, total }: PhaseHeaderProps) {
  const progress = total > 0 ? current / total : 0;
  const progressWidth = `${progress * 100}%`;

  const phaseLabel = 'PHASE ';
  const phaseNum = String(phase);
  const phaseOf = ' OF 4';

  return (
    <View style={{ marginBottom: 0 }}>
      <Text
        style={{
          fontSize: 10,
          fontFamily: 'Inter_400Regular',
          color: '#2F3E2F',
          opacity: 0.45,
          textTransform: 'uppercase',
          letterSpacing: 2.5,
          textAlign: 'center',
        }}
      >
        {phaseLabel}
        {phaseNum}
        {phaseOf}
      </Text>
      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Lora_700Bold',
          color: '#2F3E2F',
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(47,62,47,0.12)',
          marginTop: 12,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: '#6F8A6A',
            width: progressWidth,
          }}
        />
      </View>
    </View>
  );
}
