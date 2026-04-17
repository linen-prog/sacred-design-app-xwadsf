import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedPressable from "@/components/AnimatedPressable";

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const ACCENT = "#6F8A6A";
const TEXT_MUTED = "rgba(47,62,47,0.55)";
const DIVIDER = "rgba(47,62,47,0.08)";
const CARD_BG = "#FFFFFF";

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: "" };
  if (typeof source === "string") return { uri: source };
  return source as ImageSourcePropType;
}

const PILLARS = [
  {
    icon: "✦",
    title: "Know Your Design",
    description: "Discover your sacred archetype and the unique pattern of your soul.",
  },
  {
    icon: "◎",
    title: "Your Journey",
    description: "Track your reflections and witness your unfolding over time.",
  },
  {
    icon: "❧",
    title: "Live Aligned",
    description: "Integrate your design into daily life with intention and grace.",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBeginPress() {
    console.log("[Home] Begin Discovery pressed");
    router.push("/(tabs)/(design)");
  }

  function handlePillarPress(title: string) {
    console.log("[Home] Pillar pressed:", title);
  }

  const topPadding = insets.top + 24;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.heroSection}>
        <Image
          source={resolveImageSource(require("@/assets/images/72057605-fb00-4601-8fac-ab7091e359b9.jpeg"))}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroTextContainer}>
          <Text style={styles.eyebrow}>SACRED DESIGN</Text>
          <Text style={styles.heroTitle}>Know Thyself</Text>
          <Text style={styles.heroSubtitle}>
            A contemplative path to understanding your soul's unique blueprint.
          </Text>
        </View>
      </View>

      {/* Intro */}
      <View style={styles.introSection}>
        <Text style={styles.introText}>
          Every soul carries a sacred pattern — a design woven before time. Sacred Design
          is your guide to uncovering it, living from it, and returning to it again and again.
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Pillars */}
      <View style={styles.pillarsSection}>
        <Text style={styles.sectionLabel}>THREE PILLARS</Text>
        {PILLARS.map((pillar, index) => {
          const isLast = index === PILLARS.length - 1;
          return (
            <AnimatedPressable
              key={pillar.title}
              onPress={() => handlePillarPress(pillar.title)}
            >
              <View style={[styles.pillarRow, !isLast && styles.pillarRowBorder]}>
                <View style={styles.pillarIcon}>
                  <Text style={styles.pillarIconText}>{pillar.icon}</Text>
                </View>
                <View style={styles.pillarBody}>
                  <Text style={styles.pillarTitle}>{pillar.title}</Text>
                  <Text style={styles.pillarDescription}>{pillar.description}</Text>
                </View>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaHeading}>Begin Your Discovery</Text>
        <Text style={styles.ctaBody}>
          Take the Sacred Design assessment and receive your personal archetype profile.
        </Text>
        <AnimatedPressable onPress={handleBeginPress}>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>Discover My Design</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Footer quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "The privilege of a lifetime is to become who you truly are."
        </Text>
        <Text style={styles.quoteAuthor}>— C.G. Jung</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingBottom: 120,
  },

  // Hero
  heroSection: {
    marginHorizontal: 24,
    borderRadius: 24,
    overflow: "hidden",
    height: 280,
    marginBottom: 32,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,30,20,0.38)",
  },
  heroTextContainer: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 24,
  },
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 2.5,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    lineHeight: 44,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 8,
    lineHeight: 21,
  },

  // Intro
  introSection: {
    paddingHorizontal: 28,
    marginBottom: 32,
  },
  introText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 16,
    color: TEXT,
    lineHeight: 26,
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginHorizontal: 24,
    marginBottom: 32,
  },

  // Pillars
  pillarsSection: {
    marginHorizontal: 24,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_MUTED,
    paddingTop: 20,
    paddingBottom: 4,
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 18,
    gap: 16,
  },
  pillarRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  pillarIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(111,138,106,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  pillarIconText: {
    fontSize: 16,
    color: ACCENT,
  },
  pillarBody: {
    flex: 1,
  },
  pillarTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
    marginBottom: 4,
  },
  pillarDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 20,
  },

  // CTA
  ctaSection: {
    marginHorizontal: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  ctaHeading: {
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    color: TEXT,
    textAlign: "center",
    marginBottom: 10,
  },
  ctaBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  ctaButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
  },
  ctaButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Quote
  quoteSection: {
    marginHorizontal: 28,
    alignItems: "center",
  },
  quoteText: {
    fontFamily: "Lora_400Regular_Italic",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(47,62,47,0.35)",
    letterSpacing: 0.5,
  },
});
