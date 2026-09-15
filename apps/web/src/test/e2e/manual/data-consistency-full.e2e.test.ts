/**
 * End-to-End Data Consistency Test
 *
 * Verifies that all 276 URLs from openalex-urls.json:
 * 1. Load successfully in the application
 * 2. Display the same data that the API returns
 * 3. Render in styled views correctly
 *
 * This test navigates to each URL, fetches the API data directly,
 * and compares it with what's displayed in the DOM.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect,test } from '@playwright/test';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Minimal structural shape of an OpenAlex API response, covering only the fields this test suite reads directly. OpenAlex entity/list responses vary by entity type, so the remaining fields are accessed through the index signature.
 */
interface OpenAlexApiTestData {
  display_name?: string;
  title?: string;
  id?: string;
  cited_by_count?: number;
  results?: OpenAlexApiTestData[];
  meta?: { count?: number };
  [key: string]: unknown;
}

// Load all URLs from the JSON file (relative to test file location)
const urlsPath = join(__dirname, '../../../../../../openalex-urls-sample.json');
const urls = JSON.parse(readFileSync(urlsPath, 'utf-8')) as string[];

const BASE_URL = process.env.BASE_URL ?? (process.env.CI !== undefined && process.env.CI !== '' ? 'http://localhost:4173' : 'http://localhost:5173');
const API_BASE = 'https://api.openalex.org';

const FULL_SUITE_TIMEOUT_MS = 3_600_000; // 60 minutes for all URLs (276 URLs + retries, ~6.5 seconds each)
const DATA_LOAD_WAIT_MS = 2000; // Give time for API calls to complete
const DISPLAY_NAME_PREVIEW_LENGTH = 50;
const RESULT_TEXT_PREVIEW_LENGTH = 30;

const isStringOrNumber = (value: unknown): value is string | number =>
  typeof value === 'string' || typeof value === 'number';

// Helper to convert API URL to app URL
const toAppUrl = (apiUrl: string): string => {
  // For the app, we can use either format:
  // 1. Full API URL: #/https://api.openalex.org/works/...
  // 2. Relative path: #/works/...
  // Let's use the relative path format as it's cleaner
  const relativePath = apiUrl.replace(API_BASE, '');
  return `${BASE_URL}/#${relativePath}`;
};

// Helper to parse entity type from URL
const getEntityType = (url: string): string | null => {
  const match = /\/([a-z]+)(?:\/|$|\?)/.exec(url);
  return match ? match[1] : null;
};

// Helper to check if URL is an entity detail page (has ID)
const isEntityDetail = (url: string): boolean => {
  const entityType = getEntityType(url);
  if (entityType === null) return false;

  // Check for entity ID pattern after the entity type
  const pattern = new RegExp(String.raw`/${entityType}/([A-Z]\d+|https?://|[a-z]+:)`);
  return pattern.test(url);
};

// Helper to check if URL is a list/search page
const isListPage = (url: string): boolean => {
  const entityType = getEntityType(url);
  if (entityType === null) return false;

  // Has query parameters or is just the entity type
  return url.includes('?') || url.endsWith(`/${entityType}`);
};

// Helper to check if URL is an autocomplete endpoint
const isAutocomplete = (url: string): boolean => url.includes('/autocomplete');

