/**
 * OpenAlex API Error Classes
 * Custom error types for API error handling with proper error metadata
 */

/**
 * Base error class for OpenAlex API errors
 * Provides structured error information including status codes and response data
 */
export class OpenAlexApiError extends Error {
  statusCode?: number;
  response?: Response;

  constructor({
    message,
    statusCode,
    response,
  }: {
    message: string;
    statusCode?: number;
    response?: Response;
  }) {
    super(message);
    this.name = "OpenAlexApiError";
    this.statusCode = statusCode;
    this.response = response;

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexApiError.prototype);
  }
}

/**
 * Rate limit error for 429 responses
 * Includes retry timing information when available
 */
export class OpenAlexRateLimitError extends OpenAlexApiError {
  retryAfter?: number;

  constructor({
    message,
    retryAfter,
  }: {
    message: string;
    retryAfter?: number;
  }) {
    super({ message, statusCode: 429 });
    this.name = "OpenAlexRateLimitError";
    this.retryAfter = retryAfter;

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexRateLimitError.prototype);
  }
}
