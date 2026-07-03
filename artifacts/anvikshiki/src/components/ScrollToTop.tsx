import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Global scroll-to-top on route change.
 * - Skips if the URL has a hash (anchor link).
 * - Uses double requestAnimationFrame to wait for layout after page transition.
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Allow intentional hash/anchor navigation
    if (window.location.hash) return;

    // Double-rAF ensures the new page layout has been committed
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [location]);

  return null;
}
