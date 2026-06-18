export type Theme = "day" | "night";

const STORAGE_KEY = "anvikshiki-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "day";
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "day";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "night") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(current: Theme): Theme {
  return current === "day" ? "night" : "day";
}
