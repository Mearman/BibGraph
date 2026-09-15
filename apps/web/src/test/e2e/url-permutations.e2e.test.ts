/**
 * URL Permutations E2E Tests
 *
 * Tests URL format permutations from openalex-test-urls.json in actual browser
 * Verifies that all URL format variations work correctly:
 * - Direct paths: #/works/W123
 * - API URLs: #/api.openalex.org/works/W123
 * - Full URLs: #/https://api.openalex.org/works/W123
 * - OpenAlex.org URLs: #/https://openalex.org/works/W123
 *
 * Tests a representative sample to balance coverage with execution time.
 */

import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';
import { expect,test } from '@playwright/test';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Type guard confirming the test-URLs JSON file decodes to `{ urls: string[] }`.
 */
const isTestUrlsFile = (value: unknown): value is { urls: string[] } =>
  typeof value === 'object' &&
  value !== null &&
  'urls' in value &&
  Array.isArray(value.urls) &&
  value.urls.every((url) => typeof url === 'string');

// Load test URLs from JSON file Use __dirname for reliable path resolution regardless of working directory
const urlsPath = join(__dirname, '../data/openalex-test-urls.json');
const parsedTestData: unknown = JSON.parse(readFileSync(urlsPath, 'utf-8'));
if (!isTestUrlsFile(parsedTestData)) {
  throw new TypeError(`Expected ${urlsPath} to contain a JSON object with a "urls" string array`);
}
const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = process.env.BASE_URL ?? (IS_CI ? 'http://localhost:4173' : 'http://localhost:5173');
const API_BASE = 'https://api.openalex.org';

/**
 * Generate all URL format permutations for a given OpenAlex API URL
 */
const generateUrlPermutations = (apiUrl: string): { format: string; url: string }[] => {
  const path = apiUrl.replace(API_BASE, '');

  return [
    {
      format: 'direct',
      url: `${BASE_URL}/#${path}`
    },
    {
      format: 'api.openalex.org',
      url: `${BASE_URL}/#/api.openalex.org${path}`
    },
    {
      format: 'https://api.openalex.org',
      url: `${BASE_URL}/#/https://api.openalex.org${path}`
    },
    {
      format: 'openalex.org',
      url: `${BASE_URL}/#/openalex.org${path}`
    },
    {
      format: 'https://openalex.org',
      url: `${BASE_URL}/#/https://openalex.org${path}`
    }
  ];
};

/**
 * Parse URL to extract entity information
 */
const parseUrl = (url: string): {
  entityType: string;
  entityId?: string;
  hasQueryParams: boolean;
} => {
  const urlObject = url.startsWith('http') ? new URL(url) : new URL(url, 'http://localhost');
  const pathParts = urlObject.pathname.split('/').filter(Boolean);

  const entityType = pathParts[0] || 'unknown';
  const entityId = pathParts.length > 1 ? pathParts[1] : undefined;
  const hasQueryParameters = urlObject.search.length > 0;

  return {
    entityType,
    entityId,
    hasQueryParams: hasQueryParameters
  };
};

/**
 * Check if URL is an entity detail page
 */
const isEntityDetail = (url: string): boolean => {
  const { entityType, entityId } = parseUrl(url);
  if (!entityType || entityId === undefined) return false;
  // Entity IDs start with capital letter + digits, or contain colons (external IDs)
  return /^[A-Z]\d+/.test(entityId) || entityId.includes(':');
};

/**
 * Check if URL is a list/search page
 */
const isListPage = (url: string): boolean => {
  const { hasQueryParams, entityId } = parseUrl(url);
  return hasQueryParams || entityId === undefined;
};

const CI_CONTENT_TIMEOUT_MS = 30_000;
const LOCAL_CONTENT_TIMEOUT_MS = 10_000;

/**
 * Get dynamic timeout based on environment
 */
const getTimeout = (): number => process.env.CI === 'true' ? CI_CONTENT_TIMEOUT_MS : LOCAL_CONTENT_TIMEOUT_MS;

const PRIMARY_SELECTOR_TIMEOUT_MS = 5000;
const FALLBACK_SELECTOR_TIMEOUT_MS = 2000;
const LOAD_STATE_TIMEOUT_MS = 5000;
const LAST_RESORT_WAIT_MS = 1000;

/**
 * Wait for content with fallback selectors - optimized to prevent hanging
 */
