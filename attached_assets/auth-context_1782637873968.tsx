import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authApi, clearToken, type User } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isEditor: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    displayName: string;
    interests?: string[];
    avatarGlyph?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialised = useRef(false);

  // On mount: attempt to restore session via GET /api/auth/me
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        // Token missing, expired, or server unreachable — stay logged out
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authApi.login(email, password);
    setUser(u);
  }, []);

  const signup = useCallback(
    async (data: Parameters<typeof authApi.signup>[0]) => {
      const u = await authApi.signup(data);
      setUser(u);
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAdmin: user?.role === "admin",
    isEditor: user?.role === "admin" || user?.role === "editor",
    login,
    signup,
    logout,
    refresh,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useRequireAuth(redirectTo = "/login"): AuthContextValue {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      window.location.href = redirectTo;
    }
  }, [auth.loading, auth.user, redirectTo]);
  return auth;
}

// Guards admin-only routes — redirects non-admins (including logged-out users)
export function useRequireAdmin(redirectTo = "/"): AuthContextValue {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.loading && (!auth.user || !auth.isAdmin)) {
      window.location.href = redirectTo;
    }
  }, [auth.loading, auth.user, auth.isAdmin, redirectTo]);
  return auth;
}
