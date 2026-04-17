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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sacredDesignResult } = useContext(DiscoveryContext);

  const greeting = getGreeting();

  const status: "none" | "in_progress" | "completed" =
    sacredDesignResult ? "completed" : discoveryStatus;

  const handleBeginDiscovery = () => {
    console.log("[HomeScreen] Begin Sacred Discovery pressed");
    router.push("/onboarding/welcome");
  };

  const handleContinueDiscovery = () => {
    console.log("[HomeScreen] Continue Your Discovery pressed");
    router.push("/onboarding/welcome");
  };

  const handleBringToLife = () => {
    console.log("[HomeScreen] Bring Your Design to Life pressed");
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
      {/* App name */}
      <Text style={styles.appName}>Sacred Design</Text>

      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>

      {/* State-dependent CTA */}
      {status === "none" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Begin Your Journey</Text>
          <Text style={styles.cardSubtitle}>
            Discover the sacred design woven into who you are.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleBeginDiscovery}
          >
            <Text style={styles.ctaButtonText}>Begin Sacred Discovery</Text>
          </Pressable>
        </View>
      )}

      {status === "in_progress" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Discovery Awaits</Text>
          <Text style={styles.cardSubtitle}>
            Pick up where you left off and continue uncovering your design.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleContinueDiscovery}
          >
            <Text style={styles.ctaButtonText}>Continue Your Discovery</Text>
          </Pressable>
        </View>
      )}

      {status === "completed" && (
        <View style={styles.card}>
          <Text style={styles.alignmentLabel}>Today's Alignment</Text>
          <Text style={styles.cardTitle}>Bring Your Design to Life</Text>
          <Text style={styles.cardSubtitle}>
            Your daily alignment will appear here once your Sacred Design is complete.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            onPress={handleBringToLife}
          >
            <Text style={styles.ctaButtonText}>View Today's Alignment</Text>
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
    fontFamily: "Lora_400Regular",
    fontSize: 13,
    color: "#8A8070",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 32,
    textAlign: "center",
  },
  greeting: {
    fontFamily: "Lora_400Regular",
    fontSize: 30,
    color: "#3D3530",
    textAlign: "center",
    marginBottom: 36,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: "#FFFDF7",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    borderCurve: "continuous",
    // @ts-expect-error — RN web supports boxShadow
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  },
  alignmentLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: 11,
    color: "#A8B5A2",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: "Lora_400Regular",
    fontSize: 20,
    color: "#3D3530",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: "System",
    fontSize: 15,
    color: "#8A8070",
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: "#6F8A6A",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    borderCurve: "continuous",
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
