/**
 * Environment Detection Utilities
 * Determines runtime environment (development/production) for base URL selection
 */

/**
 * Check if running in development mode based on NODE_ENV
 */
export const checkNodeEnv = (): boolean | null => {
  const nodeEnvironmentValue = process.env.NODE_ENV;
  if (nodeEnvironmentValue === undefined) {
    return null;
  }
  const nodeEnvironment = nodeEnvironmentValue.toLowerCase();
  if (nodeEnvironment === "development" || nodeEnvironment === "dev") return true;
  if (nodeEnvironment === "production") return false;
  return null;
};

/**
 * Check Vite's __DEV__ flag
 */
export const checkViteDevFlag = (): boolean | null => {
  try {
    if ("__DEV__" in globalThis) {
      const developmentFlag: unknown = globalThis.__DEV__;
      if (typeof developmentFlag === "boolean") {
        return developmentFlag;
      }
    }
  } catch {
    // Ignore errors if __DEV__ is not accessible
  }
  return null;
};

/**
 * Check browser-based development indicators
 */
export const checkBrowserDevIndicators = (): boolean | null => {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const { hostname } = window.location;
    // Local development indicators
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return true;
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
  const nodeEnvironmentResult = checkNodeEnv();
  if (nodeEnvironmentResult !== null) return nodeEnvironmentResult;

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
  return process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    process.env.JEST_WORKER_ID !== undefined;
};
