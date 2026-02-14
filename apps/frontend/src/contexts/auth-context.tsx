"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { apiClient } from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";
import type {
  AuthUser,
  AuthResponse,
  LoginCredentials,
  AuthState,
} from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();
      const user = authStorage.getUser<AuthUser>();

      if (accessToken && user) {
        setState({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await apiClient.post<AuthResponse>(
      "/auth/login",
      credentials,
    );

    authStorage.setAccessToken(response.accessToken);
    authStorage.setRefreshToken(response.refreshToken);
    authStorage.setUser(response.user);

    setState({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      // Log server-side session invalidation failure
      // Local logout still proceeds, but session may remain active on server
      console.warn(
        "Server-side session invalidation failed. Session may remain active on other devices.",
        error instanceof Error ? error.message : error,
      );
    } finally {
      authStorage.clearAll();
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout-all");
    } catch (error) {
      // Log server-side session invalidation failure
      // Local logout still proceeds, but sessions may remain active on server
      console.warn(
        "Server-side session invalidation failed (logout-all). Sessions may remain active on other devices.",
        error instanceof Error ? error.message : error,
      );
    } finally {
      authStorage.clearAll();
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
