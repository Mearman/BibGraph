/**
 * MSW Server Setup for Playwright Tests
 * Initializes MSW Node.js server to intercept OpenAlex API requests during E2E tests
 *
 * Feature: 005-test-environment-msw
 * Purpose: Fix 27 failing tests by mocking api.openalex.org responses
 */

import { setupServer } from 'msw/node';

import { createOpenalexHandlers } from '../../src/test/msw/handlers';
import { readFromFilesystemCache, writeToFilesystemCache } from './filesystem-cache';

/**
 * Check if running in E2E mode
 */
const isE2E = process.env.RUNNING_E2E === 'true' || process.env.PLAYWRIGHT_TEST === 'true';

/**
 * Filesystem cache utilities (only available in E2E mode)
 */
const cacheUtilities = isE2E ? { readFromFilesystemCache, writeToFilesystemCache } : undefined;

/**
 * MSW server instance with E2E filesystem cache support
 * Intercepts HTTP requests during Playwright test execution
 */
export const mswServer = setupServer(...createOpenalexHandlers(cacheUtilities));

/**
 * Start MSW server to begin intercepting requests
 * Called in Playwright globalSetup before any tests run
 */
export const startMSWServer = () => {
  mswServer.listen({
    onUnhandledRequest: (request, print) => {
      // Log all unhandled requests for debugging
      const url = new URL(request.url);

      // Only warn about OpenAlex API requests (ignore other domains)
      if (url.hostname === 'api.openalex.org') {
        console.warn(`⚠️  UNMOCKED REQUEST: ${request.method} ${request.url}`);
        print.warning();
      }
    },
  });

  // Add request lifecycle logging for debugging
  mswServer.events.on('request:start', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.log(`🔵 MSW intercepting: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  mswServer.events.on('request:match', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.log(`✅ MSW matched handler: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  mswServer.events.on('request:unhandled', ({ request }) => {
    const url = new URL(request.url);
    if (url.hostname === 'api.openalex.org') {
      console.error(`❌ MSW unhandled: ${request.method} ${url.pathname}${url.search}`);
    }
  });

  // Add response interceptor to cache API responses (E2E mode only)
  if (isE2E) {
    mswServer.events.on('response:mocked', async ({ request, response }) => {
      const url = new URL(request.url);

      // Only cache OpenAlex API responses that passed through (not mocks)
      if (url.hostname === 'api.openalex.org' && response.headers.get('x-powered-by') !== 'msw') {
        try {
          // Extract entity type and ID from URL
          const apiMatch = /\/([a-z]+)\/([A-Z]\d+)/.exec(url.pathname);
          if (apiMatch) {
            const [, entityType, entityId] = apiMatch;

            // Read response body
            const clonedResponse = response.clone();
            const responseData: unknown = await clonedResponse.json();

            // Use filesystem cache writer
            await writeToFilesystemCache(entityType, entityId, responseData);

            console.log(`💾 Cached API passthrough response: ${entityType}/${entityId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to cache passthrough response:`, error);
        }
      }
    });

    console.log('✅ Response cache interceptor enabled for E2E tests');
  }

  console.log('✅ MSW server started - intercepting api.openalex.org requests');
  console.log('🔍 Verbose logging enabled for debugging HTTP 403 errors');
};

/**
 * Stop MSW server and clean up resources
 * Called in Playwright globalTeardown after all tests complete
 */
export const stopMSWServer = () => {
  mswServer.close();
  console.log('🛑 MSW server stopped');
};

/**
 * Reset MSW handlers to initial state
 * Useful between test suites to clear any handler overrides
 */
export const resetMSWHandlers = () => {
  mswServer.resetHandlers();
  console.log('🔄 MSW handlers reset');
};
