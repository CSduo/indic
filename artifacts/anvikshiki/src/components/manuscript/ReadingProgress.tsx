import { useEffect } from "react";

export function ReadingProgress() {
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = Math.min(100, Math.max(0, (scrollTop / max) * 100));
      document.documentElement.style.setProperty("--progress", `${value}%`);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.setProperty("--progress", "0%");
    };
  }, []);

  return <div className="reading-progress" aria-hidden="true" />;
}
