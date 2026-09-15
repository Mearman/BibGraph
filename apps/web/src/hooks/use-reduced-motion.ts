/**
 * Hook to detect user's reduced motion preference
 * Respects prefers-reduced-motion media query for accessibility
 */

import { useEffect, useState } from "react";

/**
 * Hook that returns true if the user prefers reduced motion
 * @returns boolean indicating if reduced motion is preferred
 */
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // Check initial preference on mount
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    // Return early if window is not available (SSR)
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Handler for changes to the media query
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Use addEventListener (modern browsers support this)
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
};
