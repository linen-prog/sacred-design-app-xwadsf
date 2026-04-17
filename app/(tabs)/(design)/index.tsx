import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SECTIONS = [
  { label: "Blend Name" },
  { label: "Archetypes" },
  { label: "Narrative" },
  { label: "Strengths" },
  { label: "Growth Path" },
];

export default function MyDesignScreen() {
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
      <Text style={styles.title}>My Design</Text>
      <Text style={styles.subtitle}>
        Your Sacred Design profile will appear here once your discovery is complete.
      </Text>

      <View style={styles.card}>
        {SECTIONS.map((section, index) => {
          const isLast = index === SECTIONS.length - 1;
          return (
            <View key={section.label}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{section.label}</Text>
                <View style={styles.rowPlaceholder} />
              </View>
              {!isLast && <View style={styles.divider} />}
            </View>
          );
        })}
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
  card: {
    backgroundColor: "#FFFDF7",
    borderRadius: 16,
    paddingHorizontal: 20,
    borderCurve: "continuous",
    // @ts-expect-error — RN web supports boxShadow
    boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  rowLabel: {
    fontFamily: "Lora_400Regular",
    fontSize: 15,
    color: "#3D3530",
  },
  rowPlaceholder: {
    width: 80,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(168,176,162,0.25)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(168,176,162,0.2)",
    marginHorizontal: -20,
    marginLeft: 0,
  },
});
