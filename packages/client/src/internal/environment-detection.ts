/**
 * Environment Detection Utilities
 * Determines runtime environment (development/production) for base URL selection
 */

/**
 * Check if running in development mode based on NODE_ENV
 */
export const checkNodeEnv = (): boolean | null => {
  if (globalThis.process?.env?.NODE_ENV) {
    const nodeEnv = globalThis.process.env.NODE_ENV.toLowerCase();
    if (nodeEnv === "development" || nodeEnv === "dev") return true;
    if (nodeEnv === "production") return false;
  }
  return null;
};

/**
 * Check Vite's __DEV__ flag
 */
export const checkViteDevFlag = (): boolean | null => {
  if (typeof globalThis !== "undefined" && "__DEV__" in globalThis) {
    try {
      const globalObj = globalThis as Record<string, unknown>;
      const devFlag = globalObj.__DEV__;
      if (typeof devFlag === "boolean") {
        return devFlag;
      }
    } catch {
      // Ignore errors if __DEV__ is not accessible
    }
  }
  return null;
};

/**
 * Check browser-based development indicators
 */
export const checkBrowserDevIndicators = (): boolean | null => {
  try {
    if (typeof globalThis !== "undefined" && "window" in globalThis) {
      const win =
        "window" in globalThis &&
        globalThis.window &&
        "location" in globalThis.window
          ? globalThis.window
          : undefined;
      if (win?.location?.hostname) {
        const { hostname } = win.location;
        // Local development indicators
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.endsWith(".local")
        ) {
          return true;
        }
      }
    }
  } catch {
    // Ignore errors in browser detection
  }
  return null;
};

/**
 * Detect if running in development mode
 * Checks multiple indicators in order of reliability
 */
export const isDevelopmentMode = (): boolean => {
  // Check NODE_ENV first (most reliable)
  const nodeEnvResult = checkNodeEnv();
  if (nodeEnvResult !== null) return nodeEnvResult;

  // Check Vite's __DEV__ flag
  const viteResult = checkViteDevFlag();
  if (viteResult !== null) return viteResult;

  // Check browser-based development indicators
  const browserResult = checkBrowserDevIndicators();
  if (browserResult !== null) return browserResult;

  // Default to development if uncertain (fail-safe for dev mode)
  return true;
};

/**
 * Check if running in a test environment
 */
export const isTestEnvironment = (): boolean => {
  return typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' ||
     process.env.VITEST === 'true' ||
     process.env.JEST_WORKER_ID !== undefined);
};
