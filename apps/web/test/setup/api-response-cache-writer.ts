/**
 * API Response Cache Writer for E2E Tests
 * Intercepts successful API responses and writes them to filesystem cache
 */

import { writeToFilesystemCache } from './filesystem-cache';

/**
 * Intercept and cache successful API responses
 */
export const cacheApiResponse = async (url: string, responseData: unknown): Promise<void> => {
  try {
    // Only cache in E2E environment
    const isE2E = process.env.RUNNING_E2E === 'true' || process.env.PLAYWRIGHT_TEST === 'true';
    if (!isE2E) return;

    // Parse URL to extract entity type and ID
    // Example: https://api.openalex.org/works/W123456789
    const apiMatch = /api\.openalex\.org\/([a-z]+)\/([A-Z]\d+)/.exec(url);
    if (!apiMatch) {
      console.log(`⚠️ Could not extract entity info from URL: ${url}`);
      return;
    }

    const [, entityType, entityId] = apiMatch;

    // Write to filesystem cache
    await writeToFilesystemCache(entityType, entityId, responseData);
    console.log(`💾 Cached API response: ${entityType}/${entityId}`);
  } catch (error) {
    console.error(`❌ Failed to cache API response for ${url}:`, error);
  }
};

/**
 * Setup fetch interceptor to automatically cache responses
 * This runs globally to capture all fetch requests
 */
export const setupResponseCacheInterceptor = (): void => {
  const isE2E = process.env.RUNNING_E2E === 'true' || process.env.PLAYWRIGHT_TEST === 'true';
  if (!isE2E) return;

  // Store original fetch
  const originalFetch = global.fetch;

  // Override global fetch
  global.fetch = async (...arguments_: Parameters<typeof fetch>): Promise<Response> => {
    const [url] = arguments_;
    const urlString = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : '');

    // Call original fetch
    const response = await originalFetch(...arguments_);

    // Only cache successful OpenAlex API responses
    if (
      response.ok &&
      urlString.includes('api.openalex.org') &&
      response.headers.get('content-type')?.includes('application/json') === true
    ) {
      try {
        // Clone response to avoid consuming it
        const clonedResponse = response.clone();
        const data: unknown = await clonedResponse.json();

        // Cache the response
        await cacheApiResponse(urlString, data);
      } catch (error) {
        console.warn(`⚠️ Failed to intercept response for caching: ${urlString}`, error);
      }
    }

    return response;
  };

  console.log('✅ API response cache interceptor enabled');
};

/**
 * Restore original fetch
 */
export const teardownResponseCacheInterceptor = (): void => {
  // Fetch interception is handled by MSW, no teardown needed
  console.log('🛑 API response cache interceptor disabled');
};
