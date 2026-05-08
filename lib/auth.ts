import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

const API_URL = (Constants.expoConfig?.extra?.backendUrl as string) || "https://99b2qumnfz5hty3hbh5psgj3fm289p7w.app.specular.dev";

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

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  let token = await getSessionToken();

  // Fallback: if no cached token, try getting it directly from the live session
  if (!token) {
    try {
      const { data: session } = await authClient.getSession();
      if (session?.session?.token) {
        token = session.session.token;
        await setBearerToken(token);
        console.log('[apiFetch] Token restored from live session');
      }
    } catch (e) {
      console.warn('[apiFetch] Could not restore token from session:', e);
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
