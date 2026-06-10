import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = (Constants.expoConfig?.extra?.backendUrl as string) || "https://g2yrvd6zeuu4crc7j3vv6gwgbuur6ps6.app.specular.dev";

export const BEARER_TOKEN_KEY = "sacreddesign_bearer_token";
const COOKIE_KEY = "sacreddesign_cookie";

// Platform-specific storage: localStorage for web, SecureStore for native
const storage = Platform.OS === "web"
  ? {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      deleteItem: (key: string) => localStorage.removeItem(key),
    }
  : SecureStore;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: "sacreddesign",
      storagePrefix: "sacreddesign",
      storage,
    }),
  ],
});

/**
 * Read the session token from the expoClient cookie store.
 * The expoClient stores cookies as JSON under `sacreddesign_cookie`.
 * The session token is at cookies["better-auth.session_token"].value
 * or cookies["sacreddesign.session_token"].value
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    }
    // Try our manually stored token first
    const manual = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    if (manual) return manual;

    // Fall back to reading from the expoClient cookie store
    const raw = await SecureStore.getItemAsync(COOKIE_KEY);
    if (raw) {
      const cookies = JSON.parse(raw);
      // Try both possible key names
      const token =
        cookies["better-auth.session_token"]?.value ||
        cookies["sacreddesign.session_token"]?.value;
      if (token) return token;
    }
    return null;
  } catch (e) {
    console.warn("[auth] getSessionToken error:", e);
    return null;
  }
}

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

let _lastSessionFallbackAt = 0;
let _lastSessionFallbackResult: string | null = null;

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  let token = await getSessionToken();

  // Fallback: if no cached token, try getting it from the live session.
  // Rate-limited to once per 30s to prevent hammering /api/auth/get-session.
  if (!token) {
    const now = Date.now();
    if (now - _lastSessionFallbackAt > 30_000) {
      _lastSessionFallbackAt = now;
      try {
        const { data: session } = await authClient.getSession();
        if (session?.session?.token) {
          token = session.session.token;
          _lastSessionFallbackResult = token;
          await setBearerToken(token);
          console.log('[apiFetch] Token restored from live session');
        } else {
          _lastSessionFallbackResult = null;
        }
      } catch (e) {
        console.warn('[apiFetch] Could not restore token from session:', e);
        _lastSessionFallbackResult = null;
      }
    } else if (_lastSessionFallbackResult) {
      token = _lastSessionFallbackResult;
    }
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
}

export { API_URL };