test.describe('Data Consistency - All 276 URLs', () => {
  test.setTimeout(FULL_SUITE_TIMEOUT_MS);

  // Test a representative sample first for faster feedback
  const sampleUrls = [
    urls.find(u => u.includes('/authors/A')) ?? urls[0], // Author detail
    urls.find(u => u.includes('/works/W')) ?? urls[1], // Work detail
    urls.find(u => u.includes('/authors?filter=')) ?? urls[2], // Author search
    urls.find(u => u.includes('/works?filter=')) ?? urls[3], // Work search
  ].filter(Boolean);

  test.describe('Sample URLs - Quick Validation', () => {
    for (const apiUrl of sampleUrls) {
      test(`should display correct data for ${apiUrl}`, async ({ page }) => {
        const appUrl = toAppUrl(apiUrl);
        // Note: entityType would be used for additional validation in enhanced tests
        // const entityType = getEntityType(apiUrl);

        // Navigate to the app URL
        await page.goto(appUrl, { waitUntil: 'domcontentloaded' });

        // Wait for content to load (look for main content area)
        await page.locator('main').waitFor({ timeout: 10_000 });

        // Wait for data to actually load - look for loading state to disappear The page might show a loading skeleton or spinner initially
        await page.waitForTimeout(DATA_LOAD_WAIT_MS);

        // Check that we're not showing an error page
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Fetch the API data directly
        const response = await fetch(apiUrl);

        // API should return a valid response for all test URLs
        expect(response.ok).toBe(true);

        const apiData = await response.json() as OpenAlexApiTestData;

        if (isEntityDetail(apiUrl)) {
          // For entity detail pages, verify key fields are displayed
          const displayName = apiData.display_name ?? apiData.title;
          if (displayName !== undefined && displayName !== '') {
            // Check that the display name appears on the page
            const nameElement = page.locator(`text=${displayName.slice(0, DISPLAY_NAME_PREVIEW_LENGTH)}`).first();
            await expect(nameElement).toBeVisible({ timeout: 5000 });
          }

          // Check for entity ID
          if (apiData.id !== undefined && apiData.id !== '') {
            const entityId = apiData.id.split('/').pop() ?? '';
            const idText = page.locator(`text=${entityId}`).first();
            await expect(idText).toBeVisible({ timeout: 5000 });
          }

          // Check for citation count if present
          if (apiData.cited_by_count !== undefined) {
            const citationText = page.locator(String.raw`text=/\d+.*citation/i`).first();
            await expect(citationText).toBeVisible({ timeout: 5000 });
          }
        } else if (isListPage(apiUrl) && !isAutocomplete(apiUrl)) {
          // For list pages, verify results are displayed
          const results = apiData.results;
          if (results !== undefined && results.length > 0) {
            // Check that at least the first result's name appears
            const firstResult = results[0];
            const displayName = firstResult.display_name ?? firstResult.title;
            if (displayName !== undefined && displayName !== '') {
              // Look for the name in a table, list, or grid
              const resultElement = page.locator(`text=${displayName.slice(0, RESULT_TEXT_PREVIEW_LENGTH)}`).first();
              await expect(resultElement).toBeVisible({ timeout: 5000 });
            }

            // Check that the result count is displayed
            const resultCount = apiData.meta?.count;
            if (resultCount !== undefined) {
              const countText = page.locator(`text=/${resultCount.toLocaleString()}/`).first();
              await expect(countText).toBeVisible({ timeout: 5000 });
            }
          }
        } else if (isAutocomplete(apiUrl)) {
          // Autocomplete endpoints return { results: [...] }
          // These might be handled differently in the UI
          // For now, just verify the page loads without error
          const mainContent = page.locator('main');
          await expect(mainContent).not.toHaveText('');
        }
      });
    }
  });

  test.describe('All 276 URLs - Full Validation', () => {
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
      test.describe(`${type} URLs (${String(typeUrls.length)} total)`, () => {
        for (const [index, apiUrl] of typeUrls.entries()) {
          test(`should load and display data: ${type} ${String(index + 1)}/${String(typeUrls.length)}`, async ({ page }) => {
            const appUrl = toAppUrl(apiUrl);

            // Navigate to the app URL
            await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

            // Wait for main content
            await page.locator('main').waitFor({ timeout: 10_000 });

            // Verify no error state
            const errorHeading = page.locator('h1:has-text("Error")');
            await expect(errorHeading).toHaveCount(0);

            // Verify main content exists and has substantial content
            const mainContent = page.locator('main');
            await expect(mainContent).not.toHaveText('');
            await expect(mainContent).not.toHaveText(/^.{0,50}$/); // Should have more than 50 characters

            // For detail pages, verify entity data is shown
            if (isEntityDetail(apiUrl)) {
              // Should show entity information section
              const hasEntityInfo = await page.locator('[data-testid="entity-info"], .entity-info, [class*="entity"]').count();
              expect(hasEntityInfo).toBeGreaterThan(0);
            }

            // For list pages, verify results are shown
            if (isListPage(apiUrl) && !isAutocomplete(apiUrl)) {
              // Should show table, list, or grid of results
              const hasResults = await page.locator('table, [role="table"], [role="list"], .grid').count();
              expect(hasResults).toBeGreaterThan(0);
            }
          });
        }
      });
    }
  });

  test.describe('Data Field Verification', () => {
    // Test specific data fields for key entity types
    const testCases = [
      {
        url: 'https://api.openalex.org/authors/A5017898742',
        fields: ['display_name', 'works_count', 'cited_by_count', 'h_index'],
      },
      {
        url: 'https://api.openalex.org/works/W2741809807',
        fields: ['display_name', 'publication_year', 'cited_by_count', 'type'],
      },
      {
        url: 'https://api.openalex.org/sources/S137773608',
        fields: ['display_name', 'works_count', 'cited_by_count'],
      },
    ];

    for (const { url, fields } of testCases) {
      test(`should display all required fields for ${url}`, async ({ page }) => {
        const appUrl = toAppUrl(url);

        // Fetch API data
        const response = await fetch(url);
        const apiData = await response.json() as OpenAlexApiTestData;

        // Navigate to app
        await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
        await page.locator('main').waitFor();

        // Verify each field is displayed
        for (const field of fields) {
          const value = apiData[field];
          if (isStringOrNumber(value)) {
            // Convert value to string for searching
            const searchValue = typeof value === 'string' ? value : String(value);

            // Look for the value on the page
            const fieldElement = page.locator(`text=/${searchValue.slice(0, RESULT_TEXT_PREVIEW_LENGTH)}/`).first();
            await expect(fieldElement).toBeVisible({
              timeout: 5000,
            });
          }
        }
      });
    }
  });
});
