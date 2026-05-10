import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { loadCheckpoint, clearCheckpoint, getNextPhaseRoute, QuizCheckpoint } from '@/utils/quizCheckpoint';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { useAppState } from '@/contexts/AppStateContext';

const PHASE_META = [
  { num: 1, icon: '🌱', name: 'How You Operate', subname: 'The Foundation' },
  { num: 2, icon: '🔥', name: 'What Drives You', subname: 'The Fire' },
  { num: 3, icon: '💧', name: 'How You Show Up', subname: 'The Flow' },
  { num: 4, icon: '✨', name: 'How You Stay Grounded', subname: 'The Spark' },
];

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setAnswer } = useContext(DiscoveryContext);
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_600SemiBold });
  const [checkpoint, setCheckpoint] = useState<QuizCheckpoint | null>(null);
  const [checkpointLoaded, setCheckpointLoaded] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { appState, isLoading: appStateLoading, updateAppState } = useAppState();

  // Soft guard — allow entry if retakeQuiz() explicitly set this step, block accidental re-entry
  useEffect(() => {
    if (appStateLoading) return;
    if (!appState.quizCompleted) return; // quiz not done yet — allow normal flow

    // Quiz is completed. Only allow entry if retakeQuiz() explicitly set this step.
    if (appState.currentOnboardingStep !== '/onboarding/intro') {
      console.log('[Intro] quizCompleted=true and not a retake — redirecting away');
      if (appState.revealViewed) {
        router.replace('/(tabs)');
      } else if (appState.revealUnlocked) {
        router.replace('/onboarding/preparing');
      } else {
        router.replace('/partial-reveal');
      }
    } else {
      console.log('[Intro] quizCompleted=true but retakeQuiz() was called — allowing entry');
    }
  }, [appStateLoading, appState.quizCompleted, appState.currentOnboardingStep, appState.revealViewed, appState.revealUnlocked, router]);

  useEffect(() => {
    loadCheckpoint().then((cp) => {
      setCheckpoint(cp && cp.completedPhases.length > 0 ? cp : null);
      setCheckpointLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (checkpointLoaded) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointLoaded]);

  async function handleContinue() {
    console.log('[Intro] Continue pressed — starting fresh');
    await updateAppState({ currentOnboardingStep: '/onboarding/phase-1' });
    await new Promise(resolve => setTimeout(resolve, 75));
    router.push('/onboarding/phase-1');
  }

  async function handleResume() {
    if (!checkpoint) return;
    // Restore answers into context
    Object.entries(checkpoint.answers).forEach(([id, value]) => {
      setAnswer(id, value);
    });
    const nextRoute = getNextPhaseRoute(checkpoint);
    const resumeIndex = checkpoint.currentQuestionIndex ?? 0;
    console.log('[Intro] Resume pressed — completedPhases:', checkpoint.completedPhases, 'currentPhase:', checkpoint.currentPhase, 'resumeIndex:', resumeIndex, 'nextRoute:', nextRoute);
    await updateAppState({ currentOnboardingStep: nextRoute, onboardingStarted: true });
    const routeWithIndex = resumeIndex > 0 ? `${nextRoute}?resumeIndex=${resumeIndex}` : nextRoute;
    router.push(routeWithIndex as Parameters<typeof router.push>[0]);
  }

  function handleStartOver() {
    console.log('[Intro] Start Over pressed');
    Alert.alert(
      'Start Over?',
      'This will clear your saved progress and restart the assessment from the beginning.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: async () => {
            console.log('[Intro] Start Over confirmed — clearing checkpoint');
            await clearCheckpoint();
            setCheckpoint(null);
          },
        },
      ]
    );
  }

  if (!fontsLoaded || !checkpointLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F6F1E8' }} />;
  }

  const bottomPadding = insets.bottom + 24;
  const hasCheckpoint = checkpoint !== null;
  const completedPhases = checkpoint?.completedPhases ?? [];
  const nextPhaseNum = completedPhases.length + 1;

  // ── RESUME MODE ──────────────────────────────────────────────────────────────
  if (hasCheckpoint) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
        <Animated.ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: 28,
            paddingTop: 20,
            paddingBottom: bottomPadding + 100,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* Overline */}
          <Text
            style={{
              fontSize: 11,
              color: '#C9A84C',
              textAlign: 'center',
              fontWeight: '500',
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            Welcome Back
          </Text>

          {/* Heading */}
          <Text
            style={{
              fontFamily: 'Lora_600SemiBold',
              fontSize: 26,
              color: '#2F3E2F',
              textAlign: 'center',
              lineHeight: 36,
              letterSpacing: -0.3,
              marginBottom: 12,
            }}
          >
            Resume Your Journey
          </Text>

          {/* Subtext */}
          <Text
            style={{
              fontFamily: 'Lora_400Regular',
              fontSize: 16,
              color: '#4A5E4A',
              textAlign: 'center',
              lineHeight: 26,
              marginBottom: 40,
              maxWidth: 300,
            }}
          >
            Your progress has been saved. Pick up right where you left off.
          </Text>

          {/* Phase status rows */}
          <View style={{ width: '100%', gap: 12, marginBottom: 44 }}>
            {PHASE_META.map((p) => {
              const isCompleted = completedPhases.includes(p.num);
              const isCurrent = p.num === nextPhaseNum;
              const isLocked = !isCompleted && !isCurrent;

              const statusIcon = isCompleted ? '✅' : isCurrent ? '▶' : '○';
              const rowOpacity = isLocked ? 0.4 : 1;
              const borderColor = isCompleted
                ? 'rgba(201,168,76,0.4)'
                : isCurrent
                ? 'rgba(111,138,106,0.5)'
                : 'rgba(47,62,47,0.1)';
              const bgColor = isCompleted
                ? 'rgba(201,168,76,0.06)'
                : isCurrent
                ? 'rgba(111,138,106,0.08)'
                : 'rgba(47,62,47,0.03)';

              return (
                <View
                  key={p.num}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: bgColor,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    opacity: rowOpacity,
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 14 }}>{p.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: 'Inter_600SemiBold',
                        color: '#2F3E2F',
                        fontWeight: '600',
                      }}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter_400Regular',
                        color: 'rgba(47,62,47,0.55)',
                        marginTop: 2,
                      }}
                    >
                      {p.subname}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: isCompleted ? 18 : 16,
                      color: isCompleted ? '#C9A84C' : isCurrent ? '#6F8A6A' : 'rgba(47,62,47,0.3)',
                    }}
                  >
                    {statusIcon}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Resume CTA */}
          <AnimatedPressable
            onPress={handleResume}
            style={{
              backgroundColor: '#6F8A6A',
              borderRadius: 18,
              paddingVertical: 18,
              width: '100%',
              alignItems: 'center',
              shadowColor: '#6F8A6A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.28,
              shadowRadius: 12,
              elevation: 4,
            }}
            accessibilityRole="button"
            accessibilityLabel="Continue your journey"
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 17,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Continue
            </Text>
          </AnimatedPressable>

          {/* Start over link */}
          <Pressable
            onPress={handleStartOver}
            style={{ marginTop: 20, paddingVertical: 8, paddingHorizontal: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Start over"
          >
            <Text
              style={{
                fontSize: 13,
                color: 'rgba(47,62,47,0.45)',
                textAlign: 'center',
                textDecorationLine: 'underline',
              }}
            >
              Start Over
            </Text>
          </Pressable>
        </Animated.ScrollView>
      </View>
    );
  }

  // ── FRESH START MODE ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F1E8' }}>
      <Animated.ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 32,
          paddingTop: 16,
          paddingBottom: bottomPadding + 100,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Top label */}
        <Text
          style={{
            fontSize: 12,
            color: '#6F8A6A',
            textAlign: 'center',
            fontWeight: '400',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 28,
          }}
        >
          A sacred discovery process
        </Text>

        {/* Main paragraph */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 19,
            color: '#2F3E2F',
            textAlign: 'center',
            lineHeight: 31,
            marginBottom: 20,
          }}
        >
          {"You'll answer a few simple questions to understand how you naturally think, feel, and show up."}
        </Text>

        {/* Deep assessment blurb — warm italic */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 15,
            color: 'rgba(111,138,106,0.85)',
            textAlign: 'center',
            lineHeight: 25,
            fontStyle: 'italic',
            marginBottom: 28,
            paddingHorizontal: 8,
          }}
        >
          {"This is a deep, full-spectrum assessment of your sacred design — 37 questions across 4 dimensions of your soul. Most people complete it in one sitting (about 10–15 minutes), but you can save your progress and return anytime."}
        </Text>

        {/* Reassurance line */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 17,
            color: '#4A5E4A',
            textAlign: 'center',
            lineHeight: 28,
            marginBottom: 28,
          }}
        >
          {"There are no right or wrong answers\u2014just your honest experience."}
        </Text>

        {/* Outcome line */}
        <Text
          style={{
            fontFamily: 'Lora_400Regular',
            fontSize: 17,
            color: '#5A5A5A',
            textAlign: 'center',
            lineHeight: 27,
            marginBottom: 44,
          }}
        >
          {"At the end, you'll receive your Sacred Design."}
        </Text>

        {/* Phase list */}
        <View style={{ alignItems: 'center', gap: 18, marginBottom: 52 }}>
          {PHASE_META.map((p) => (
            <View key={p.num} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>{p.icon}</Text>
              <Text
                style={{
                  fontSize: 15,
                  color: '#6F8A6A',
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                {p.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Growth blurb */}
        <Text
          style={{
            fontSize: 13,
            color: 'rgba(47,62,47,0.65)',
            textAlign: 'center',
            lineHeight: 21,
            letterSpacing: 0.2,
            marginTop: 8,
            marginBottom: 40,
            paddingHorizontal: 8,
          }}
        >
          {"As you move through this, you'll begin to see yourself more clearly\u2014and grow into a more grounded version of who you already are."}
        </Text>

        {/* Micro-text above button */}
        <Text
          style={{
            fontSize: 12,
            color: '#A0A0A0',
            textAlign: 'center',
            marginBottom: 14,
            letterSpacing: 0.2,
          }}
        >
          Go with your first instinct.
        </Text>

        {/* Continue button */}
        <AnimatedPressable
          onPress={handleContinue}
          style={{
            backgroundColor: '#6F8A6A',
            borderRadius: 18,
            paddingVertical: 18,
            width: '100%',
            alignItems: 'center',
            shadowColor: '#6F8A6A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 4,
          }}
          accessibilityRole="button"
          accessibilityLabel="Begin your discovery"
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 17,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            Begin Your Discovery
          </Text>
        </AnimatedPressable>
      </Animated.ScrollView>
    </View>
  );
}
