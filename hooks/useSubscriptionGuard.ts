import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { isOnboardingComplete } from "@/utils/onboardingStorage";

export function useSubscriptionGuard() {
  const { isSubscribed, loading } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    isOnboardingComplete()
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(true));
  }, [pathname]);

  useEffect(() => {
    // Don't redirect while subscription status is still loading
    if (loading) return;
    if (onboardingDone === null || !onboardingDone) return;
    if (!user) return;
    if (isSubscribed) return;

    // Wait at least 500ms after mount before redirecting — prevents firing
    // before RevenueCat has had a chance to resolve subscription status
    const elapsed = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, 500 - elapsed);

    const timer = setTimeout(() => {
      console.log("[useSubscriptionGuard] Not subscribed — redirecting to /paywall");
      router.replace("/paywall");
    }, delay);

    return () => clearTimeout(timer);
  }, [isSubscribed, loading, onboardingDone, user, router]);
}
