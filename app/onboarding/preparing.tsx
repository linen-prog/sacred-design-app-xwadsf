import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, Animated, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeOnboarding } from '@/utils/onboardingStorage';
import { markQuizComplete } from '@/utils/quizState';
import { updateAppState } from '@/utils/appState';

export default function PreparingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { computeSacredDesign, sacredDesignResult, phase1Scores, phase2Scores, phase3Scores, phase4Scores } = useContext(DiscoveryContext);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateY = useRef(new Animated.Value(20)).current;
  const hasNavigated = useRef(false);
  const hasCalledCompute = useRef(false);
  const [showRetry, setShowRetry] = useState(false);

  // Navigate as soon as result is ready
  useEffect(() => {
    if (sacredDesignResult && !hasNavigated.current) {
      hasNavigated.current = true; // set BEFORE async work to block NavigationGuard immediately
      console.log('[Preparing] sacredDesignResult ready — writing AppState and navigating to /partial-reveal');
      markQuizComplete();
      updateAppState({
        quizCompleted: true,
        postQuizSaveCompleted: true,  // mark as done so NavigationGuard never routes to /post-quiz-save
        revealUnlocked: false,
        revealViewed: false,
        primaryArchetype: sacredDesignResult.primary_archetype,
        secondaryArchetype: sacredDesignResult.secondary_archetype,
        currentOnboardingStep: '/partial-reveal',
      }).then(() => {
        console.log('[Preparing] AppState written — navigating to /partial-reveal');
        router.replace('/partial-reveal');
      }).catch((e) => {
        console.warn('[Preparing] AppState write failed — navigating anyway:', e);
        router.replace('/partial-reveal');
      });
      Promise.all([
        completeOnboarding(),
        AsyncStorage.setItem('hasCompletedQuiz', 'true'),
      ]).catch((e) => console.warn('[Preparing] Failed to write completion state:', e));
    }
  }, [sacredDesignResult, router]);

  useEffect(() => {
    updateAppState({ currentOnboardingStep: '/onboarding/preparing' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (hasCalledCompute.current) return;
    if (!phase1Scores || !phase2Scores || !phase3Scores || !phase4Scores) {
      console.log('[Preparing] Waiting for phase scores to load from storage…', {
        p1: !!phase1Scores, p2: !!phase2Scores, p3: !!phase3Scores, p4: !!phase4Scores,
      });
      return;
    }
    hasCalledCompute.current = true;
    console.log('[Preparing] All phase scores ready — computing Sacred Design');
    computeSacredDesign();
  }, [phase1Scores, phase2Scores, phase3Scores, phase4Scores, computeSacredDesign]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseAnimation.start();

    // Fallback timeout in case state update is delayed
    const timer = setTimeout(() => {
      if (!hasNavigated.current) {
        if (sacredDesignResult) {
          hasNavigated.current = true; // set BEFORE async work
          console.log('[Preparing] Fallback timeout — writing AppState and navigating to /partial-reveal');
          markQuizComplete();
          updateAppState({
            quizCompleted: true,
            postQuizSaveCompleted: true,
            revealUnlocked: false,
            revealViewed: false,
            primaryArchetype: sacredDesignResult.primary_archetype,
            secondaryArchetype: sacredDesignResult.secondary_archetype,
            currentOnboardingStep: '/partial-reveal',
          }).then(() => {
            router.replace('/partial-reveal');
          }).catch(() => {
            router.replace('/partial-reveal');
          });
          Promise.all([
            completeOnboarding(),
            AsyncStorage.setItem('hasCompletedQuiz', 'true'),
          ]).catch((e) => console.warn('[Preparing] Fallback: failed to write completion state:', e));
        } else {
          console.warn('[Preparing] Fallback timeout — sacredDesignResult still null. Staying on screen.');
          // Do NOT navigate away — show a retry UI instead
        }
      }
    }, 5000);

    // Show retry UI after 6 seconds if still not navigated
    const retryTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        setShowRetry(true);
      }
    }, 6000);

    return () => {
      clearTimeout(timer);
      clearTimeout(retryTimer);
      pulseAnimation.stop();
    };
  }, [pulseScale, router, screenOpacity, screenTranslateY, sacredDesignResult]);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: '#000000',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: screenOpacity,
        transform: [{ translateY: screenTranslateY }],
      }}
    >
      {/* Back button */}
      <Pressable
        onPress={() => {
          console.log('[Preparing] Back pressed');
          router.back();
        }}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          zIndex: 999,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 22,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.7)" />
      </Pressable>

      {/* logo */}
      <Animated.Image
        source={require('@/assets/images/e449825b-bcc9-4442-a79e-80d7eea37d18.jpeg')}
        style={{
          width: 120,
          height: 120,
          resizeMode: 'contain',
          marginBottom: 32,
          transform: [{ scale: pulseScale }],
        }}
      />

      <Text
        style={{
          fontSize: 22,
          fontFamily: 'Lora_700Bold',
          color: '#FFFFFF',
          textAlign: 'center',
          lineHeight: 32,
          letterSpacing: -0.2,
          marginBottom: 12,
        }}
      >
        {"We're preparing\nyour Sacred Design\u2026"}
      </Text>

      <Text
        style={{
          fontSize: 15,
          fontFamily: 'Inter_400Regular',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
        }}
      >
        This will just take a moment.
      </Text>

      {showRetry && (
        <View style={{ marginTop: 32, alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8 }}>
            This is taking longer than expected.
          </Text>
          <Pressable
            onPress={() => {
              console.log('[Preparing] Retry pressed');
              setShowRetry(false);
              hasCalledCompute.current = false;
              computeSacredDesign();
            }}
            style={{ backgroundColor: 'rgba(201,168,76,0.15)', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)' }}
          >
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#C9A84C' }}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              console.log('[Preparing] Start Over pressed from preparing screen');
              await updateAppState({
                quizCompleted: false,
                revealUnlocked: false,
                revealViewed: false,
                postQuizSaveCompleted: false,
                currentOnboardingStep: '/onboarding/welcome',
              });
              router.replace('/onboarding/welcome');
            }}
            style={{ paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Start Over</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}
