import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://rxv2r6bszrawnrpuzqt5kh3zhd9kv48u.app.specular.dev";

export const BEARER_TOKEN_KEY = "sacreddesign_bearer_token";

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

/** Read the session token from wherever it may be stored */
export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(BEARER_TOKEN_KEY);
    }
    // First try our manual key (set after sign-in)
    const manual = await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
    if (manual) return manual;

    // Fallback: read directly from @better-auth/expo's cookie store
    const raw = await SecureStore.getItemAsync("sacreddesign_cookie");
    if (raw) {
      const cookies = JSON.parse(raw);
      const token = cookies["sacreddesign.session_token"]?.value;
      if (token) {
        console.log("[auth] Found token in sacreddesign_cookie");
        return token;
      }
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
  const token = await getSessionToken();
  console.log("[apiFetch] token present:", !!token, "path:", path);
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
