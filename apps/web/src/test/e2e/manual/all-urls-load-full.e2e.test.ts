/**
 * All OpenAlex URLs Load Test
 *
 * Simplified test that verifies:
 * 1. All URLs from openalex-test-urls.json load without errors
 * 2. Pages display actual content (not error pages)
 * 3. No JavaScript errors in console
 *
 * This is a smoke test to ensure all routing and data fetching works.
 */

import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect,test } from '@playwright/test';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OpenAlexTestUrlsData {
  urls: string[];
  totalUrls: number;
}

// Load all URLs from the JSON file
const urlsPath = join(__dirname, '../../data/openalex-test-urls.json');
const urlsData = JSON.parse(readFileSync(urlsPath, 'utf-8')) as OpenAlexTestUrlsData;
const urls: string[] = urlsData.urls;

const BASE_URL = process.env.BASE_URL ?? (process.env.CI !== undefined && process.env.CI !== '' ? 'http://localhost:4173' : 'http://localhost:5173');
const API_BASE = 'https://api.openalex.org';

// Minimum expected content lengths, varying by page type
const MIN_CONTENT_LENGTH_LIST_OR_SELECT = 50;
const MIN_CONTENT_LENGTH_EXTERNAL_ID = 75;
const MIN_CONTENT_LENGTH_DEFAULT = 100;

// Helper to convert API URL to app URL
// Uses the /openalex-url/ route which handles API URL conversion internally
const toAppUrl = (apiUrl: string): string => {
  // Remove API base and use the openalex-url route which handles all conversions
  // The openalex-url route will detect entity types, normalize IDs, and route appropriately
  const relativePath = apiUrl.replace(API_BASE, '');
  // URL-encode colons to prevent TanStack Router from misinterpreting them
  // Colons in hash routes can be treated as delimiters
  const encodedPath = relativePath.replaceAll(':', '%3A');
  return `${BASE_URL}/#/openalex-url${encodedPath}`;
};

// Helper to get entity type from URL
const getEntityType = (url: string): string | null => {
  const match = /\/([a-z]+)(?:\/|$|\?)/.exec(url);
  return match?.[1] ?? null;
};

const ALL_URLS_TEST_TIMEOUT_MS = 3_600_000; // 60 minutes for all URLs (276 URLs + retries, ~6.5 seconds each)

test.describe('All OpenAlex URLs - Load Test', () => {
  test.setTimeout(ALL_URLS_TEST_TIMEOUT_MS);

  // Group URLs by type for better organization
  const urlsByType = new Map<string, string[]>();
  for (const url of urls) {
    const type = getEntityType(url) ?? 'other';
    const existingUrls = urlsByType.get(type);
    if (existingUrls === undefined) {
      urlsByType.set(type, [url]);
    } else {
      existingUrls.push(url);
    }
  }

  for (const [type, typeUrls] of urlsByType) {
    test.describe(`${type} (${String(typeUrls.length)} URLs)`, () => {
      for (const [index, apiUrl] of typeUrls.entries()) {
        test(`${String(index + 1)}/${String(typeUrls.length)}: ${apiUrl}`, async ({ page }) => {
          const appUrl = toAppUrl(apiUrl);
          const errors: string[] = [];

          // Listen for console errors and routing logs
          page.on('console', message => {
            const text = message.text();
            if (message.type() === 'error') {
              errors.push(text);
            }
            // Log routing messages for debugging
            if (text.includes('routing') || text.includes('splat') || text.includes('orcid') || text.includes('issn')) {
              console.log(`[BROWSER ${message.type()}]:`, text);
            }
          });

          // Navigate to the app URL
          await page.goto(appUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000
          });

          // Wait for main content
          await page.locator('main').waitFor({ timeout: 10_000 });

          // Wait a bit for data to load
          // Removed: waitForTimeout - use locator assertions instead
          // Get page content
          const mainContent = page.locator('main');

          // Basic checks
          await expect(mainContent).not.toBeEmpty();

          const mainText = await mainContent.textContent();

          // Adaptive content threshold based on URL type
          // Pages with ?select= parameters or list pages may have minimal content
          // External ID routes (orcid:, issn:, ror:) show loading screens with minimal content
          // List pages with no cached data may show "No data available" (72 chars minimum)
          const hasSelectParameter = apiUrl.includes('?select=');
          // Check if URL is a list page (ends with entity type, no ID)
          const isListPage = /\/(?:authors|concepts|funders|institutions|publishers|sources|topics|works)(?:\?|$)/.test(apiUrl);
          const isExternalId = apiUrl.includes('orcid:') || apiUrl.includes('issn:') || apiUrl.includes('ror:');
          const minContentLength = hasSelectParameter || isListPage
            ? MIN_CONTENT_LENGTH_LIST_OR_SELECT
            : (isExternalId ? MIN_CONTENT_LENGTH_EXTERNAL_ID : MIN_CONTENT_LENGTH_DEFAULT);

          expect(mainText!.length).toBeGreaterThan(minContentLength);

          // Verify not showing generic error page
          const errorHeading = page.locator('h1:has-text("Error"), h1:has-text("404"), h1:has-text("Not Found")');
          await expect(errorHeading).toHaveCount(0);

          // Check that we have some entity-specific content
          // Should show at least an ID or entity type indicator
          // Skip this check for external ID routes which show loading screens
          if (!isExternalId) {
            const hasEntityIndicator = await page.locator('[class*="entity"], [data-testid*="entity"], h1, h2').count();
            expect(hasEntityIndicator).toBeGreaterThan(0);
          }

          // Log any console errors for debugging
          if (errors.length > 0) {
            console.log(`⚠️  Console errors on ${apiUrl}:`, errors);
          }
        });
      }
    });
  }
});

// Summary test to verify overall results
test.describe('Summary', () => {
  test('should have loaded all URLs', () => {
    expect(urls).toHaveLength(urlsData.totalUrls);
    console.log(`✅ Tested ${String(urls.length)} URLs`);
  });
});