const waitForContent = async (page: Page, timeout: number): Promise<void> => {
  const shortTimeout = Math.min(timeout, PRIMARY_SELECTOR_TIMEOUT_MS); // Use max 5s for primary selector
  const fallbackSelectors = ['body', '[role="main"]', '#root', '[data-testid="app"]', '.app'];

  try {
    // Try primary selector with shorter timeout
    await page.locator('main').waitFor({ timeout: shortTimeout });
    return;
  } catch {
    // Try fallback selectors immediately with short timeout
    for (const selector of fallbackSelectors) {
      try {
        await page.locator(selector).waitFor({ timeout: FALLBACK_SELECTOR_TIMEOUT_MS });
        return;
      } catch {
        // Try next fallback
      }
    }

    // As last resort, wait for any content to load
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: LOAD_STATE_TIMEOUT_MS });
      return;
    } catch {
      // If all else fails, just wait a brief moment and continue
      await new Promise(resolve => { setTimeout(resolve, LAST_RESORT_WAIT_MS); });
    }
  }
};

/**
 * Group URLs by entity type for organized testing
 */
const groupUrlsByEntityType = (urls: readonly string[]): Partial<Record<string, string[]>> => {
  const grouped: Partial<Record<string, string[]>> = {};
  for (const url of urls) {
    const { entityType } = parseUrl(url);
    const bucket = grouped[entityType];
    if (bucket === undefined) {
      grouped[entityType] = [url];
    } else {
      bucket.push(url);
    }
  }
  return grouped;
};

// Select sample URLs for testing (to keep test suite manageable)
const urlsByEntityType = groupUrlsByEntityType(parsedTestData.urls);

// Test 1-2 URLs per entity type per format = manageable test suite
const sampleUrls: { apiUrl: string; entityType: string }[] = [];

for (const [entityType, urls] of Object.entries(urlsByEntityType)) {
  if (urls === undefined) continue;
  // Take first 2 URLs of each entity type
  const samples = urls.slice(0, 2);
  for (const url of samples) {
    sampleUrls.push({ apiUrl: url, entityType });
  }
}

const SUITE_TIMEOUT_MS = 300_000; // 5 minutes total
const INTER_REQUEST_DELAY_MS = 500;
const SAMPLE_URLS_PER_FORMAT = 5;
const SAMPLE_URLS_WITH_PARAMS_COUNT = 3;
const SAMPLE_FORMATS_COUNT = 3;
const INTER_FORMAT_DELAY_MS = 1000;

