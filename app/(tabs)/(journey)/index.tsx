import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();

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
      <Text style={styles.title}>Journey</Text>
      <Text style={styles.subtitle}>
        Your daily alignments and reflections will appear here.
      </Text>

      <View style={styles.emptyArea}>
        <View style={styles.emptyInner}>
          <Text style={styles.emptyIcon}>◌</Text>
          <Text style={styles.emptyText}>No entries yet</Text>
          <Text style={styles.emptyHint}>
            Complete your Sacred Discovery to begin your journey.
          </Text>
        </View>
      </View>
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
  },
  title: {
    fontFamily: "Lora_400Regular",
    fontSize: 32,
    color: "#3D3530",
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: "System",
    fontSize: 15,
    color: "#8A8070",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyArea: {
    backgroundColor: "#FFFDF7",
    borderRadius: 20,
    borderCurve: "continuous",
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    // @ts-expect-error — RN web supports boxShadow
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  },
  emptyInner: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
    color: "#A8B5A2",
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    color: "#8A8070",
  },
  emptyHint: {
    fontFamily: "System",
    fontSize: 14,
    color: "#A8B5A2",
    textAlign: "center",
    lineHeight: 20,
  },
});
