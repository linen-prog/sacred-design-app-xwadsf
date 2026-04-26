import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ARCHETYPE_CONTENT, ArchetypeName } from '@/constants/ArchetypeContent';

const COLORS = {
  background: '#F6F1E8',
  text: '#2F3E2F',
  textMuted: 'rgba(47,62,47,0.60)',
  accent: '#6F8A6A',
  surface: '#FFFFFF',
  border: 'rgba(111,138,106,0.15)',
  shadowCard: '#F5EDE0',   // warm amber tint — stuck
  pathCard: '#EDF3EC',     // warm green tint — path forward
  shadowBorder: 'rgba(180,120,60,0.18)',
  pathBorder: 'rgba(80,130,80,0.18)',
  dividerLine: 'rgba(111,138,106,0.25)',
};

const STATIC_PRACTICE_BODY =
  "Each day, Sacred Design generates a personalised alignment — a small, sacred act drawn from your specific design. Over time, these micro-practices reshape the patterns that keep you stuck. Your reflections are saved so you can look back and see how far you've come.";

export default function ShadowPathScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { archetype, stuck } = useLocalSearchParams<{ archetype: string; stuck: string }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const archetypeName = archetype as ArchetypeName | undefined;
  const stuckIndex = parseInt(stuck ?? '0', 10);

  const content = archetypeName ? ARCHETYPE_CONTENT[archetypeName] : null;
  const item = content?.stuckToStrength?.[stuckIndex];

  useEffect(() => {
    console.log(`[ShadowPath] Screen mounted — archetype: "${archetypeName}", stuckIndex: ${stuckIndex}`);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, archetypeName, stuckIndex]);

  const handleBack = () => {
    console.log('[ShadowPath] Back button pressed');
    router.back();
  };

  const handleCTA = () => {
    console.log('[ShadowPath] "See Today\'s Alignment" pressed — navigating to tabs');
    router.push('/(tabs)');
  };

  if (!content || !item) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={handleBack} style={styles.fallbackBack}>
          <Text style={styles.fallbackBackText}>← Back</Text>
        </Pressable>
        <Text style={styles.fallbackText}>Content not found.</Text>
      </View>
    );
  }

  const stuckText = item.stuck;
  const pathForwardText = item.pathForward;
  const appHelpText = item.appHelp;

  return (
    <View style={styles.container}>
      {/* Custom back header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header area */}
          <Text style={styles.archetypeSmallCaps}>{archetypeName}</Text>
          <Text style={styles.stuckTitle}>{stuckText}</Text>

          {/* Shadow Card */}
          <View style={styles.shadowCard}>
            <Text style={styles.cardLabel}>Where you get stuck</Text>
            <Text style={styles.shadowCardBody}>{stuckText}</Text>
          </View>

          {/* Arrow connector */}
          <View style={styles.arrowConnector}>
            <View style={styles.arrowLine} />
            <Text style={styles.arrowDown}>↓</Text>
            <View style={styles.arrowLine} />
          </View>

          {/* Path Forward Card */}
          <View style={styles.pathCard}>
            <Text style={styles.cardLabel}>Your path forward</Text>
            <Text style={styles.pathCardBody}>{pathForwardText}</Text>
          </View>

          {/* Decorative divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionDividerLine} />
            <View style={styles.sectionDividerDot} />
            <View style={styles.sectionDividerLine} />
          </View>

          {/* How Sacred Design helps */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>How Sacred Design helps you with this</Text>
            <Text style={styles.helpBody}>{appHelpText}</Text>
          </View>

          {/* Decorative divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionDividerLine} />
            <View style={styles.sectionDividerDot} />
            <View style={styles.sectionDividerLine} />
          </View>

          {/* Daily practice block */}
          <View style={styles.practiceBlock}>
            <Text style={styles.practiceTitle}>What this looks like in practice</Text>
            <Text style={styles.practiceBody}>{STATIC_PRACTICE_BODY}</Text>
          </View>

          {/* CTA */}
          <AnimatedPressable onPress={handleCTA} style={styles.ctaButton}>
            <Text style={styles.ctaLabel}>See Today's Alignment</Text>
          </AnimatedPressable>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 16,
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.accent,
    lineHeight: 22,
  },
  backLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: COLORS.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  archetypeSmallCaps: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: COLORS.accent,
    marginBottom: 10,
  },
  stuckTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 22,
    color: COLORS.text,
    lineHeight: 32,
    letterSpacing: -0.2,
    marginBottom: 28,
  },
  // Shadow card — warm amber tint
  shadowCard: {
    backgroundColor: COLORS.shadowCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.shadowBorder,
    shadowColor: '#8B5E2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  shadowCardBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
  },
  // Arrow connector
  arrowConnector: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 0,
  },
  arrowLine: {
    width: 1.5,
    height: 16,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  arrowDown: {
    fontSize: 20,
    color: COLORS.accent,
    lineHeight: 28,
  },
  // Path forward card — warm green tint
  pathCard: {
    backgroundColor: COLORS.pathCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.pathBorder,
    shadowColor: '#3A6B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  pathCardBody: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: COLORS.text,
    lineHeight: 28,
    letterSpacing: 0.1,
  },
  // Decorative divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.dividerLine,
  },
  sectionDividerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.5,
  },
  // How Sacred Design helps
  helpSection: {
    gap: 12,
  },
  helpTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  helpBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 24,
  },
  // Daily practice block
  practiceBlock: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#2F3E2F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
  },
  practiceTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  practiceBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  // CTA
  ctaButton: {
    marginTop: 28,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Fallback
  fallback: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  fallbackBack: {
    paddingVertical: 8,
    marginBottom: 24,
  },
  fallbackBackText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: COLORS.accent,
  },
  fallbackText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.textMuted,
  },
});
