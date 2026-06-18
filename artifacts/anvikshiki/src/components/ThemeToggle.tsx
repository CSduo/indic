import { Sun, Moon } from "lucide-react";
import { type Theme } from "../lib/theme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

export function ThemeToggle({ theme, onToggle, className = "" }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={`Switch to ${theme === "day" ? "night" : "day"} mode`}
      className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${className}`}
      style={{
        background: "var(--surface-2)",
        color: "var(--gold)",
        border: "1px solid var(--line)",
      }}
    >
      {theme === "day" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
