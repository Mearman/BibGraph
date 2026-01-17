/**
 * Error formatting utilities for Institutions API
 */

/**
 * Extract safe properties from error-like objects
 * @param errorObj - Object to extract error properties from
 * @returns Safe error properties
 */
export const extractErrorProperties = (errorObj: Record<string, unknown>): Record<string, unknown> => ({
    message:
      "message" in errorObj && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error",
    name:
      "name" in errorObj && typeof errorObj.name === "string"
        ? errorObj.name
        : "UnknownError",
    code:
      "code" in errorObj &&
      (typeof errorObj.code === "string" || typeof errorObj.code === "number")
        ? errorObj.code
        : undefined,
    status:
      "status" in errorObj && typeof errorObj.status === "number"
        ? errorObj.status
        : undefined,
  });

/**
 * Format unknown error for safe logging using type guards
 * @param error - Unknown error object to format
 * @returns Formatted error object safe for logging
 */
export const formatErrorForLogging = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (typeof error === "object" && error !== null) {
    return extractErrorProperties(error as Record<string, unknown>);
  }

  // Fallback for primitive types or null
  return {
    message: "Unknown error occurred",
    value: String(error),
  };
};
