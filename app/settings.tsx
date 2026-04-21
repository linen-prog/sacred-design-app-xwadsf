import React, { useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { DiscoveryContext } from "@/contexts/DiscoveryContext";
import { useRetakeQuiz } from "@/hooks/useRetakeQuiz";

const BG = "#F6F1E8";
const TEXT = "#2F3E2F";
const TEXT_MUTED = "rgba(47,62,47,0.50)";
const TEXT_ROW = "#2F3E2F";
const SECTION_LABEL_COLOR = "rgba(47,62,47,0.45)";
const RESET_COLOR = "#8A7060";
const DIVIDER = "rgba(47,62,47,0.07)";

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function InfoRow({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

function TappableRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const labelStyle = danger ? styles.rowLabelDanger : styles.rowLabel;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={labelStyle}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { sacredDesignResult, clearSacredDesign } = useContext(DiscoveryContext);

  const { promptRetake } = useRetakeQuiz();

  const isSignedIn = !!(user && (user as { isAnonymous?: boolean }).isAnonymous !== true);
  const userName = (user as { name?: string } | null)?.name ?? null;
  const userEmail = (user as { email?: string } | null)?.email ?? null;

  const primaryArchetype = sacredDesignResult?.primary_archetype ?? null;
  const blendName = sacredDesignResult?.blend_name ?? null;

  const subtitleText = isSignedIn
    ? (userName ?? userEmail ?? "Signed in")
    : "Not signed in";

  async function handleSignOut() {
    console.log("[Settings] 'Sign Out' pressed");
    await signOut();
    router.replace("/onboarding/welcome");
  }

  function handleSignIn() {
    console.log("[Settings] 'Sign In / Create Account' pressed");
    router.push("/auth-screen");
  }

  function handleRetakeDiscovery() {
    console.log("[Settings] 'Retake Discovery' pressed — clearing sacred design");
    clearSacredDesign();
    router.replace("/onboarding/welcome");
  }

  function handleBack() {
    console.log("[Settings] Back button pressed");
    router.back();
  }

  const archetypeDisplay = primaryArchetype ?? "Not completed";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <Pressable onPress={handleBack} style={styles.backButton}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* Header */}
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>{subtitleText}</Text>

      {/* Account section */}
      <SectionLabel text="ACCOUNT" />
      <View style={styles.sectionCard}>
        {isSignedIn ? (
          <>
            {userName ? (
              <>
                <InfoRow label={userName} />
                <RowDivider />
              </>
            ) : null}
            {userEmail ? (
              <>
                <InfoRow label={userEmail} />
                <RowDivider />
              </>
            ) : null}
            <TappableRow label="Sign Out" onPress={handleSignOut} />
          </>
        ) : (
          <TappableRow label="Sign In / Create Account" onPress={handleSignIn} />
        )}
      </View>

      {/* Discovery section */}
      <SectionLabel text="YOUR DISCOVERY" />
      <View style={styles.sectionCard}>
        <InfoRow label={archetypeDisplay} />
        {blendName ? (
          <>
            <RowDivider />
            <InfoRow label={blendName} />
          </>
        ) : null}
        <RowDivider />
        <TappableRow
          label="Retake Quiz"
          onPress={promptRetake}
          danger
        />
        <RowDivider />
        <TappableRow
          label="Retake Discovery"
          onPress={handleRetakeDiscovery}
          danger
        />
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
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
    alignSelf: "flex-start",
  },
  backArrow: {
    fontSize: 20,
    color: TEXT,
    lineHeight: 24,
  },
  backLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: TEXT,
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 36,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
    color: SECTION_LABEL_COLOR,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowPressed: {
    backgroundColor: "rgba(47,62,47,0.04)",
  },
  rowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT_ROW,
    flex: 1,
  },
  rowLabelDanger: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: RESET_COLOR,
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: TEXT_MUTED,
    lineHeight: 24,
  },
  rowDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginLeft: 16,
  },
});
