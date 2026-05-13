import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { authClient, setBearerToken, clearAuthTokens, getSessionToken, API_URL } from "@/lib/auth";
import { clearAppState } from "@/utils/appState";

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
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

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

  const signInWithApple = async () => {
    console.log('[AuthContext] signInWithApple started — platform: ios');
    let cancelled = false;
    authInProgressRef.current = true;
    setAuthInProgress(true);

    if (!Constants.isDevice) {
      // Simulator fallback — native Apple auth not available
      console.log('[AuthContext] signInWithApple: simulator detected, using web OAuth fallback');
      try {
        await authClient.signIn.social({ provider: 'apple', callbackURL: '/' });
        await fetchUser();
      } finally {
        authInProgressRef.current = false;
        setAuthInProgress(false);
      }
      return;
    }

    // 10-second timeout for the native Apple auth sheet
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Apple sign in timed out — please try again'));
      }, 10000);
    });

    try {
      const credential = await Promise.race([
        AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        }),
        timeoutPromise,
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      const identityToken = credential.identityToken;
      if (!identityToken) {
        throw new Error('Apple sign in failed: no identity token received');
      }

      console.log('[AuthContext] signInWithApple: identity token received, exchanging with backend');

      // Use native fetch (not authClient) to avoid the expo/fetch polyfill issue on Android
      const response = await fetch(`${API_URL}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': API_URL,
        },
        body: JSON.stringify({ provider: 'apple', idToken: { token: identityToken } }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Apple sign in failed: backend exchange failed ${response.status} ${errText}`);
      }

      const data = await response.json();
      console.log('[AuthContext] signInWithApple: backend response received', JSON.stringify(data));

      const token = data?.token || data?.session?.token;
      if (token) {
        await setBearerToken(token);
        console.log('[AuthContext] signInWithApple: token stored from backend response');
      }
    } catch (e: any) {
      if (timeoutId) clearTimeout(timeoutId);
      const code = e?.code ?? '';
      const msg = (e?.message ?? '').toLowerCase();
      const isCancel =
        code === 'ERR_REQUEST_CANCELED' ||
        msg.includes('cancel') ||
        msg.includes('dismiss');
      if (isCancel) {
        cancelled = true;
        console.log('[AuthContext] signInWithApple cancelled/dismissed by user');
      } else {
        console.error('[AuthContext] signInWithApple threw:', e?.message, e?.code);
        throw e;
      }
    } finally {
      authInProgressRef.current = false;
      setAuthInProgress(false);
      if (!cancelled) {
        // Retry fetchUser up to 4 times with 500ms gaps to handle SecureStore hydration race
        let attempts = 0;
        const maxAttempts = 4;
        let sessionFound = false;
        while (attempts < maxAttempts) {
          await fetchUser();
          const { data: session } = await authClient.getSession();
          if (session?.user) {
            sessionFound = true;
            break;
          }
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        console.log('[AuthContext] signInWithApple: session found after retry:', sessionFound);
      }
    }
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle started — platform:', Platform.OS);
    let cancelled = false;
    authInProgressRef.current = true;
    setAuthInProgress(true);
    try {
      const googleOptions: { provider: 'google'; callbackURL?: string } = { provider: 'google' };
      if (Platform.OS === 'web') {
        googleOptions.callbackURL = `${window.location.origin}/auth-callback`;
      } else {
        googleOptions.callbackURL = 'sacreddesign://auth-callback';
      }
      console.log('[AuthContext] signInWithGoogle callbackURL:', googleOptions.callbackURL);
      const { data, error } = await authClient.signIn.social(googleOptions);
      console.log('[AuthContext] signInWithGoogle response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
      if (error) {
        console.error('[AuthContext] signInWithGoogle error code:', error.code, 'message:', error.message);
        // Don't throw — let fetchUser() run in finally to pick up any session
      }
      if ((data as any)?.session?.token) {
        await setBearerToken((data as any).session.token);
        console.log('[AuthContext] signInWithGoogle: stored token from response');
      }
    } catch (e: any) {
      const msg = (e?.message ?? '').toLowerCase();
      const isCancel = msg.includes('cancel') || msg.includes('dismiss') || msg.includes('closed');
      if (!isCancel) {
        console.error('[AuthContext] signInWithGoogle threw:', e?.message, e?.code);
        throw e;
      } else {
        cancelled = true;
        console.log('[AuthContext] signInWithGoogle cancelled/dismissed by user');
      }
    } finally {
      authInProgressRef.current = false;
      setAuthInProgress(false);
      if (!cancelled) {
        // expoClient writes the session cookie to SecureStore asynchronously.
        // Retry fetchUser up to 4 times with 500ms gaps to avoid a race condition.
        let attempts = 0;
        const maxAttempts = 4;
        let sessionFound = false;
        while (attempts < maxAttempts) {
          await fetchUser();
          const { data: session } = await authClient.getSession();
          if (session?.user) {
            sessionFound = true;
            break;
          }
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        console.log('[AuthContext] signInWithGoogle: session found after retry:', sessionFound);
      }
    }
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
        signInWithApple,
        signInWithGoogle,
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
