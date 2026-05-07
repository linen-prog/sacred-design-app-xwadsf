import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens, getSessionToken } from "@/lib/auth";

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
      setLoading(true);
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
    console.log('[AuthContext] signInWithApple started');
    const callbackURL = Platform.OS === 'web'
      ? `${window.location.origin}/auth-callback`
      : 'sacreddesign://auth-callback';
    const { data, error } = await authClient.signIn.social({
      provider: 'apple',
      callbackURL,
    });
    console.log('[AuthContext] signInWithApple response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
    if (error) throw new Error(error.message || 'Apple sign in failed');
    if ((data as any)?.session?.token) {
      await setBearerToken((data as any).session.token);
    }
    await fetchUser();
    console.log('[AuthContext] signInWithApple success');
  };

  const signInWithGoogle = async () => {
    console.log('[AuthContext] signInWithGoogle started');
    const callbackURL = Platform.OS === 'web'
      ? `${window.location.origin}/auth-callback`
      : 'sacreddesign://auth-callback';
    const { data, error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
    });
    console.log('[AuthContext] signInWithGoogle response — data:', JSON.stringify(data), 'error:', JSON.stringify(error));
    if (error) throw new Error(error.message || 'Google sign in failed');
    if ((data as any)?.session?.token) {
      await setBearerToken((data as any).session.token);
    }
    await fetchUser();
    console.log('[AuthContext] signInWithGoogle success');
  };

  const signOut = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sign out failed (API):", error);
    } finally {
      setUser(null);
      await clearAuthTokens();
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
