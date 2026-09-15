/**
 * Redirect Tracking Tests - Interceptor URL Tracking Functionality
 *
 * Tests for the API interceptor's ability to track both original and final URLs
 * for redirected requests, ensuring proper cache key generation and metadata storage.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiInterceptor } from '../api-interceptor';

// Mock the logger
vi.mock('../../internal/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('API Interceptor Redirect Tracking', () => {
  let interceptor: ApiInterceptor;

  beforeEach(() => {
    // Create interceptor in development mode for testing
    interceptor = new ApiInterceptor({ enabled: true });
  });

  describe('Request Interception', () => {
    it('should capture original URL in intercepted request', () => {
      const originalUrl = 'https://api.openalex.org/authors/A5017898742work';
      const options = { method: 'GET' };

      const interceptedRequest = interceptor.interceptRequest(originalUrl, options);

      expect(interceptedRequest).toBeDefined();
      expect(interceptedRequest?.url).toBe(originalUrl);
      expect(interceptedRequest?.finalUrl).toBeUndefined(); // No redirect yet
    });
  });

  describe('Response Interception with Redirects', () => {
    it('should capture final URL when response URL differs from request URL', () => {
      // Simulate original request
      const originalUrl = 'https://api.openalex.org/authors/A5017898742work';
      const interceptedRequest = interceptor.interceptRequest(originalUrl, { method: 'GET' });

      expect(interceptedRequest).toBeDefined();

      // Simulate response with different URL (redirect)
      const finalUrl = 'https://api.openalex.org/authors/A5017898742';
      const mockResponse = {
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: finalUrl, // This is the key - Response.url contains final URL
        clone: () => mockResponse,
        json: async () => {
          await Promise.resolve();
          return { id: 'A5017898742', display_name: 'Test Author' };
        },
      } as unknown as Response;

      const responseData = { id: 'A5017898742', display_name: 'Test Author' };
      const responseTime = 150;

      const interceptedCall = interceptor.interceptResponse(
        interceptedRequest!,
        mockResponse,
        responseData,
        responseTime
      );

      expect(interceptedCall).toBeDefined();
      expect(interceptedCall?.request.finalUrl).toBe(finalUrl);
      expect(interceptedCall?.request.url).toBe(originalUrl);
    });

    it('should not set finalUrl when response URL matches request URL', () => {
      // Simulate request without redirect
      const url = 'https://api.openalex.org/authors/A5017898742';
      const interceptedRequest = interceptor.interceptRequest(url, { method: 'GET' });

      expect(interceptedRequest).toBeDefined();

      // Simulate response with same URL (no redirect)
      const mockResponse = {
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: url, // Same as request URL
        clone: () => mockResponse,
        json: async () => {
          await Promise.resolve();
          return { id: 'A5017898742', display_name: 'Test Author' };
        },
      } as unknown as Response;

      const responseData = { id: 'A5017898742', display_name: 'Test Author' };
      const responseTime = 150;

      const interceptedCall = interceptor.interceptResponse(
        interceptedRequest!,
        mockResponse,
        responseData,
        responseTime
      );

      expect(interceptedCall).toBeDefined();
      expect(interceptedCall?.request.finalUrl).toBeUndefined();
      expect(interceptedCall?.request.url).toBe(url);
    });

    it('should use final URL for cache key generation when available', () => {
      // Simulate redirected request
      const originalUrl = 'https://api.openalex.org/authors/A5017898742work';
      const interceptedRequest = interceptor.interceptRequest(originalUrl, { method: 'GET' });

      // Manually set final URL (simulating what happens in interceptResponse)
      (interceptedRequest!).finalUrl = 'https://api.openalex.org/authors/A5017898742';

      const mockResponse = {
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: 'https://api.openalex.org/authors/A5017898742',
        clone: () => mockResponse,
        json: async () => {
          await Promise.resolve();
          return { id: 'A5017898742', display_name: 'Test Author' };
        },
      } as unknown as Response;

      const responseData = { id: 'A5017898742', display_name: 'Test Author' };
      const responseTime = 150;

      const interceptedCall = interceptor.interceptResponse(
        interceptedRequest!,
        mockResponse,
        responseData,
        responseTime
      );

      expect(interceptedCall).toBeDefined();
      // The cache key should be generated using the final URL
      expect(interceptedCall?.cacheKey).toContain('A5017898742'); // Final entity ID
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys using final URL when redirected', () => {
      const originalUrl = 'https://api.openalex.org/authors/A5017898742work';
      const finalUrl = 'https://api.openalex.org/authors/A5017898742';

      // Create request with redirect
      const interceptedRequest = interceptor.interceptRequest(originalUrl, { method: 'GET' });
      (interceptedRequest!).finalUrl = finalUrl;

      const mockResponse = {
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        url: finalUrl,
        clone: () => mockResponse,
        json: async () => {
          await Promise.resolve();
          return { id: 'A5017898742', display_name: 'Test Author' };
        },
      } as unknown as Response;

      const responseData = { id: 'A5017898742', display_name: 'Test Author' };
      const responseTime = 150;

      const interceptedCall = interceptor.interceptResponse(
        interceptedRequest!,
        mockResponse,
        responseData,
        responseTime
      );

      expect(interceptedCall).toBeDefined();
      expect(interceptedCall?.cacheKey).toBeDefined();

      // Create a fresh interceptor instance to avoid deduplication
      const freshInterceptor = new ApiInterceptor({ enabled: true });

      // Generate another call with the final URL directly
      const directRequest = freshInterceptor.interceptRequest(finalUrl, { method: 'GET' });
      const directCall = freshInterceptor.interceptResponse(
        directRequest!,
        mockResponse,
        responseData,
        responseTime
      );

      // Both should generate the same cache key
      expect(interceptedCall?.cacheKey).toBe(directCall?.cacheKey);
    });
  });
});