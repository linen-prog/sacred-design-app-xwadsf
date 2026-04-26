import React from 'react';
import { View, Text } from 'react-native';

interface PhaseHeaderProps {
  phase: number;
  title: string;
  current: number;
  total: number;
}

export function PhaseHeader({ phase, title, current, total }: PhaseHeaderProps) {
  return (
    <View style={{ marginBottom: 0, alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 10,
          fontFamily: 'Inter_400Regular',
          color: '#2F3E2F',
          opacity: 0.35,
          textTransform: 'uppercase',
          letterSpacing: 2.5,
          textAlign: 'center',
        }}
      >
        {'PHASE '}
        {String(phase)}
        {' OF 4'}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontFamily: 'Lora_700Bold',
          color: '#2F3E2F',
          textAlign: 'center',
          marginTop: 4,
          opacity: 0.75,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontFamily: 'Inter_400Regular',
          color: 'rgba(47,62,47,0.35)',
          textAlign: 'center',
          marginTop: 6,
          letterSpacing: 0.5,
        }}
      >
        {`Question ${current} of ${total}`}
      </Text>
    </View>
  );
}
