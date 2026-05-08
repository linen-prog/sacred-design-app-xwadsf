import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens, getSessionToken } from "@/lib/auth";
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

  // Guard against concurrent or rapid-fire fetchUser calls
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether this is the first fetchUser call — only show loading spinner on initial load
  const isInitialFetchRef = useRef(true);

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
        setUser(session.user as User);
        // Prefer the token directly from the session object (avoids chicken-and-egg
        // where SecureStore hasn't been written yet on first login).
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
        setUser(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      isInitialFetchRef.current = false;
      setLoading(false);
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
    console.log('[AuthContext] signInWithApple started — platform:', Platform.OS);
    try {
      const appleOptions: { provider: 'apple'; callbackURL?: string } = { provider: 'apple' };
      if (Platform.OS === 'web') {
        appleOptions.callbackURL = `${window.location.origin}/auth-callback`;
      } else {
        appleOptions.callbackURL = 'sacreddesign://auth-callback';
      }
      console.log('[AuthContext] signInWithApple callbackURL:', appleOptions.callbackURL);
      const { data, error } = await authClient.signIn.social(appleOptions);
      console.log('[AuthContext] signInWithApple response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
      if (error) {
        console.error('[AuthContext] signInWithApple error code:', error.code, 'message:', error.message);
        // Don't throw — let fetchUser() run in finally to pick up any session
      }
      if ((data as any)?.session?.token) {
        await setBearerToken((data as any).session.token);
        console.log('[AuthContext] signInWithApple: stored token from response');
      }
    } catch (e: any) {
      const msg = (e?.message ?? '').toLowerCase();
      const isCancel = msg.includes('cancel') || msg.includes('dismiss') || msg.includes('closed');
      if (!isCancel) {
        console.error('[AuthContext] signInWithApple threw:', e?.message, e?.code);
        throw e; // Only re-throw non-cancel errors
      } else {
        console.log('[AuthContext] signInWithApple cancelled/dismissed by user');
        return; // Don't call fetchUser on cancel
      }
    } finally {
      // Always refresh session — expoClient may have set cookies even if response had no token
      await fetchUser();
      console.log('[AuthContext] signInWithApple: fetchUser completed');
    }
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle started — platform:', Platform.OS);
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
        throw e; // Only re-throw non-cancel errors
      } else {
        console.log('[AuthContext] signInWithGoogle cancelled/dismissed by user');
        return; // Don't call fetchUser on cancel
      }
    } finally {
      // Always refresh session — expoClient may have set cookies even if response had no token
      await fetchUser();
      console.log('[AuthContext] signInWithGoogle: fetchUser completed');
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
