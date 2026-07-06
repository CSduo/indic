import { createContext, useContext, useEffect, type ReactNode } from "react";

type Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    try { localStorage.setItem("anv-theme", "dark"); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark", toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
