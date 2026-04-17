import React, { useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";

// Placeholder — will be wired to real data later
const discoveryStatus: "none" | "in_progress" | "completed" = "none";

export default function HomeScreen() {
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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Warm glow orb — absolute, top center */}
        <View style={styles.glowOrb} pointerEvents="none" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Headline */}
          <Text style={styles.headline}>Bring Your Design to Life</Text>

          {/* Subtext */}
          <Text style={styles.subtext}>One small step today makes it real.</Text>

          {/* State-dependent card */}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F1E8",
  },
  container: {
    flex: 1,
    position: "relative",
  },
  glowOrb: {
    position: "absolute",
    top: -40,
    alignSelf: "center",
    left: "50%",
    marginLeft: -110,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(230, 211, 163, 0.45)",
    shadowColor: "rgba(230, 200, 120, 1)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    zIndex: 0,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 120,
    alignItems: "center",
  },
  headline: {
    fontFamily: "Lora_700Bold",
    fontSize: 34,
    color: "#2F3E2F",
    textAlign: "center",
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(47,62,47,0.5)",
    textAlign: "center",
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: "100%",
    marginTop: 40,
    marginHorizontal: 20,
    shadowColor: "#2F3E2F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(47,62,47,0.6)",
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: "#6F8A6A",
    borderRadius: 14,
    paddingVertical: 18,
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#6F8A6A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
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
