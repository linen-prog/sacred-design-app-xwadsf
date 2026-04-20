import React, { useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { ARCHETYPE_CONTENT, ArchetypeName } from "@/app/reveal";

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const ACCENT = "#6F8A6A";
const TEXT_MUTED = "rgba(47,62,47,0.55)";
const TEXT_BODY = "rgba(47,62,47,0.8)";
const TEXT_ITEM = "rgba(47,62,47,0.75)";
const DIVIDER = "rgba(47,62,47,0.08)";
const PLACEHOLDER_BG = "rgba(47,62,47,0.12)";
const SECTION_LABEL_COLOR = "rgba(47,62,47,0.4)";

const SECONDARY_INFLUENCE: Record<string, string> = {
  'Peacemaker': 'Brings a calming, relational quality to how you show up.',
  'Courageous Leader': 'Adds boldness and initiative to your expression.',
  'Deep Feeler': 'Deepens emotional attunement and sensitivity.',
  'Faithful Steward': 'Grounds your gifts in consistency and follow-through.',
  'Light Bearer': 'Infuses your presence with warmth and encouragement.',
  'Truth Seeker': 'Sharpens your discernment and desire for depth.',
  'Justice Carrier': 'Fuels a passion for what matters and who is overlooked.',
};

const PLACEHOLDER_ROWS = [
  { label: "Blend Name" },
  { label: "Archetypes" },
  { label: "Narrative" },
  { label: "Strengths" },
  { label: "Growth Path" },
];

function Divider() {
  return <View style={styles.divider} />;
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function DotRow({ text }: { text: string }) {
  return (
    <View style={styles.dotRow}>
      <View style={styles.dot} />
      <Text style={styles.dotText}>{text}</Text>
    </View>
  );
}

function renderListOrString(value: string[] | string | undefined, fallback?: string) {
  if (!value && fallback) {
    return <Text style={styles.bodyText}>{fallback}</Text>;
  }
  if (!value) return null;
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, i) => (
          <DotRow key={i} text={item} />
        ))}
      </>
    );
  }
  return <Text style={styles.bodyText}>{value}</Text>;
}

export default function MyDesignScreen() {
  const { sacredDesignResult } = useContext(DiscoveryContext);

  if (!sacredDesignResult) {
    console.log("[MyDesign] No sacredDesignResult — showing placeholder");
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.emptyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>My Design</Text>
        <Text style={styles.subtitle}>
          Your Sacred Design profile will appear here once your discovery is complete.
        </Text>

        <View style={styles.card}>
          {PLACEHOLDER_ROWS.map((row, index) => {
            const isLast = index === PLACEHOLDER_ROWS.length - 1;
            return (
              <View key={row.label}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardRowLabel}>{row.label}</Text>
                  <View style={styles.cardRowPill} />
                </View>
                {!isLast && <View style={styles.cardDivider} />}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  console.log("[MyDesign] Rendering sacredDesignResult:", sacredDesignResult);

  const primary = sacredDesignResult.primary_archetype as ArchetypeName;
  const secondary = sacredDesignResult.secondary_archetype as ArchetypeName;
  const content = ARCHETYPE_CONTENT[primary];

  const archetypeLine = `${primary} · ${secondary}`;
  const hasStuckPatterns = content?.stuckPatterns && content.stuckPatterns.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top section */}
      <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>
      <Text style={styles.blendName}>{sacredDesignResult.blend_name}</Text>
      <Text style={styles.archetypeLine}>{archetypeLine}</Text>

      <Divider />

      {/* Narrative */}
      <SectionLabel text="WHO YOU ARE" />
      <Text style={styles.bodyText}>{content?.narrative}</Text>

      <Divider />

      {/* Strengths */}
      <SectionLabel text="YOUR STRENGTHS" />
      {renderListOrString(content?.strengths)}

      <Divider />

      {/* Stuck Patterns */}
      {hasStuckPatterns && (
        <>
          <SectionLabel text="WHERE YOU GET STUCK" />
          {renderListOrString(content?.stuckPatterns)}
          <Divider />
        </>
      )}

      {/* Growth Path */}
      <SectionLabel text="YOUR GROWTH PATH" />
      <View style={styles.growthPathCard}>
        <Text style={styles.bodyText}>{content?.growthPath}</Text>
      </View>

      {/* Secondary archetype section */}
      {secondary && ARCHETYPE_CONTENT[secondary] && (() => {
        const secondaryContent = ARCHETYPE_CONTENT[secondary];
        const secondaryInfluence = SECONDARY_INFLUENCE[secondary] ?? "";
        return (
          <>
            <View style={styles.sectionDivider} />
            <Text style={styles.secondaryEyebrow}>YOUR SECONDARY ARCHETYPE</Text>
            <Text style={styles.secondaryName}>{secondary}</Text>
            {secondaryInfluence ? (
              <Text style={styles.secondaryInfluenceText}>{secondaryInfluence}</Text>
            ) : null}
            <Divider />
            <SectionLabel text="SECONDARY STRENGTHS" />
            {renderListOrString(secondaryContent.strengths)}
            <Divider />
            <SectionLabel text="GROWTH PATH" />
            <View style={styles.growthPathCard}>
              <Text style={styles.bodyText}>{secondaryContent.growthPath}</Text>
            </View>
          </>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  emptyContent: {
    paddingTop: 60,
    paddingHorizontal: 28,
    paddingBottom: 120,
  },
  resultContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },

  // Empty state
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 32,
    color: TEXT,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_MUTED,
    marginTop: 10,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 32,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  cardRowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },
  cardRowPill: {
    width: 100,
    height: 10,
    borderRadius: 5,
    backgroundColor: PLACEHOLDER_BG,
  },
  cardDivider: {
    height: 1,
    backgroundColor: DIVIDER,
  },

  // Result state
  eyebrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 2.5,
    color: SECTION_LABEL_COLOR,
    marginBottom: 8,
  },
  blendName: {
    fontFamily: "Lora_700Bold",
    fontSize: 34,
    color: TEXT,
    lineHeight: 42,
  },
  archetypeLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: ACCENT,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  divider: {
    marginVertical: 28,
    height: 1,
    backgroundColor: DIVIDER,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    color: SECTION_LABEL_COLOR,
    marginBottom: 12,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_BODY,
    lineHeight: 24,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
    marginTop: 8,
  },
  dotText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_ITEM,
    lineHeight: 22,
    flex: 1,
  },
  growthPathCard: {
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    paddingLeft: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 32,
  },
  secondaryEyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: ACCENT,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  secondaryName: {
    fontFamily: "Lora_700Bold",
    fontSize: 24,
    color: TEXT,
    lineHeight: 32,
    marginBottom: 10,
  },
  secondaryInfluenceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 22,
    marginBottom: 4,
  },
});
