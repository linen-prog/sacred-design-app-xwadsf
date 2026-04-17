import React, { createContext, useState, useCallback } from 'react';

interface DiscoveryContextType {
  answers: Record<string, number>;
  setAnswer: (id: string, value: number) => void;
  resetAnswers: () => void;
}

export const DiscoveryContext = createContext<DiscoveryContextType>({
  answers: {},
  setAnswer: () => {},
  resetAnswers: () => {},
});

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const setAnswer = useCallback((id: string, value: number) => {
    console.log(`[DiscoveryContext] setAnswer: ${id} = ${value}`);
    setAnswers(prev => ({ ...prev, [id]: value }));
  }, []);

  const resetAnswers = useCallback(() => {
    console.log('[DiscoveryContext] resetAnswers');
    setAnswers({});
  }, []);

  return (
    <DiscoveryContext.Provider value={{ answers, setAnswer, resetAnswers }}>
      {children}
    </DiscoveryContext.Provider>
  );
}
