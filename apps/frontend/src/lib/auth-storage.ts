/**
 * Auth token storage utilities.
 * Uses localStorage for simplicity - can be upgraded to HTTP-only cookies for production.
 */

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'ethico_access_token',
  REFRESH_TOKEN: 'ethico_refresh_token',
  USER: 'ethico_user',
} as const;

export const authStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  },

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
  },

  getUser<T>(): T | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(TOKEN_KEYS.USER);
    if (!user) return null;
    try {
      return JSON.parse(user) as T;
    } catch {
      return null;
    }
  },

  setUser<T>(user: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.USER);
  },
};
