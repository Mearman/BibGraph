/**
 * Mobile Detection Hook for Responsive Charts
 *
 * Detects whether the current viewport is mobile-sized using Mantine theme breakpoints.
 * Automatically updates when the window is resized.
 */

import { useMantineTheme } from "@mantine/core";
import { useEffect, useState } from "react";

/**
 * Hook to detect if the current viewport is mobile-sized
 *
 * Uses Mantine's theme breakpoints for consistency with the design system.
 * Updates automatically on window resize.
 *
 * @returns boolean indicating if viewport is mobile-sized
 */
export const useMobileDetection = (): boolean => {
  const theme = useMantineTheme();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const breakpointValue = Number.parseInt(
        theme.breakpoints.sm.replace("px", "")
      );
      setIsMobile(window.innerWidth < breakpointValue);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [theme.breakpoints.sm]);

  return isMobile;
};
