import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";

const BG = "#F5F0EB";
const TEXT = "#2C3A2C";
const TEXT_MUTED = "#9A9A8E";
const CARD_BG = "#FFFFFF";
const BUTTON_BG = "#4A6741";

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined
): ImageSourcePropType {
  if (!source) return { uri: "" };
  if (typeof source === "string") return { uri: source };
  return source as ImageSourcePropType;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  function handleBeginPress() {
    console.log("[Home] 'Bring Your Design to Life' button pressed");
    router.push("/(tabs)/(design)");
  }

  const topPadding = insets.top + 20;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Eyebrow */}
      <Text style={styles.eyebrow}>SACRED DESIGN</Text>

      {/* Hero heading */}
      <Text style={styles.heroTitle}>Bring Your{"\n"}Design to Life</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>One small step today makes it real.</Text>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Begin Your Journey</Text>
        <Text style={styles.cardBody}>
          Discover how you naturally think, feel, and show up—and begin living it.
        </Text>
        <AnimatedPressable onPress={handleBeginPress}>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Bring Your Design to Life</Text>
          </View>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 3.5,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 40,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 42,
    color: TEXT,
    textAlign: "center",
    lineHeight: 52,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  card: {
    width: "100%",
    backgroundColor: CARD_BG,
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 22,
    color: TEXT,
    textAlign: "center",
    marginBottom: 12,
  },
  cardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  button: {
    backgroundColor: BUTTON_BG,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
