import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl?: string | null;
  bio?: string | null;
  institution?: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Where the last known signed-in identity is remembered between page loads.
 *
 * This is a display cache, not a credential. The httpOnly session cookie
 * remains the only thing that authorises anything, and every request still
 * carries it — so a stale entry here can render a name for a moment but can
 * never grant access to data. The background revalidation below corrects or
 * clears it within one request.
 */
const CACHED_USER_KEY = "anv_cached_user";

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.id === "string" ? (parsed as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User | null) {
  try {
    if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // Private browsing or a full quota — the app still works, just without the cache.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start from the remembered identity rather than from "signed out". The
  // session check is a network round trip, and on a cold serverless start it
  // can take seconds; rendering `null` until it resolved meant a signed-in
  // reader was shown the signed-out header — their own account appearing to
  // have been forgotten — on every single page load.
  const [user, setUser] = useState<User | null>(() => readCachedUser());
  const [loading, setLoading] = useState(() => readCachedUser() === null);

  const applyUser = useCallback((next: User | null) => {
    setUser(next);
    writeCachedUser(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        try {
          const data = await res.json();
          applyUser(data.user ?? null);
        } catch {
          applyUser(null);
        }
      } else if (res.status === 401 || res.status === 403) {
        // Definitively signed out — drop the remembered identity.
        applyUser(null);
      }
      // Any other status (500, 502, a cold-start timeout) is a failure to
      // answer the question, not an answer. Keep showing what we had rather
      // than logging the reader out because the server hiccuped.
    } catch {
      // Network error — same reasoning: leave the cached identity in place.
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((u: User) => {
    applyUser(u);
    setLoading(false);
  }, [applyUser]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    applyUser(null);
  }, [applyUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