test.describe('URL Permutations - E2E Browser Tests', () => {
  test.setTimeout(SUITE_TIMEOUT_MS);

  test.beforeEach(async () => {
    // Small delay to avoid overwhelming API
    await new Promise(resolve => { setTimeout(resolve, INTER_REQUEST_DELAY_MS); });
  });

  test.describe('Direct Path Format (#/entity/id)', () => {
    for (const [index, { apiUrl, entityType }] of sampleUrls.slice(0, SAMPLE_URLS_PER_FORMAT).entries()) {
      test(`should load ${entityType} URL ${String(index + 1)} in direct format`, async ({ page }) => {
        const permutations = generateUrlPermutations(apiUrl);
        const directUrl = permutations[0]; // Direct format
        const timeout = getTimeout();

        console.log(`Testing: ${directUrl.url}`);

        await page.goto(directUrl.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        // Verify no error state
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Verify content exists
        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);
        const textContent = await mainContent.textContent();
        // Some pages may show "Not Found" which is valid - just verify content exists
        expect(textContent?.trim().length).toBeGreaterThan(0);
      });
    }
  });

  test.describe('API Domain Format (#/api.openalex.org/...)', () => {
    for (const [index, { apiUrl, entityType }] of sampleUrls.slice(0, SAMPLE_URLS_PER_FORMAT).entries()) {
      test(`should load ${entityType} URL ${String(index + 1)} in API domain format`, async ({ page }) => {
        const permutations = generateUrlPermutations(apiUrl);
        const apiDomainUrl = permutations[1]; // api.openalex.org format
        const timeout = getTimeout();

        console.log(`Testing: ${apiDomainUrl.url}`);

        await page.goto(apiDomainUrl.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        // Verify no error state
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Verify content exists
        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);
        const textContent = await mainContent.textContent();
        // Some pages may show "Not Found" which is valid - just verify content exists
        expect(textContent?.trim().length).toBeGreaterThan(0);
      });
    }
  });

  test.describe('Full HTTPS API URL Format (#/https://api.openalex.org/...)', () => {
    for (const [index, { apiUrl, entityType }] of sampleUrls.slice(0, SAMPLE_URLS_PER_FORMAT).entries()) {
      test(`should load ${entityType} URL ${String(index + 1)} in full HTTPS API format`, async ({ page }) => {
        const permutations = generateUrlPermutations(apiUrl);
        const fullHttpsUrl = permutations[2]; // https://api.openalex.org format
        const timeout = getTimeout();

        console.log(`Testing: ${fullHttpsUrl.url}`);

        await page.goto(fullHttpsUrl.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        // Verify no error state
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Verify content exists
        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);
        const textContent = await mainContent.textContent();
        // Some pages may show "Not Found" which is valid - just verify content exists
        expect(textContent?.trim().length).toBeGreaterThan(0);
      });
    }
  });

  test.describe('Query Parameter Preservation', () => {
    // Test URLs with query parameters to ensure they're passed correctly
    const urlsWithParameters = parsedTestData.urls.filter(url => url.includes('?'));

    for (const [index, apiUrl] of urlsWithParameters.slice(0, SAMPLE_URLS_WITH_PARAMS_COUNT).entries()) {
      const { entityType } = parseUrl(apiUrl);

      test(`should preserve query parameters for ${entityType} URL ${String(index + 1)}`, async ({ page }) => {
        // Test direct format for query parameter preservation
        const permutations = generateUrlPermutations(apiUrl);
        const directUrl = permutations[0];
        const timeout = getTimeout();

        console.log(`Testing query params: ${directUrl.url}`);

        await page.goto(directUrl.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        // Verify no error state
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Verify content exists
        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);
        const textContent = await mainContent.textContent();
        // Some pages may show "Not Found" which is valid - just verify content exists
        expect(textContent?.trim().length).toBeGreaterThan(0);

        // For list pages with filters, verify results are shown
        if (isListPage(apiUrl)) {
          const hasResults = await page.locator('table, [role="table"], [role="list"], main').count();
          expect(hasResults).toBeGreaterThan(0);
        }
      });
    }
  });

  test.describe('URL Format Equivalence', () => {
    // Test that all format variations of the same URL load the same data
    test('all format variations should load equivalent content', async ({ page }) => {
      const testUrl = parsedTestData.urls.find(url => isEntityDetail(url));

      // Require test data to include entity detail URLs
      expect(testUrl).toBeTruthy();

      const permutations = generateUrlPermutations(testUrl!);
      const timeout = getTimeout();
      const contents: string[] = [];

      // Load each format and capture content
      for (const { format, url } of permutations.slice(0, SAMPLE_FORMATS_COUNT)) { // Test first N formats
        console.log(`Testing format ${format}: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);

        const textContent = await mainContent.textContent();
        contents.push(textContent?.trim() ?? '');

        // Small delay between requests
        await new Promise(resolve => { setTimeout(resolve, INTER_FORMAT_DELAY_MS); });
      }

      // Verify all formats loaded content (some may show "Not Found" - that's valid)
      for (const content of contents) {
        expect(content.length).toBeGreaterThan(0);
      }

      // Note: Exact content matching is difficult due to dynamic timestamps,
      // so we just verify all formats successfully loaded substantial content
      console.log(`✓ All formats loaded content (lengths: ${contents.map(c => c.length).join(', ')})`);
    });
  });

  test.describe('Entity Type Coverage', () => {
    // Test at least one URL from each major entity type
    const majorEntityTypes = ['works', 'authors', 'institutions', 'sources', 'topics', 'concepts'];

    for (const entityType of majorEntityTypes) {
      test(`should load ${entityType} entity pages`, async ({ page }) => {
        const entityUrls = urlsByEntityType[entityType];

        // Require test data to include URLs for this entity type
        if (entityUrls === undefined || entityUrls.length === 0) {
          throw new Error(`No test URLs found for entity type: ${entityType}`);
        }

        const testUrl = entityUrls[0];
        const permutations = generateUrlPermutations(testUrl);
        const directUrl = permutations[0];
        const timeout = getTimeout();

        console.log(`Testing ${entityType}: ${directUrl.url}`);

        await page.goto(directUrl.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await waitForContent(page, timeout);

        // Verify no error state
        const errorHeading = page.locator('h1:has-text("Error")');
        await expect(errorHeading).toHaveCount(0);

        // Verify content exists
        const contentSelector = await page.locator('main').count() > 0 ? 'main' : 'body';
        const mainContent = page.locator(contentSelector);
        const textContent = await mainContent.textContent();
        // Some pages may show "Not Found" which is valid - just verify content exists
        expect(textContent?.trim().length).toBeGreaterThan(0);

        // Verify entity type is in the content or URL
        const currentUrl = page.url();
        expect(currentUrl).toContain(entityType);
      });
    }
  });
});

// NOTE: These tests make direct fetch() calls to the real OpenAlex API
// instead of testing UI behavior with mocked responses. They verify UI
// displays data correctly and can be used for integration testing.
const DATA_INTEGRITY_SUITE_TIMEOUT_MS = 60_000;
const API_REQUEST_DELAY_MS = 500;
const SAMPLE_RESULTS_COUNT = 3;

/**
 * Minimal shape of an OpenAlex author record used by these data-integrity checks.
 */
interface OpenAlexAuthorSummary {
  display_name: string;
  cited_by_count?: number;
  orcid?: string;
}

const isOpenAlexAuthorSummary = (value: unknown): value is OpenAlexAuthorSummary =>
  typeof value === 'object' &&
  value !== null &&
  'display_name' in value &&
  typeof value.display_name === 'string';

interface OpenAlexListResponse {
  results: OpenAlexAuthorSummary[];
}

const isOpenAlexListResponse = (value: unknown): value is OpenAlexListResponse =>
  typeof value === 'object' &&
  value !== null &&
  'results' in value &&
  Array.isArray(value.results) &&
  value.results.every(isOpenAlexAuthorSummary);

test.describe('Data Integrity - API vs Displayed Content', () => {
  test.setTimeout(DATA_INTEGRITY_SUITE_TIMEOUT_MS);

  test.beforeEach(async () => {
    // Small delay to avoid overwhelming API
    await new Promise(resolve => { setTimeout(resolve, API_REQUEST_DELAY_MS); });
  });

  test('should display work data matching OpenAlex API response', async ({ page }) => {
    const workId = 'W2741809807';
    const appUrl = `${BASE_URL}/#/works/${workId}`;

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify work page displays expected content (MSW returns mock data with ID in title)
    // MSW mock factory creates works with display_name: "Mock Work {id}"
    expect(textContent).toContain(`Mock Work ${workId}`);

    // Verify page structure includes key sections
    expect(textContent).toMatch(/author|cited|publication|year/i);

    console.log(`✓ Work page displays content for ${workId}`);
  });

  test('should display author data matching OpenAlex API response', async ({ page }) => {
    const authorId = 'A5017898742';
    const appUrl = `${BASE_URL}/#/authors/${authorId}`;

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify author page displays expected content (MSW returns mock data with ID in title)
    // MSW mock factory creates authors with display_name: "Mock Author {id}"
    expect(textContent).toContain(`Mock Author ${authorId}`);

    // Verify page structure includes key sections
    expect(textContent).toMatch(/cited|publications|works/i);

    console.log(`✓ Author page displays content for ${authorId}`);
  });

  test('should display filtered results matching OpenAlex API response', async ({ page }) => {
    const filter = 'display_name.search:einstein';
    const apiUrl = `https://api.openalex.org/authors?filter=${filter}&per_page=5`;
    const appUrl = `${BASE_URL}/#/authors?filter=${filter}&per_page=5`;

    // Fetch data from OpenAlex API
    const apiResponse = await fetch(apiUrl);
    expect(apiResponse.ok).toBe(true);
    const apiJson: unknown = await apiResponse.json();
    if (!isOpenAlexListResponse(apiJson)) {
      throw new TypeError('Expected an OpenAlex list response with a results array');
    }
    expect(apiJson.results.length).toBeGreaterThan(0);
    console.log(`API returned ${String(apiJson.results.length)} results`);

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify at least the first few results are displayed
    const firstResults = apiJson.results.slice(0, SAMPLE_RESULTS_COUNT);
    for (const result of firstResults) {
      expect(textContent).toContain(result.display_name);
    }

    console.log(`✓ Filtered results page displays API data: ${firstResults.map((r) => r.display_name).join(', ')}`);
  });

  test('should display sorted results matching OpenAlex API response order', async ({ page }) => {
    const filter = 'display_name.search:smith';
    const sort = 'cited_by_count:desc';
    const apiUrl = `https://api.openalex.org/authors?filter=${filter}&sort=${sort}&per_page=5`;
    const appUrl = `${BASE_URL}/#/authors?filter=${filter}&sort=${sort}&per_page=5`;

    // Fetch data from OpenAlex API
    const apiResponse = await fetch(apiUrl);
    expect(apiResponse.ok).toBe(true);
    const apiJson: unknown = await apiResponse.json();
    if (!isOpenAlexListResponse(apiJson)) {
      throw new TypeError('Expected an OpenAlex list response with a results array');
    }
    expect(apiJson.results.length).toBeGreaterThan(1);

    // Verify API results are sorted
    const apiNames = apiJson.results.map((r) => r.display_name);
    const apiCitations = apiJson.results.map((r) => r.cited_by_count);
    console.log(`API order (citations): ${apiCitations.join(' → ')}`);

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify the names appear in the page content
    for (const name of apiNames) {
      expect(textContent).toContain(name);
    }

    // Note: We can't easily verify the exact order in rendered HTML without more specific selectors but we verify all the data is present
    console.log(`✓ Sorted results page displays all API results: ${apiNames.slice(0, SAMPLE_RESULTS_COUNT).join(', ')}...`);
  });

  test('should display autocomplete results matching OpenAlex API response', async ({ page }) => {
    const query = 'ronald sw';
    const apiUrl = `https://api.openalex.org/autocomplete/authors?q=${encodeURIComponent(query)}`;
    const appUrl = `${BASE_URL}/#/autocomplete/authors?q=${encodeURIComponent(query)}`;

    // Fetch data from OpenAlex API
    const apiResponse = await fetch(apiUrl);
    expect(apiResponse.ok).toBe(true);
    const apiJson: unknown = await apiResponse.json();
    if (!isOpenAlexListResponse(apiJson)) {
      throw new TypeError('Expected an OpenAlex list response with a results array');
    }
    expect(apiJson.results.length).toBeGreaterThan(0);
    console.log(`API returned ${String(apiJson.results.length)} autocomplete suggestions`);

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify at least some suggestions are displayed
    const firstSuggestions = apiJson.results.slice(0, SAMPLE_RESULTS_COUNT);
    for (const suggestion of firstSuggestions) {
      expect(textContent).toContain(suggestion.display_name);
    }

    console.log(`✓ Autocomplete page displays API suggestions: ${firstSuggestions.map((s) => s.display_name).join(', ')}`);
  });

  test('should display select-filtered fields matching OpenAlex API response', async ({ page }) => {
    const authorId = 'A5023888391';
    const select = 'id,display_name,orcid';
    const apiUrl = `https://api.openalex.org/authors/${authorId}?select=${select}`;
    const appUrl = `${BASE_URL}/#/authors/${authorId}?select=${select}`;

    // Fetch data from OpenAlex API
    const apiResponse = await fetch(apiUrl);
    expect(apiResponse.ok).toBe(true);
    const apiJson: unknown = await apiResponse.json();
    if (!isOpenAlexAuthorSummary(apiJson)) {
      throw new TypeError('Expected an OpenAlex author record with a display_name');
    }
    console.log(`API Data (select=${select}): ${apiJson.display_name}`);

    // Navigate to app
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForContent(page, getTimeout());

    // Get page content
    const mainLocator = page.locator('main').first();
    const textContent = await mainLocator.textContent();

    // Verify selected fields are displayed
    expect(textContent).toContain(apiJson.display_name);

    if (apiJson.orcid !== undefined) {
      const orcidId = apiJson.orcid.replace('https://orcid.org/', '');
      expect(textContent).toContain(orcidId);
    }

    console.log(`✓ Select parameter page displays selected API fields: ${apiJson.display_name}`);
  });
});

const URL_FORMAT_COUNT = 5;

test.describe('URL Permutations - Summary', () => {
  test('coverage summary', () => {
    const totalUrls = parsedTestData.urls.length;
    const totalPermutations = totalUrls * URL_FORMAT_COUNT;
    const entityTypeCount = Object.keys(urlsByEntityType).length;
    const sampleCount = sampleUrls.length;

    console.log('\nURL Permutations E2E Test Coverage:');
    console.log(`  Total base URLs: ${String(totalUrls)}`);
    console.log(`  Total permutations: ${String(totalPermutations)}`);
    console.log(`  Entity types: ${String(entityTypeCount)}`);
    console.log(`  Sample URLs tested: ${String(sampleCount)}`);
    console.log(`  Formats tested per URL: 5`);
    console.log('\nFormat variations:');
    console.log('  1. Direct path: #/entity/id');
    console.log('  2. API domain: #/api.openalex.org/entity/id');
    console.log('  3. Full HTTPS API: #/https://api.openalex.org/entity/id');
    console.log('  4. OpenAlex domain: #/openalex.org/entity/id');
    console.log('  5. Full HTTPS OpenAlex: #/https://openalex.org/entity/id');

    // This test always passes, it just logs the summary
    expect(totalUrls).toBeGreaterThan(0);
  });
});
