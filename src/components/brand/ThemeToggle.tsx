"use client";

import { Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center h-9 rounded-full transition-all duration-300 hover:scale-105 shrink-0"
      style={{
        width: "72px",
        background: isDark ? "var(--surface-soft)" : "var(--surface-soft)",
        border: "1px solid var(--border)",
        padding: "3px",
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`${isDark ? "Light" : "Dark"} mode`}
    >
      {/* Sliding indicator dot */}
      <span
        className="absolute top-[4px] w-[28px] h-[28px] rounded-full transition-all duration-300"
        style={{
          background: "var(--gold)",
          left: isDark ? "calc(100% - 32px)" : "4px",
          boxShadow: isDark ? "0 0 8px rgba(213,170,97,0.4)" : "0 1px 4px rgba(168,124,43,0.3)",
        }}
      />
      {/* Sun icon - left */}
      <span
        className="relative z-10 flex items-center justify-center transition-all duration-300"
        style={{
          width: "28px",
          height: "28px",
          color: isDark ? "var(--muted)" : "#1a1108",
        }}
      >
        <Sun size={14} strokeWidth={2} />
      </span>
      {/* Contrast / half-moon icon - right */}
      <span
        className="relative z-10 flex items-center justify-center transition-all duration-300"
        style={{
          width: "28px",
          height: "28px",
          color: isDark ? "#1a1108" : "var(--muted)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
}
