/**
 * Paywall Screen
 *
 * Shows subscription options and handles purchases.
 * Supports two entry points via `source` param:
 *   - quiz_complete: shown after quiz, before results
 *   - day2_upsell: shown from home screen Day 2+ banner
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Purchases, { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAppState } from "@/contexts/AppStateContext";
import { useAuth } from "@/contexts/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "✨",
    title: "Your Sacred Design Results",
    description: "See your full archetype blend and what it means for your life",
  },
  {
    icon: "🌿",
    title: "Daily Alignment Practice",
    description: "Personalized daily actions rooted in your sacred design",
  },
  {
    icon: "🔥",
    title: "Streak & Journey Tracking",
    description: "Track your growth with reflections and day streaks",
  },
  {
    icon: "📖",
    title: "Full Reflection History",
    description: "Revisit every alignment and reflection you've written",
  },
];

// Sacred Design color palette
const COLORS = {
  gradientTop: "#0A0E1A",
  gradientMid: "#1A1030",
  gradientBot: "#0D1A14",
  gold: "#C9A84C",
  goldLight: "rgba(201,168,76,0.25)",
  white: "#F5F0E8",
  whiteMuted: "rgba(245,240,232,0.7)",
  whiteDim: "rgba(245,240,232,0.45)",
  cardBg: "rgba(245,240,232,0.08)",
  cardBorder: "rgba(201,168,76,0.25)",
  selectedBorder: "#C9A84C",
  selectedBg: "rgba(201,168,76,0.12)",
};

export default function PaywallScreen() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { updateAppState } = useAppState();
  const { user } = useAuth();
  const REVIEWER_EMAIL = "review@sacreddesign.app";
  const isReviewAccount = (user as any)?.email?.toLowerCase() === REVIEWER_EMAIL;

  const {
    packages,
    offerings,
    loading,
    isSubscribed,
    isWeb,
    purchasePackage,
    restorePurchases,
    checkSubscription,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(packages[0] || null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isReviewAccount) {
      console.log("[ReviewBypass] Reviewer on paywall — auto-navigating past paywall");
      router.replace("/(tabs)");
    }
  }, [isReviewAccount]);

  React.useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      setSelectedPackage(packages[0]);
    }
  }, [packages, selectedPackage]);

  // Debug: log RevenueCat offering/package/price data whenever selectedPackage changes
  React.useEffect(() => {
    console.log("RevenueCat offerings:", JSON.stringify(offerings, null, 2));
    console.log("Selected package:", selectedPackage?.identifier);
    console.log("Product identifier:", selectedPackage?.product?.identifier);
    console.log("Price string:", selectedPackage?.product?.priceString);
    console.log("Price number:", selectedPackage?.product?.price);
    console.log("Currency code:", selectedPackage?.product?.currencyCode);
  }, [selectedPackage, offerings]);

  // Reviewer bypass — render nothing while the useEffect redirect fires
  if (isReviewAccount) return null;

  // Derive copy from source param
  const isQuizComplete = source === "quiz_complete";
  const headingText = isQuizComplete
    ? "Your Sacred Design is ready."
    : "Unlock Your Full Journey";
  const subtitleText = isQuizComplete
    ? "Unlock your full results and begin your daily practice."
    : "Continue your daily practice with full access.";
  const badgeText = "SACRED DESIGN FULL ACCESS";

  const ENTITLEMENT_ID = "pro";

  async function navigateAfterPurchase() {
    console.log("[Paywall] navigateAfterPurchase — verifying entitlement and updating state");
    setVerifying(true);
    try {
      // Force re-check entitlement from RevenueCat to confirm purchase is active
      await checkSubscription(true);
      // Directly verify entitlement is active via CustomerInfo (state updates are async)
      const customerInfo = await Purchases.getCustomerInfo();
      if (!customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        console.warn("[Paywall] Entitlement not active after purchase verification");
        Alert.alert(
          "Purchase not confirmed yet.",
          "Please wait a moment and try restoring purchases."
        );
        return;
      }
      // Update app state flags
      await updateAppState({
        subscriptionActive: true,
        revealUnlocked: true,
      });
      // Small buffer to let state propagate before navigation
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log("[Paywall] Entitlement confirmed — navigating to /reveal");
      router.replace("/reveal");
    } catch (err) {
      console.warn("[Paywall] navigateAfterPurchase error:", err);
      Alert.alert(
        "Purchase verification failed.",
        "Please restore purchases or contact support."
      );
    } finally {
      setVerifying(false);
    }
  }

  function handleClose() {
    console.log("[Paywall] Close pressed — source:", source, "canGoBack:", router.canGoBack());
    router.replace("/partial-reveal");
  }

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    console.log("[Paywall] Purchase pressed — package:", selectedPackage.identifier, "productId:", selectedPackage.product.identifier, "price:", selectedPackage.product.priceString);
    try {
      setPurchasing(true);
      setPurchaseError(null);
      console.log("[Paywall] Calling purchasePackage...");
      const success = await purchasePackage(selectedPackage);
      if (success) {
        console.log("[Paywall] purchasePackage returned success — navigating");
        navigateAfterPurchase();
      } else {
        console.log("[Paywall] purchasePackage returned false (cancelled or no entitlement)");
      }
    } catch (error: any) {
      console.warn("[Paywall] Purchase error caught:", error?.message);
      setPurchaseError(error?.message || "Purchase could not be completed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    console.log("[Paywall] Restore purchases pressed");
    try {
      setRestoring(true);
      const restored = await restorePurchases();
      if (restored) {
        console.log("[Paywall] Restore successful");
        Alert.alert("Restored!", "Your subscription has been restored.", [
          { text: "OK", onPress: navigateAfterPurchase },
        ]);
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases.");
      }
    } catch (error: any) {
      console.warn("[Paywall] Restore failed:", error?.message);
      Alert.alert("Restore Failed", error.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  // Already subscribed
  if (isSubscribed) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.subscribedContent}>
            <Text style={styles.celebrationIcon}>✨</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO MEMBER</Text>
            </View>
            <Text style={styles.subscribedTitle}>You're All Set!</Text>
            <Text style={styles.subscribedSubtitle}>
              Your Sacred Design journey is fully unlocked.
            </Text>
            <View style={styles.featuresCard}>
              <Text style={styles.featuresCardTitle}>Unlocked Features</Text>
              {FEATURES.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureCheckRow}>
                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <Text style={styles.featureCheckText}>{feature.title}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              console.log('[Paywall] isSubscribed Continue pressed — calling navigateAfterPurchase');
              navigateAfterPurchase();
            }}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Preparing your offer…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const featureIconColors = [
    "rgba(201,168,76,0.18)",
    "rgba(76,217,100,0.15)",
    "rgba(255,149,0,0.15)",
    "rgba(90,200,250,0.15)",
  ];

  const subscribeButtonLabel = selectedPackage
    ? selectedPackage.product.priceString
      ? `Subscribe for ${selectedPackage.product.priceString}/month`
      : "Subscribe for $4.99/month"
    : "Subscribe for $4.99/month";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMid, COLORS.gradientBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle gold orb top-right */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{badgeText}</Text>
            </View>
            <Text style={styles.title}>{headingText}</Text>
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresCardTitle}>Everything Included</Text>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: featureIconColors[index % featureIconColors.length] }]}>
                  <Text style={styles.featureIconText}>{feature.icon}</Text>
                </View>
                <View style={styles.featureTextBlock}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Package Selection */}
          {packages.length > 0 && (
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                    onPress={() => {
                      console.log("[Paywall] Package selected:", pkg.identifier);
                      setSelectedPackage(pkg);
                      setPurchaseError(null);
                    }}
                  >
                    {isSelected && <View style={styles.packageSelectedBar} />}
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                      {isSelected && (
                        <View style={styles.checkmarkCircle}>
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                      )}
                    </View>
                    {pkg.product.priceString ? (
                      <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                    ) : null}
                    {pkg.product.description ? (
                      <Text style={styles.packageDescription}>{pkg.product.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* No packages — retry UI */}
          {!isWeb && packages.length === 0 && !loading && (
            <View style={styles.noPackagesContainer}>
              <Text style={styles.noPackagesText}>
                Unable to load subscription options.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  console.log('[Paywall] Retry offerings tapped');
                  checkSubscription(true);
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {isWeb ? (
            <>
              <TouchableOpacity style={styles.primaryButton} disabled>
                <Text style={styles.primaryButtonText}>Purchases available in the mobile app</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={COLORS.whiteMuted} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.legalText}>Preview mode — purchases available in the mobile app</Text>
            </>
          ) : (
            <>
              <Text style={styles.pricingLine}>
                {selectedPackage?.product.priceString
                  ? `${selectedPackage.product.priceString}/month • Auto-renews. Cancel anytime.`
                  : "$4.99/month • Auto-renews. Cancel anytime."}
              </Text>
              {purchaseError && (
                <View style={styles.purchaseErrorBox}>
                  <Text style={styles.purchaseErrorText}>{purchaseError}</Text>
                  <TouchableOpacity onPress={() => setPurchaseError(null)}>
                    <Text style={styles.purchaseErrorDismiss}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!selectedPackage || purchasing) && styles.buttonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!selectedPackage || purchasing}
              >
                {purchasing ? (
                  <ActivityIndicator color={COLORS.gradientTop} />
                ) : (
                  <Text style={styles.primaryButtonText}>{subscribeButtonLabel}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRestore} disabled={restoring}>
                {restoring ? (
                  <ActivityIndicator size="small" color={COLORS.whiteMuted} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.legalText}>
                Payment charged to your {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account at confirmation.
                Subscription auto-renews monthly. Cancel anytime in your account settings.
              </Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => {
                  console.log('[Paywall] Privacy Policy tapped');
                  Linking.openURL('https://sacreddesign-app.com/privacy');
                }} activeOpacity={0.7}>
                  <Text style={styles.legalLinkText}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.legalLinkSeparator}> · </Text>
                <TouchableOpacity onPress={() => {
                  console.log('[Paywall] Terms of Use tapped');
                  Linking.openURL('https://sacreddesign-app.com/terms');
                }} activeOpacity={0.7}>
                  <Text style={styles.legalLinkText}>Terms of Use</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>

      {verifying && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.verifyingText}>Verifying purchase…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  orb1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(201,168,76,0.06)",
    top: -80,
    right: -80,
  },
  orb2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(201,168,76,0.04)",
    bottom: SCREEN_HEIGHT * 0.2,
    left: -60,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245,240,232,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontSize: 16,
    color: "rgba(245,240,232,0.6)",
    fontWeight: "600",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.whiteMuted,
    fontFamily: "Inter_400Regular",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  trialBadge: {
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 40,
    fontFamily: "Lora_700Bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.whiteMuted,
    textAlign: "center",
    lineHeight: 23,
    fontFamily: "Inter_400Regular",
  },
  featuresCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 20,
    marginBottom: 20,
  },
  featuresCardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  featureIconText: {
    fontSize: 20,
  },
  featureTextBlock: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.whiteMuted,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  packagesContainer: {
    gap: 10,
    marginBottom: 8,
  },
  packageCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.15)",
    backgroundColor: "rgba(245,240,232,0.06)",
    overflow: "hidden",
  },
  packageCardSelected: {
    borderColor: COLORS.selectedBorder,
    borderWidth: 1.5,
    backgroundColor: COLORS.selectedBg,
  },
  packageSelectedBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.gold,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.white,
    fontFamily: "Inter_600SemiBold",
  },
  checkmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: "bold",
  },
  packagePrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 6,
    fontFamily: "Lora_700Bold",
  },
  packageDescription: {
    fontSize: 13,
    color: COLORS.whiteMuted,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  noPackagesContainer: {
    padding: 24,
    alignItems: "center",
  },
  noPackagesText: {
    fontSize: 15,
    color: COLORS.whiteMuted,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#0A0E1A",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    color: COLORS.whiteDim,
    fontFamily: "Inter_400Regular",
  },
  pricingLine: {
    fontSize: 13,
    color: COLORS.whiteMuted,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  legalText: {
    fontSize: 11,
    color: "rgba(245,240,232,0.35)",
    textAlign: "center",
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  legalLinkText: {
    fontSize: 11,
    color: 'rgba(245,240,232,0.45)',
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
  legalLinkSeparator: {
    fontSize: 11,
    color: 'rgba(245,240,232,0.25)',
    fontFamily: 'Inter_400Regular',
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  verifyingText: {
    fontSize: 16,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
  },
  // Subscribed state
  subscribedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  celebrationIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  proBadge: {
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: 1.5,
    fontFamily: "Inter_600SemiBold",
  },
  subscribedTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Lora_700Bold",
  },
  subscribedSubtitle: {
    fontSize: 15,
    color: COLORS.whiteMuted,
    textAlign: "center",
    marginBottom: 32,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  featureCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkMark: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: "bold",
  },
  featureCheckText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  purchaseErrorBox: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    gap: 6,
  },
  purchaseErrorText: {
    fontSize: 13,
    color: 'rgba(245,240,232,0.85)',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  purchaseErrorDismiss: {
    fontSize: 12,
    color: 'rgba(201,168,76,0.8)',
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  retryButtonText: {
    fontSize: 14,
    color: 'rgba(201,168,76,0.9)',
    fontFamily: 'Inter_400Regular',
  },
});
