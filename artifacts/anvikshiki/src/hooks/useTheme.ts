import { useState, useEffect } from "react";
import { type Theme, getStoredTheme, applyTheme, setStoredTheme, toggleTheme } from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle() {
    const next = toggleTheme(theme);
    setStoredTheme(next);
    setTheme(next);
  }

  return { theme, toggle };
}
