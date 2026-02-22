import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { AuthUser } from "@/types";

const TOKEN_KEY = "distrib_token";
const USER_KEY = "distrib_user";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (user: AuthUser, token: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (user, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, token: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userRaw = await SecureStore.getItemAsync(USER_KEY);
      if (token && userRaw) {
        set({ user: JSON.parse(userRaw), token });
      }
    } catch {
      // token inválido o expirado — limpiar
    } finally {
      set({ isLoading: false });
    }
  },
}));
