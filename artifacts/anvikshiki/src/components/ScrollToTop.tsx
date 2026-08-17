import { useEffect } from "react";
import { useLocation } from "wouter";
import { noteNavigation } from "@/lib/goBack";

/**
 * Global scroll-to-top on route change.
 * - Skips if the URL has a hash (anchor link).
 * - Uses double requestAnimationFrame to wait for layout after page transition.
 *
 * It also records the route change, which is how back buttons elsewhere know
 * whether there is a previous screen in this site to return to.
 */
export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    noteNavigation();
  }, [location]);

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
