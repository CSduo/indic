import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { type Theme } from "../lib/theme";

interface LayoutProps {
  children: ReactNode;
  theme: Theme;
  onThemeToggle: () => void;
}

export function Layout({ children, theme, onThemeToggle }: LayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", color: "var(--ink)" }}
    >
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
