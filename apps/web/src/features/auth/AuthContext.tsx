"use client";

import {
  createContext,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getCurrentUser, logout as logoutApi, type AuthenticatedUser } from "./api/authClient";

export interface AuthContextValue {
  readonly user: AuthenticatedUser | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<AuthenticatedUser | null>;
  readonly setUser: (next: SetStateAction<AuthenticatedUser | null>) => void;
  readonly logout: () => Promise<void>;
}

const defaultAuthContext: AuthContextValue = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  async refresh() {
    return null;
  },
  setUser() {},
  async logout() {},
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<AuthenticatedUser | null> => {
    setIsLoading(true);
    try {
      const nextUser = await getCurrentUser();
      setUser(nextUser);
      setError(null);
      return nextUser;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your session.");
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: user !== null,
        refresh,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
