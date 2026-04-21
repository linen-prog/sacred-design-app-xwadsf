import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns subscription and auth status.
 * Does NOT automatically redirect to the paywall — the paywall is only shown
 * when the user explicitly tries to access a premium feature.
 */
export function useSubscriptionGuard() {
  const { isSubscribed, loading } = useSubscription();
  const { user } = useAuth();

  return { isSubscribed, loading, user };
}
