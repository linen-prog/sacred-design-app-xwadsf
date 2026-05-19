import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens, getSessionToken } from "@/lib/auth";
import { clearAppState, migrateAnonymousState } from "@/utils/appState";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInProgress: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInProgress, setAuthInProgress] = useState(false);

  // Guard against concurrent or rapid-fire fetchUser calls
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether this is the first fetchUser call — only show loading spinner on initial load
  const isInitialFetchRef = useRef(true);
  // Track the current user id to avoid creating new object references on every poll
  const userRef = useRef<string | null>(null);
  // Track whether auth is in progress to prevent NavigationGuard from redirecting mid-flow
  const authInProgressRef = useRef(false);

  useEffect(() => {
    fetchUser();

    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received:", event.url);
      // Debounce: only trigger one fetchUser per burst of URL events
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        console.log("[AuthContext] Deep link debounce fired — refreshing session");
        fetchUser();
      }, 400);
    });

    const intervalId = setInterval(() => {
      fetchUser();
    }, 5 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUser = async () => {
    if (isFetchingRef.current) {
      console.log('[AuthContext] fetchUser skipped — already in flight');
      return;
    }
    isFetchingRef.current = true;
    try {
      // Only show the loading spinner on the very first call — interval polls
      // must not cause the whole app to re-render into a loading state.
      if (isInitialFetchRef.current) {
        setLoading(true);
      }
      const { data: session } = await authClient.getSession();
      console.log('[AuthContext] fetchUser raw session data:', JSON.stringify(session));
      console.log("[AuthContext] fetchUser session:", JSON.stringify(session));
      if (session?.user) {
        // Only update state if the user identity actually changed
        if (userRef.current !== session.user.id) {
          console.log('[AuthContext] fetchUser: migrating anonymous state for user:', session.user.id);
          await migrateAnonymousState(session.user.id);
          userRef.current = session.user.id;
          setUser(session.user as User);
        }
        // Token storage always runs regardless
        if (session?.session?.token) {
          await setBearerToken(session.session.token);
          console.log("[AuthContext] Stored token from session object");
        } else {
          // Fallback: try reading from the cookie/SecureStore cache
          const cached = await getSessionToken();
          if (cached) {
            await setBearerToken(cached);
            console.log("[AuthContext] Stored token from cookie store (fallback)");
          } else {
            console.warn("[AuthContext] Session exists but no token found anywhere");
          }
        }
      } else {
        // Cold-launch fallback: SecureStore may not have fully hydrated yet.
        // On the very first fetch, try once more after a short delay if we have a stored token.
        if (isInitialFetchRef.current) {
          const storedToken = await getSessionToken();
          if (storedToken) {
            console.log("[AuthContext] fetchUser: no session on first try — retrying after 300ms (cold launch)");
            await new Promise(resolve => setTimeout(resolve, 300));
            const { data: retrySession } = await authClient.getSession();
            if (retrySession?.user) {
              console.log("[AuthContext] fetchUser: cold-launch retry succeeded");
              if (userRef.current !== retrySession.user.id) {
                userRef.current = retrySession.user.id;
                setUser(retrySession.user as User);
              }
              if (retrySession?.session?.token) {
                await setBearerToken(retrySession.session.token);
                console.log("[AuthContext] Stored token from cold-launch retry session");
              }
              return;
            }
          }
        }
        if (userRef.current !== null) {
          userRef.current = null;
          setUser(null);
          await clearAuthTokens();
        }
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      isInitialFetchRef.current = false;
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    console.log('[AuthContext] signInWithEmail attempt:', email);

    console.log('[Auth] Real auth used');
    const { data, error } = await authClient.signIn.email({ email, password });
    console.log('[AuthContext] signInWithEmail response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
    if (error) {
      console.error('[AuthContext] signInWithEmail error:', error);
      throw new Error(error.message || 'Sign in failed');
    }
    if ((data as any)?.session?.token) {
      await setBearerToken((data as any).session.token);
      console.log('[AuthContext] signInWithEmail: stored token from response');
    }
    await fetchUser();
    console.log('[AuthContext] signInWithEmail success');
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    console.log('[AuthContext] signUpWithEmail attempt:', email);

    console.log('[Auth] Real auth used');
    const { data, error } = await authClient.signUp.email({ email, password, name: name ?? '' });
    console.log('[AuthContext] signUpWithEmail response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
    if (error) {
      console.error('[AuthContext] signUpWithEmail error:', error);
      throw new Error(error.message || 'Sign up failed');
    }
    if ((data as any)?.session?.token) {
      await setBearerToken((data as any).session.token);
      console.log('[AuthContext] signUpWithEmail: stored token from response');
    }
    await fetchUser();
    console.log('[AuthContext] signUpWithEmail success');
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
      setUser(null);
      await clearAuthTokens();
      await clearAppState(); // bust in-memory cache so next user doesn't see stale state
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authInProgress,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
