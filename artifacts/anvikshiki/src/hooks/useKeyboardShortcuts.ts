import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/components/providers/ThemeProvider";

export function useKeyboardShortcuts() {
  const [, setLocation] = useLocation();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === "Escape") {
        if (activeEl instanceof HTMLElement) {
          activeEl.blur();
        }
        document.dispatchEvent(new CustomEvent("anv-close-modals"));
      }

      if (isInputFocused) return;

      if (e.key === "/" || (e.ctrlKey && e.key === "k") || (e.metaKey && e.key === "k")) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]') as HTMLElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          setLocation("/search");
        }
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        toggleTheme();
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setLocation("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation, toggleTheme]);
}
