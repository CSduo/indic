"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.8" fill="currentColor" opacity="0.9" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        const inner = 6.2;
        const outer = i % 2 === 0 ? 9.2 : 8.2;
        return (
          <line
            key={deg}
            x1={12 + inner * Math.cos(r)}
            y1={12 + inner * Math.sin(r)}
            x2={12 + outer * Math.cos(r)}
            y2={12 + outer * Math.sin(r)}
            stroke="currentColor"
            strokeWidth={i % 2 === 0 ? 1.8 : 1.2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="anv-theme-toggle"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className="anv-theme-thumb"
        style={{ left: isDark ? "calc(100% - 30px)" : "3px" }}
      />
      <span
        className="anv-theme-icon"
        style={{ color: isDark ? "var(--muted)" : "var(--gold)" }}
        aria-hidden="true"
      >
        <SunIcon />
      </span>
      <span
        className="anv-theme-icon"
        style={{ color: isDark ? "var(--gold-bright)" : "var(--muted)" }}
        aria-hidden="true"
      >
        <MoonIcon />
      </span>
    </button>
  );
}
