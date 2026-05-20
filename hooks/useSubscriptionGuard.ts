import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";

const REVIEWER_EMAIL = "review@sacreddesign.app";

/**
 * Returns subscription and auth status.
 * Does NOT automatically redirect to the paywall — the paywall is only shown
 * when the user explicitly tries to access a premium feature.
 */
export function useSubscriptionGuard() {
  const { isSubscribed, loading } = useSubscription();
  const { user } = useAuth();
  const isReviewAccount = (user as any)?.email?.toLowerCase() === REVIEWER_EMAIL;

  return { isSubscribed: isReviewAccount ? true : isSubscribed, loading, user };
}
