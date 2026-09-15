/**
 * Unit tests for rate-limit configuration utilities Tests retry delay calculations, configuration constants, and edge cases
 */

import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateRetryDelay,
  RATE_LIMIT_CONFIG,
  RETRY_CONFIG,
} from "./rate-limit";

describe("rate-limit configuration", () => {
  describe("RATE_LIMIT_CONFIG", () => {
    it("should have OpenAlex rate limiting configuration", () => {
      expect(RATE_LIMIT_CONFIG.openAlex).toEqual({
        limit: 8,
        window: 1000,
        windowType: "sliding",
        headers: {
          "User-Agent": "BibGraph/1.0 (mailto:your-email@example.com)",
        },
      });
    });

    it("should have search throttling configuration", () => {
      expect(RATE_LIMIT_CONFIG.search).toEqual({
        throttleMs: 500,
        debounceMs: 300,
        leading: false,
        trailing: true,
      });
    });

    it("should have prefetch rate limiting configuration", () => {
      expect(RATE_LIMIT_CONFIG.prefetch).toEqual({
        limit: 5,
        window: 1000,
        windowType: "sliding",
      });
    });

    it("should have background rate limiting configuration", () => {
      expect(RATE_LIMIT_CONFIG.background).toEqual({
        limit: 2,
        window: 1000,
        windowType: "sliding",
      });
    });

    it("should use conservative OpenAlex limits", () => {
      const openAlexRateLimitCeiling = 10;
      const oneSecondMs = 1000;

      // Should be under the 10 req/sec OpenAlex limit
      expect(RATE_LIMIT_CONFIG.openAlex.limit).toBeLessThan(
        openAlexRateLimitCeiling,
      );
      expect(RATE_LIMIT_CONFIG.openAlex.window).toBe(oneSecondMs);
    });
  });

  describe("RETRY_CONFIG", () => {
    it("should have rate limited retry configuration", () => {
      expect(RETRY_CONFIG.rateLimited).toEqual({
        maxAttempts: 5,
        baseDelay: 2000,
        maxDelay: 30_000,
        exponentialBase: 2,
        jitterMs: 1000,
      });
    });

    it("should have network retry configuration", () => {
      expect(RETRY_CONFIG.network).toEqual({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10_000,
        exponentialBase: 2,
        jitterMs: 500,
      });
    });

    it("should have server retry configuration", () => {
      expect(RETRY_CONFIG.server).toEqual({
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 5000,
        exponentialBase: 1.5,
        jitterMs: 1000,
      });
    });

    it("should have client retry configuration with no retries", () => {
      expect(RETRY_CONFIG.client).toEqual({
        maxAttempts: 0,
      });
    });

    it("should have appropriate retry progression", () => {
      // Rate limited should be most aggressive
      expect(RETRY_CONFIG.rateLimited.maxAttempts).toBeGreaterThan(
        RETRY_CONFIG.network.maxAttempts,
      );
      expect(RETRY_CONFIG.rateLimited.maxAttempts).toBeGreaterThan(
        RETRY_CONFIG.server.maxAttempts,
      );

      // Client errors should not retry
      expect(RETRY_CONFIG.client.maxAttempts).toBe(0);
    });
  });

  describe("calculateRetryDelay", () => {
    const mockRandomMidpoint = 0.5;

    beforeEach(() => {
      // Mock Math.random for consistent testing
      vi.spyOn(Math, "random").mockReturnValue(mockRandomMidpoint);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should respect Retry-After header when provided", () => {
      const retryAfterMs = 5000;

      const delay = calculateRetryDelay({
        attemptIndex: 0,
        config: RETRY_CONFIG.rateLimited,
        retryAfterMs,
      });
      expect(delay).toBe(retryAfterMs);
    });

    it("should calculate exponential backoff for rate limited retry", () => {
      const config = RETRY_CONFIG.rateLimited;

      // First attempt (index 0): baseDelay * (exponentialBase^0) + jitter
      const delay0 = calculateRetryDelay({ attemptIndex: 0, config });
      expect(delay0).toBe(config.baseDelay + mockRandomMidpoint * config.jitterMs);

      // Second attempt (index 1): baseDelay * (exponentialBase^1) + jitter
      const delay1 = calculateRetryDelay({ attemptIndex: 1, config });
      expect(delay1).toBe(
        config.baseDelay * config.exponentialBase +
          mockRandomMidpoint * config.jitterMs,
      );

      // Third attempt (index 2): baseDelay * (exponentialBase^2) + jitter
      const delay2 = calculateRetryDelay({ attemptIndex: 2, config });
      expect(delay2).toBe(
        config.baseDelay * config.exponentialBase * config.exponentialBase +
          mockRandomMidpoint * config.jitterMs,
      );
    });

    it("should calculate exponential backoff for network retry", () => {
      const config = RETRY_CONFIG.network;

      // First attempt: baseDelay + jitter
      const delay0 = calculateRetryDelay({ attemptIndex: 0, config });
      expect(delay0).toBe(config.baseDelay + mockRandomMidpoint * config.jitterMs);

      // Second attempt: baseDelay * exponentialBase + jitter
      const delay1 = calculateRetryDelay({ attemptIndex: 1, config });
      expect(delay1).toBe(
        config.baseDelay * config.exponentialBase +
          mockRandomMidpoint * config.jitterMs,
      );
    });

    it("should calculate exponential backoff for server retry", () => {
      const config = RETRY_CONFIG.server;

      // First attempt: baseDelay * (exponentialBase^0) + jitter
      const delay0 = calculateRetryDelay({ attemptIndex: 0, config });
      expect(delay0).toBe(config.baseDelay + mockRandomMidpoint * config.jitterMs);

      // Second attempt: baseDelay * (exponentialBase^1) + jitter
      const delay1 = calculateRetryDelay({ attemptIndex: 1, config });
      expect(delay1).toBe(
        config.baseDelay * config.exponentialBase +
          mockRandomMidpoint * config.jitterMs,
      );
    });

    it("should cap delays at maxDelay", () => {
      const config = RETRY_CONFIG.network; // maxDelay: 10000
      const highAttemptIndex = 10;

      // High attempt index should hit the cap
      const delay = calculateRetryDelay({
        attemptIndex: highAttemptIndex,
        config,
      });
      expect(delay).toBeLessThanOrEqual(config.maxDelay);
      expect(delay).toBe(config.maxDelay); // Should be exactly maxDelay since exponential would exceed it
    });

    it("should handle different jitter values", () => {
      const mockRandomHigh = 0.8;
      vi.spyOn(Math, "random").mockReturnValue(mockRandomHigh); // Different random value

      const config = RETRY_CONFIG.rateLimited;
      const delay = calculateRetryDelay({ attemptIndex: 0, config });

      // Should be baseDelay + (randomValue * jitterMs)
      expect(delay).toBeCloseTo(config.baseDelay + mockRandomHigh * config.jitterMs);
    });

    it("should handle zero jitter", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);

      const config = RETRY_CONFIG.rateLimited;
      const delay = calculateRetryDelay({ attemptIndex: 0, config });

      // Should be exactly baseDelay when jitter is 0
      expect(delay).toBe(config.baseDelay);
    });

    it("should handle maximum jitter", () => {
      vi.spyOn(Math, "random").mockReturnValue(1);

      const config = RETRY_CONFIG.rateLimited;
      const delay = calculateRetryDelay({ attemptIndex: 0, config });

      // Should be baseDelay + full jitterMs
      expect(delay).toBe(config.baseDelay + config.jitterMs);
    });

    it("should use fallback calculation for invalid config", () => {
      // Create config without required properties
      const invalidConfig = {} as typeof RETRY_CONFIG.network;
      const attemptIndex = 2;
      const fallbackBaseDelayMs = 1000;
      const fallbackExponentialBase = 2;

      const delay = calculateRetryDelay({
        attemptIndex,
        config: invalidConfig,
      });

      // Should use fallback: fallbackBaseDelayMs * (fallbackExponentialBase^attemptIndex)
      expect(delay).toBe(
        fallbackBaseDelayMs * fallbackExponentialBase * fallbackExponentialBase,
      );
    });

    it("should handle fallback for different attempt indices", () => {
      const invalidConfig = {} as typeof RETRY_CONFIG.network;
      const fallbackBaseDelayMs = 1000;
      const fallbackExponentialBase = 2;

      expect(
        calculateRetryDelay({ attemptIndex: 0, config: invalidConfig }),
      ).toBe(fallbackBaseDelayMs); // exponentialBase^0 = 1
      expect(
        calculateRetryDelay({ attemptIndex: 1, config: invalidConfig }),
      ).toBe(fallbackBaseDelayMs * fallbackExponentialBase);
      expect(
        calculateRetryDelay({ attemptIndex: 3, config: invalidConfig }),
      ).toBe(
        fallbackBaseDelayMs *
          fallbackExponentialBase *
          fallbackExponentialBase *
          fallbackExponentialBase,
      );
    });

    it("should prioritize Retry-After over config calculation", () => {
      const config = RETRY_CONFIG.rateLimited;
      const retryAfterMs = 15_000;

      const delay = calculateRetryDelay({
        attemptIndex: 5,
        config,
        retryAfterMs,
      });

      // Should return Retry-After value regardless of exponential calculation
      expect(delay).toBe(retryAfterMs);
    });

    it("should handle edge case with very high attempt index", () => {
      const config = RETRY_CONFIG.rateLimited;

      // Very high attempt index should still be capped at maxDelay
      const delay = calculateRetryDelay({ attemptIndex: 100, config });
      expect(delay).toBeLessThanOrEqual(config.maxDelay);
      expect(delay).toBe(config.maxDelay);
    });

    it("should generate different delays with different random values", () => {
      const config = RETRY_CONFIG.network;
      const mockRandomA = 0.5;
      const mockRandomB = 0.3;

      // First call with random = mockRandomA
      vi.spyOn(Math, "random").mockReturnValueOnce(mockRandomA);
      const delay1 = calculateRetryDelay({ attemptIndex: 0, config });

      // Second call with random = mockRandomB
      vi.spyOn(Math, "random").mockReturnValueOnce(mockRandomB);
      const delay2 = calculateRetryDelay({ attemptIndex: 0, config });

      expect(delay1).not.toBe(delay2);
      expect(Math.abs(delay1 - delay2)).toBeLessThanOrEqual(config.jitterMs);
    });

    it("should handle client config which has no delay properties", () => {
      const config = RETRY_CONFIG.client;
      const attemptIndex = 1;
      const fallbackBaseDelayMs = 1000;
      const fallbackExponentialBase = 2;

      // Should use fallback since client config has no delay properties
      const delay = calculateRetryDelay({
        attemptIndex,
        config: config as unknown as typeof RETRY_CONFIG.network,
      });
      expect(delay).toBe(fallbackBaseDelayMs * fallbackExponentialBase); // Fallback: baseDelay * exponentialBase^1
    });
  });
});
