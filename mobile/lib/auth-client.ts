import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const BASE_URL =
  process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: BASE_URL,
  fetchOptions: {
    customFetchImpl: async (url, options) => {
      const token = await SecureStore.getItemAsync("session_token");
      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
  },
});

export async function saveSession(token: string) {
  await SecureStore.setItemAsync("session_token", token);
}

export async function clearSession() {
  await SecureStore.deleteItemAsync("session_token");
}
