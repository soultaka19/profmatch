"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "@/lib/api/auth";
import type { UserOut } from "@/lib/types/api";

interface AuthContextValue {
  user: UserOut | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserOut>;
  /** Adopte un jeton obtenu hors du formulaire (bac à sable, changement de rôle). */
  adopterJeton: (token: string) => Promise<UserOut>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("access_token");
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem("access_token", res.access_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  // La démonstration remet trois jetons d'un coup, sans jamais demander
  // d'adresse courriel ni de mot de passe : passer d'un rôle à l'autre, c'est
  // changer de jeton, pas se reconnecter.
  const adopterJeton = useCallback(async (token: string) => {
    localStorage.setItem("access_token", token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, adopterJeton, logout }),
    [user, isLoading, login, adopterJeton, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être appelé dans un AuthProvider");
  return ctx;
}
