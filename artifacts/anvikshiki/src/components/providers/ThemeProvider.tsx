import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

function storedPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem("anv-theme");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
  return "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setPreference] = useState<ThemePreference>(storedPreference);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(systemTheme);
  const resolvedTheme = theme === "system" ? systemPreference : theme;

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setSystemPreference(query.matches ? "light" : "dark");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.setAttribute("data-theme-preference", theme);
    document.documentElement.style.colorScheme = resolvedTheme;
    try {
      localStorage.setItem("anv-theme", theme);
    } catch {
      // The preference remains active for the current page.
    }
  }, [resolvedTheme, theme]);

  const setTheme = useCallback((next: ThemePreference) => setPreference(next), []);
  const toggleTheme = useCallback(() => {
    setPreference(current => current === "light" ? "dark" : current === "dark" ? "system" : "light");
  }, []);
  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
