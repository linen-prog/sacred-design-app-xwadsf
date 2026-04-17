import React, { useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";

// Placeholder — will be wired to real data later
const discoveryStatus: "none" | "in_progress" | "completed" = "none";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);

  const status: "none" | "in_progress" | "completed" =
    sacredDesignResult ? "completed" : discoveryStatus;

  const handleBeginDiscovery = () => {
    console.log("[HomeScreen] Begin Discovery button pressed");
    router.push("/onboarding/welcome");
  };

  const handleContinueDiscovery = () => {
    console.log("[HomeScreen] Continue Discovery button pressed");
    router.push("/onboarding/welcome");
  };

  const handleBringToLife = () => {
    console.log("[HomeScreen] Bring Your Design to Life button pressed");
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* App name — minimal, subdued */}
      <Text style={styles.appName}>Sacred Design</Text>

      {/* Primary headline */}
      <Text style={styles.headline}>Bring Your Design to Life</Text>

      {/* Subtext */}
      <Text style={styles.subtext}>One small step today makes it real.</Text>

      {/* State-dependent CTA */}
      {status === "none" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Begin Your Journey</Text>
          <Text style={styles.cardBody}>
            Discover how you naturally think, feel, and show up—and begin living it.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleBeginDiscovery}
          >
            <Text style={styles.ctaButtonText}>Bring Your Design to Life</Text>
          </Pressable>
        </View>
      )}

      {status === "in_progress" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Discovery Awaits</Text>
          <Text style={styles.cardBody}>
            Discover how you naturally think, feel, and show up—and begin living it.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleContinueDiscovery}
          >
            <Text style={styles.ctaButtonText}>Bring Your Design to Life</Text>
          </Pressable>
        </View>
      )}

      {status === "completed" && (
        <View style={styles.card}>
          <Text style={styles.alignmentLabel}>Today's Alignment</Text>
          <Text style={styles.cardTitle}>Begin Your Journey</Text>
          <Text style={styles.cardBody}>
            Discover how you naturally think, feel, and show up—and begin living it.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleBringToLife}
          >
            <Text style={styles.ctaButtonText}>Bring Your Design to Life</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#F6F1E8",
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  appName: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#2F3E2F",
    letterSpacing: 3,
    textTransform: "uppercase",
    opacity: 0.35,
    textAlign: "center",
  },
  headline: {
    fontFamily: "Lora_700Bold",
    fontSize: 30,
    color: "#2F3E2F",
    textAlign: "center",
    marginTop: 32,
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(47,62,47,0.5)",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.2,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
    shadowColor: "#2F3E2F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  alignmentLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#A8B5A2",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: "#2F3E2F",
  },
  cardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(47,62,47,0.65)",
    lineHeight: 22,
    marginTop: 8,
  },
  ctaButton: {
    backgroundColor: "#6F8A6A",
    borderRadius: 16,
    paddingVertical: 16,
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#6F8A6A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    textAlign: "center",
  },
});
