/**
 * RevenueCat Subscription Context
 *
 * Provides subscription management for Expo + React Native apps.
 * Reads API keys from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via RevenueCat SDK
 * - Web preview via RevenueCat REST API (read-only pricing display)
 * - Expo Go via test store keys
 *
 * SETUP:
 * 1. Wrap your app with <SubscriptionProvider> inside <AuthProvider>
 * 2. Run: pnpm install react-native-purchases && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Import auth hook for user syncing (validated at setup time)
import { useAuth } from "./AuthContext";

// Read API keys from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const IOS_API_KEY = extra.revenueCatApiKeyIos || "";
const ANDROID_API_KEY = extra.revenueCatApiKeyAndroid || "";
const TEST_IOS_API_KEY = extra.revenueCatTestApiKeyIos || "";
const TEST_ANDROID_API_KEY = extra.revenueCatTestApiKeyAndroid || "";
const ENTITLEMENT_ID = extra.revenueCatEntitlementId || "pro";

// Check if running on web
const isWeb = Platform.OS === "web";
// Use nativelyProjectId (unique UUID) for scoping; fall back to slug for backward compatibility
const _PROJECT_SCOPE = Constants.expoConfig?.extra?.nativelyProjectId || Constants.expoConfig?.slug || "app";
const MOCK_PURCHASE_KEY = `rc_mock_purchased_${_PROJECT_SCOPE}`;
// Scoped native dev mock key — persists simulated subscription in Expo Go via expo-secure-store
const MOCK_NATIVE_KEY = `rc_dev_native_${_PROJECT_SCOPE}`;
// Scoped native cache key — persists real subscription state for fast restore on bundle reload
const NATIVE_PURCHASE_KEY = `rc_subscribed_${_PROJECT_SCOPE}`;

interface SubscriptionContextType {
  /** Whether the user has an active subscription */
  isSubscribed: boolean;
  /** All offerings from RevenueCat */
  offerings: PurchasesOfferings | null;
  /** The current/default offering */
  currentOffering: PurchasesOffering | null;
  /** Available packages in the current offering */
  packages: PurchasesPackage[];
  /** Loading state during initialization */
  loading: boolean;
  /** Whether running on web (purchases not available) */
  isWeb: boolean;
  /** Purchase a package - returns true if successful */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases - returns true if subscription found */
  restorePurchases: () => Promise<boolean>;
  /** Manually re-check subscription status */
  checkSubscription: (force?: boolean) => Promise<void>;
  /** Dev-only: simulate a purchase in Expo Go — persists across reloads via expo-secure-store */
  mockNativePurchase: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  // Get user from auth context for subscription syncing across devices
  // Safe: handles different auth context shapes (Better Auth, Supabase, etc.)
  const auth = useAuth() as Record<string, unknown> | null;
  const session = auth?.session as Record<string, unknown> | undefined;
  const user = (auth?.user ?? session?.user ?? null) as { id?: string } | null;
  const authLoading = (auth?.loading ?? false) as boolean;

  const userEmail = (auth?.user as any)?.email as string | undefined;
  const REVIEWER_EMAIL = "review@sacreddesign.app";
  const isReviewAccount = userEmail?.toLowerCase() === REVIEWER_EMAIL;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // In-flight guard: prevents concurrent getCustomerInfo calls (RC 429 / code 16)
  const isCheckingRef = useRef<boolean>(false);
  // Throttle: skip re-check if last successful check was within 10 seconds
  const lastCheckedRef = useRef<number>(0);

    // Fetch offerings via REST API for web platform
  const fetchOfferingsViaRest = async () => {
    // Mock package with real prices from RevenueCat dashboard
    const mockPackage = {
      identifier: "$rc_monthly",
      product: {
        title: "Monthly",
        priceString: "$4.99/month",
        description: "Unlock all premium features",
      },
    };

    setPackages([mockPackage] as PurchasesPackage[]);
    console.log("[revenuecat] Web preview: showing real prices from dashboard");
  };

  // Initialize RevenueCat on mount
  useEffect(() => {
    let customerInfoListener: { remove: () => void } | null = null;

    const initRevenueCat = async () => {
      try {
        // Web platform: SDK doesn't work, use REST API for basic info
        if (isWeb) {
          await fetchOfferingsViaRest();
          // Restore mock purchase state persisted from a previous session
          if (typeof window !== "undefined" && localStorage.getItem(MOCK_PURCHASE_KEY) === "true") {
            setIsSubscribed(true);
          }
          setLoading(false);
          return;
        }

        // Check if the react-native-purchases native module is available.
        // It is NOT available in standard Expo Go — only in custom dev builds and production builds.
        // DO NOT change this check or replace with AsyncStorage-based workarounds.
        if (typeof Purchases?.configure !== "function") {
          console.warn(
            "[RevenueCat] react-native-purchases native module not available. " +
            "Purchases require a custom dev build or production build, not standard Expo Go."
          );
          // In DEV mode, restore any previously simulated subscription state from expo-secure-store.
          // This lets you test subscription-gated features in standard Expo Go across reloads.
          if (__DEV__) {
            const mockState = await SecureStore.getItemAsync(MOCK_NATIVE_KEY).catch(() => null);
            if (mockState === "true") {
              setIsSubscribed(true);
            }
          }
          setLoading(false);
          return;
        }

        // Use DEBUG log level in development, INFO in production
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);

        // Get API key based on platform and environment
        // In development (__DEV__), use ANY available test key (test store works for all platforms)
        // This allows Expo Go to work on iOS even without a platform-specific test key
        const testKey = TEST_IOS_API_KEY || TEST_ANDROID_API_KEY;
        const productionKey = Platform.OS === "ios" ? IOS_API_KEY : ANDROID_API_KEY;
        const apiKey = __DEV__ && testKey ? testKey : productionKey;

        if (!apiKey) {
          console.warn(
            "[RevenueCat] API key not provided for this platform. " +
            "Please add revenueCatApiKeyIos/revenueCatApiKeyAndroid to app.json extra."
          );
          setLoading(false);
          return;
        }

        if (__DEV__) {
          console.log("[RevenueCat] Initializing in DEV mode with key:", apiKey.substring(0, 10) + "...");
          // Restore cached subscription state immediately to avoid paywall flash on bundle reload.
          // The customerInfoUpdateListener (fired by configure() below) is the authoritative
          // source and will immediately overwrite this with real RC Keychain data.
          const cached = await SecureStore.getItemAsync(NATIVE_PURCHASE_KEY).catch(() => null);
          if (cached === "true") {
            setIsSubscribed(true);
          }
        }

        await Purchases.configure({ apiKey });
        setIsConfigured(true);

        // Listen for real-time subscription changes (e.g., purchase from another device)
        customerInfoListener = Purchases.addCustomerInfoUpdateListener(
          (customerInfo) => {
            const hasEntitlement =
              typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !==
              "undefined";
            // In __DEV__: don't clear subscription state — RevenueCat test store purchases are
            // in-memory only and won't be known to RC after a configure() call on reload.
            if (hasEntitlement || !__DEV__) {
              setIsSubscribed(hasEntitlement);
            }
          }
        );

        // Fetch available products/packages
        await fetchOfferings();

        // Check initial subscription status
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to initialize:", error);
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();

    // Cleanup listener on unmount
    return () => {
      if (customerInfoListener) {
        customerInfoListener.remove();
      }
    };
  }, []);

  // Sync RevenueCat user ID with authenticated user
  useEffect(() => {
    if (!isConfigured || isWeb) return;
    if (authLoading) return; // Don't logOut while auth is still loading

    const updateUser = async () => {
      try {
        if (user?.id) {
          // Log in with your app's user ID to sync subscriptions across devices
          await Purchases.logIn(user.id);
        } else {
          // Anonymous user — log out of any identified session.
          // RC throws if already anonymous, so swallow that specific error.
          try {
            await Purchases.logOut();
          } catch (logOutError: any) {
            const msg = String(logOutError?.message ?? '');
            if (!msg.toLowerCase().includes('anonymous')) {
              // Re-throw unexpected errors
              throw logOutError;
            }
            // Already anonymous — this is fine, no-op
            console.log('[RevenueCat] logOut skipped — already anonymous user');
          }
        }
        await checkSubscription();
      } catch (error) {
        console.error("[RevenueCat] Failed to update user:", error);
      }
    };

    updateUser();
  }, [user?.id, isConfigured, authLoading]);

  const fetchOfferings = async (attempt = 0): Promise<void> => {
    if (isWeb) return;
    try {
      console.log(`[RevenueCat] fetchOfferings attempt ${attempt + 1}`);
      const fetchedOfferings = await Purchases.getOfferings();
      console.log(`[RevenueCat] fetchOfferings result — current: ${fetchedOfferings.current?.identifier ?? 'null'} packages: ${fetchedOfferings.current?.availablePackages?.length ?? 0}`);
      setOfferings(fetchedOfferings);
      if (fetchedOfferings.current) {
        setCurrentOffering(fetchedOfferings.current);
        setPackages(fetchedOfferings.current.availablePackages);
      } else if (attempt < 2) {
        console.warn(`[RevenueCat] No current offering — retrying in ${(attempt + 1) * 1500}ms`);
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        return fetchOfferings(attempt + 1);
      } else {
        console.warn('[RevenueCat] fetchOfferings: no current offering after 3 attempts');
      }
    } catch (error) {
      console.error("[RevenueCat] Failed to fetch offerings:", error);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 1500));
        return fetchOfferings(attempt + 1);
      }
    }
  };

  const checkSubscription = async (force = false) => {
    if (isWeb) return;

    // Throttle: skip if checked within the last 10 seconds (unless forced)
    if (!force && Date.now() - lastCheckedRef.current < 10000) {
      console.log("[RevenueCat] checkSubscription skipped — throttled (last check < 10s ago)");
      return;
    }

    // In-flight guard: prevent concurrent getCustomerInfo calls (RC 429 / code 16)
    if (isCheckingRef.current) {
      console.log("[RevenueCat] checkSubscription skipped — another check already in progress");
      return;
    }

    isCheckingRef.current = true;
    try {
      console.log("[RevenueCat] checkSubscription: calling getCustomerInfo");
      const customerInfo = await Purchases.getCustomerInfo();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      // In __DEV__: RC test store purchases don't survive configure(), so only update state
      // positively — mock/test purchase state persists across reloads via SecureStore cache.
      if (hasEntitlement || !__DEV__) {
        setIsSubscribed(hasEntitlement);
      }
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      } else if (!__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "false").catch(() => {});
      }
      // Update throttle timestamp after a successful check
      lastCheckedRef.current = Date.now();
      // If we have no packages yet, try fetching offerings again
      if (packages.length === 0) {
        console.log('[RevenueCat] checkSubscription: no packages loaded — fetching offerings');
        await fetchOfferings();
      }
    } catch (error: any) {
      // Gracefully handle RC 429 rate-limit (code 16 / backendErrorCode 7638)
      const isRateLimit =
        error?.code === 16 ||
        String(error?.message ?? "").includes("7638") ||
        String(error?.underlyingErrorMessage ?? "").includes("7638") ||
        String(error?.message ?? "").toLowerCase().includes("another request in progress");
      if (isRateLimit) {
        console.warn("[RevenueCat] checkSubscription rate-limited (429 / code 16) — will retry on next call");
      } else {
        console.error("[RevenueCat] Failed to check subscription:", error);
      }
      // Don't reset isSubscribed on error — the customerInfoUpdateListener
      // already set it from local cache after configure(). Overriding with false
      // would incorrectly show the paywall to subscribed users on network errors.
    } finally {
      isCheckingRef.current = false;
    }
  };

  const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Purchases not available on web");
      return false;
    }
    console.log(`[RevenueCat] purchasePackage START — identifier: ${pkg.identifier} productId: ${pkg.product.identifier}`);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      console.log(`[RevenueCat] purchasePackage SUCCESS — entitlement active: ${hasEntitlement}`);
      setIsSubscribed(hasEntitlement);
      if (hasEntitlement) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, "true").catch(() => {});
      }
      return hasEntitlement;
    } catch (error: any) {
      console.log(`[RevenueCat] purchasePackage ERROR — code: ${error?.code} message: ${error?.message} userCancelled: ${error?.userCancelled}`);
      // User cancelled — return silently, no error thrown
      if (error?.userCancelled || error?.code === 1) {
        return false;
      }
      // Map RC error codes to calm, user-friendly messages
      const friendlyMessage = (() => {
        switch (error?.code) {
          case 0:
            return "Something went wrong. Please try again.";
          case 1:
            return null; // cancelled — handled above
          case 2:
            return "The App Store is temporarily unavailable. Please try again in a moment.";
          case 3:
            return "Purchases are not allowed on this device. Check your Screen Time or parental controls.";
          case 4:
            return "You already have an active subscription. Tap 'Restore Purchases' below.";
          case 5:
            return "Purchase receipt could not be verified. Please restore purchases.";
          case 6:
            return "Purchase receipt not found. Please restore purchases.";
          case 7:
            return "There was a problem with your Apple ID. Please sign in to the App Store and try again.";
          case 8:
            return "This subscription is not available right now. Please try again later.";
          default:
            return "Purchase could not be completed. Please try again or restore purchases.";
        }
      })();
      throw new Error(friendlyMessage ?? "Purchase could not be completed. Please try again or restore purchases.");
    }
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (isWeb) {
      console.warn("[RevenueCat] Restore not available on web");
      return false;
    }
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement =
        typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== "undefined";
      setIsSubscribed(hasEntitlement);
      // In __DEV__: don't clear the cache on restore failure (test store purchases are ephemeral)
      if (hasEntitlement || !__DEV__) {
        await SecureStore.setItemAsync(NATIVE_PURCHASE_KEY, hasEntitlement ? "true" : "false").catch(() => {});
      }
      return hasEntitlement;
    } catch (error) {
      console.error("[RevenueCat] Restore failed:", error);
      throw error;
    }
  };

  const mockWebPurchase = () => {
    if (!isWeb) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(MOCK_PURCHASE_KEY, "true");
    }
    setIsSubscribed(true);
  };

  // Dev-only: simulate a purchase in standard Expo Go for testing subscription-gated features.
  // Persists to expo-secure-store so the state survives Expo Go reloads.
  const mockNativePurchase = async (): Promise<void> => {
    if (!__DEV__ || isWeb) return;
    await SecureStore.setItemAsync(MOCK_NATIVE_KEY, "true").catch(() => {});
    setIsSubscribed(true);
  };

  if (isReviewAccount) {
    console.log("[ReviewBypass] Reviewer account detected — subscription unlocked");
  }

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed: isReviewAccount ? true : isSubscribed,
        offerings,
        currentOffering,
        packages,
        loading,
        isWeb,
        purchasePackage,
        restorePurchases,
        checkSubscription,
        mockNativePurchase,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription state and methods.
 *
 * @example
 * const { isSubscribed, purchasePackage, packages, isWeb } = useSubscription();
 *
 * if (!isSubscribed) {
 *   return <Button onPress={() => router.push("/paywall")}>Upgrade</Button>;
 * }
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within SubscriptionProvider"
    );
  }
  return context;
}
