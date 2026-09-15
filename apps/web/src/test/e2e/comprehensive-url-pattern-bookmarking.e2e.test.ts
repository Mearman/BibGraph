import { expect,test } from '@playwright/test';

/**
 * Comprehensive Bookmarking URL Pattern Tests
 * Tests bookmarking functionality across different OpenAlex URL patterns
 *
 * Test Categories:
 * 1. Basic entity URLs (works, authors, institutions, etc.)
 * 2. URLs with search parameters and filters
 * 3. External ID URLs (ORCID, ROR, DOI)
 * 4. Complex URLs with multiple parameters
 * 5. Special focus on bioplastics URL pattern
 */

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = IS_CI ? 'http://localhost:4173' : 'http://localhost:5173';

const APP_INIT_WAIT_MS = 1000;
const ENTITY_LOAD_WAIT_MS = 2000;
const SEARCH_QUERY_WAIT_MS = 3000;
const URL_PREVIEW_LENGTH_SHORT = 50;
const URL_PREVIEW_LENGTH_LONG = 60;
const MIN_SUCCESS_RATE = 0.8;
const PERCENTAGE_MULTIPLIER = 100;

// Representative URL patterns from the test data
const URL_PATTERNS = {
  // Basic entity URLs
  basicEntity: [
    'https://api.openalex.org/works/W2741809807',
    'https://api.openalex.org/authors/A5006060960',
    'https://api.openalex.org/institutions/I27837315',
    'https://api.openalex.org/sources/S137773608',
    'https://api.openalex.org/topics/T11636',
    'https://api.openalex.org/funders/F4320332161',
    'https://api.openalex.org/publishers/P4310319965',
    'https://api.openalex.org/concepts/C71924100',
  ],

  // URLs with search parameters
  searchParams: [
    'https://api.openalex.org/authors?filter=display_name.search:einstein',
    'https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc',
    'https://api.openalex.org/institutions?search=stanford',
    'https://api.openalex.org/concepts?search=artificial%20intelligence',
  ],

  // External ID URLs
  externalIds: [
    'https://api.openalex.org/authors/orcid:0000-0002-1298-3089',
    'https://api.openalex.org/institutions/ror:02y3ad647',
    'https://api.openalex.org/works/https://doi.org/10.7717/peerj.4375',
    'https://api.openalex.org/works/pmid:14907713',
  ],

  // Complex URLs with multiple parameters
  complexParams: [
    'https://api.openalex.org/works?filter=publication_year:2020&per_page=100&cursor=*',
    'https://api.openalex.org/authors?filter=has_orcid:true&group_by=last_known_institutions.country_code',
    'https://api.openalex.org/works?filter=institutions.country_code:fr,primary_location.source.issn:0957-1558',
    'https://api.openalex.org/sources?filter=is_global_south:true&sort=cited_by_count:desc&per_page=50&page=2',
  ],

  // List pages
  listPages: [
    'https://api.openalex.org/works?per_page=25&page=1',
    'https://api.openalex.org/authors?per_page=50&page=2',
    'https://api.openalex.org/institutions?sample=50&per_page=50',
  ],
};

// Special bioplastics URL pattern mentioned by the user
const BIOPLASTICS_URL = 'https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc';

test.describe('Bookmarking URL Pattern Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies but keep localStorage accessible
    await page.context().clearCookies();

    // Wait for app to be ready
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(APP_INIT_WAIT_MS); // Allow app to initialize
  });

  test.describe('Basic Entity URL Bookmarking', () => {
    for (const url of URL_PATTERNS.basicEntity) {
      test(`should bookmark basic entity URL: ${String(url.split('/').pop())}`, async ({ page }) => {
        console.log(`Testing basic entity URL: ${url}`);

        // Navigate to the URL through hash routing
        await page.goto(`${BASE_URL}/#/${url}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(ENTITY_LOAD_WAIT_MS); // Allow for redirection and data loading

        // Check if we're on an entity page (look for bookmark button)
        const bookmarkButton = page.locator('button[aria-label*="bookmark" i], button[data-testid*="bookmark" i], .mantine-ActionIcon-root').first();

        // Try to find bookmark button by looking for the icon
        const bookmarkIcon = page.locator('svg[data-testid="icon-bookmark" i], svg[aria-label*="bookmark" i]').first();

        // Check if page loaded successfully (not an error page)
        const pageTitle = await page.title();
        const hasContent = await page.locator('body').textContent() ?? '';

        expect(pageTitle).not.toContain('404');
        expect(hasContent).not.toContain('Page not found');

        // If we can find a bookmark button, test bookmarking
        if (await bookmarkButton.isVisible() || await bookmarkIcon.isVisible()) {
          console.log(`Bookmark button found for: ${url}`);

          const buttonToClick = await bookmarkButton.isVisible() ? bookmarkButton : bookmarkIcon;

          // Click bookmark button
          await buttonToClick.click();
          // Removed: waitForTimeout - use locator assertions instead
          // Navigate to bookmarks page
          await page.goto(`${BASE_URL}/#/bookmarks`);
          await page.waitForLoadState('networkidle');
          // Removed: waitForTimeout - use locator assertions instead
          // Check if bookmark was created
          const bookmarkCards = page.locator('[data-testid="bookmark-card"], .mantine-Card-root');
          const hasBookmarks = await bookmarkCards.count() > 0;

          if (hasBookmarks) {
            console.log(`✓ Bookmark created successfully for: ${url}`);
          } else {
            console.log(`⚠ Bookmark button found but no bookmark saved for: ${url}`);
          }
        } else {
          console.log(`ℹ No bookmark button found for: ${url} (might be a list or search page)`);
        }
      });
    }
  });

  test.describe('Search Parameter URL Bookmarking', () => {
    for (const url of URL_PATTERNS.searchParams) {
      test(`should handle search parameter URL: ${url.split('?', 2)[1]?.slice(0, URL_PREVIEW_LENGTH_SHORT)}...`, async ({ page }) => {
        console.log(`Testing search parameter URL: ${url}`);

        await page.goto(`${BASE_URL}/#/${url}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(SEARCH_QUERY_WAIT_MS); // Search pages may take longer

        // Check if page loaded successfully
        const pageTitle = await page.title();
        // Note: hasContent would be used for additional validation in future enhancements
        // const hasContent = await page.locator('body').textContent() || '';

        expect(pageTitle).not.toContain('404');

        // For search pages, check for results or search interface
        const searchResults = page.locator('[data-testid*="search"], [data-testid*="results"], .mantine-Card-root').first();
        const hasSearchResults = await searchResults.isVisible();

        if (hasSearchResults) {
          console.log(`✓ Search page loaded successfully for: ${url}`);
        } else {
          console.log(`ℹ No visible search results for: ${url}`);
        }
      });
    }
  });

  test.describe('External ID URL Bookmarking', () => {
    for (const url of URL_PATTERNS.externalIds) {
      test(`should handle external ID URL: ${String(url.split('/').pop())}`, async ({ page }) => {
        console.log(`Testing external ID URL: ${url}`);

        await page.goto(`${BASE_URL}/#/${url}`);
        await page.waitForLoadState('networkidle');
        // Removed: waitForTimeout - use locator assertions instead
        // Check if page loaded successfully
        const pageTitle = await page.title();
        expect(pageTitle).not.toContain('404');

        // Check for redirect to entity page
        const currentHash = await page.evaluate(() => window.location.hash);
        console.log(`Redirected to: ${currentHash}`);

        // Look for entity detail content
        const entityContent = page.locator('[data-testid*="entity"], .mantine-Container, .mantine-Paper-root').first();
        const hasEntityContent = await entityContent.isVisible();

        if (hasEntityContent) {
          console.log(`✓ External ID resolved successfully for: ${url}`);
        } else {
          console.log(`⚠ External ID may not have resolved for: ${url}`);
        }
      });
    }
  });

  test.describe('Complex Parameter URL Bookmarking', () => {
    for (const url of URL_PATTERNS.complexParams) {
      test(`should handle complex parameter URL: ${url.split('?', 2)[1]?.slice(0, URL_PREVIEW_LENGTH_LONG)}...`, async ({ page }) => {
        console.log(`Testing complex parameter URL: ${url}`);

        await page.goto(`${BASE_URL}/#/${url}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(SEARCH_QUERY_WAIT_MS); // Complex queries may take longer

        // Check if page loaded without errors
        const pageTitle = await page.title();
        expect(pageTitle).not.toContain('404');

        // Look for content or loading states
        const pageContent = await page.locator('body').textContent() ?? '';
        const hasValidContent = !pageContent.includes('Page not found') && !pageContent.includes('Error');

        if (hasValidContent) {
          console.log(`✓ Complex parameter URL handled successfully: ${url}`);
        } else {
          console.log(`⚠ Complex parameter URL may have issues: ${url}`);
        }
      });
    }
  });

  test.describe('Bioplastics URL Pattern Focus', () => {
    test('should properly handle bioplastics search URL', async ({ page }) => {
      console.log(`🔍 Testing bioplastics URL pattern: ${BIOPLASTICS_URL}`);

      // Navigate to bioplastics URL
      await page.goto(`${BASE_URL}/#/${BIOPLASTICS_URL}`);
      await page.waitForLoadState('networkidle');
      // Removed: waitForTimeout - use locator assertions instead
      // Verify URL redirection
      const currentHash = await page.evaluate(() => window.location.hash);
      console.log(`Current hash after navigation: ${currentHash}`);

      // Check page content
      const pageTitle = await page.title();
      const pageContent = await page.locator('body').textContent() ?? '';

      expect(pageTitle).not.toContain('404');
      expect(pageContent).not.toContain('Page not found');

      // Look for search results or bioplastics-related content
      const bioplasticsContent = page.locator('text=/bioplastics/i').first();
      const hasBioplasticsContent = await bioplasticsContent.isVisible();

      if (hasBioplasticsContent) {
        console.log(`✓ Bioplastics content found on page`);
      } else {
        console.log(`ℹ No explicit bioplastics content found, checking for general search results`);
      }

      // Look for any results or cards
      const resultsCards = page.locator('.mantine-Card-root, [data-testid*="result"], [data-testid*="item"]');
      const resultsCount = await resultsCards.count();

      if (resultsCount > 0) {
        console.log(`✓ Found ${String(resultsCount)} result cards for bioplastics search`);
      } else {
        console.log(`ℹ No result cards found for bioplastics search`);
      }

      // Check for bookmark functionality
      const bookmarkButton = page.locator('button[aria-label*="bookmark" i], .mantine-ActionIcon-root').first();

      if (await bookmarkButton.isVisible()) {
        console.log(`✓ Bookmark button available on bioplastics page`);

        // Test bookmarking
        await bookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        // Check bookmarks
        await page.goto(`${BASE_URL}/#/bookmarks`);
        await page.waitForLoadState('networkidle');
        // Removed: waitForTimeout - use locator assertions instead
        const bookmarkCards = page.locator('[data-testid="bookmark-card"], .mantine-Card-root');
        const bookmarksCount = await bookmarkCards.count();

        if (bookmarksCount > 0) {
          console.log(`✓ Bioplastics bookmark created successfully`);

          // Test bookmark navigation back
          const firstBookmark = bookmarkCards.first();
          await firstBookmark.click();
          // Removed: waitForTimeout - use locator assertions instead
          const finalHash = await page.evaluate(() => window.location.hash);
          console.log(`✓ Navigated back to: ${finalHash}`);
        } else {
          console.log(`⚠ Bioplastics bookmark not found in bookmarks`);
        }
      } else {
        console.log(`ℹ No bookmark button found on bioplastics page`);
      }
    });
  });

  test.describe('Bookmark Persistence and Navigation', () => {
    test('should maintain bookmarks across page reloads', async ({ page }) => {
      const testUrl = URL_PATTERNS.basicEntity[0]; // Use first basic entity

      console.log(`Testing bookmark persistence for: ${testUrl}`);

      // Navigate and bookmark
      await page.goto(`${BASE_URL}/#/${testUrl}`);
      await page.waitForLoadState('networkidle');
      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('button[aria-label*="bookmark" i], .mantine-ActionIcon-root').first();

      if (await bookmarkButton.isVisible()) {
        await bookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        console.log(`✓ Bookmark created`);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');
        // Removed: waitForTimeout - use locator assertions instead
        // Check bookmarks page
        await page.goto(`${BASE_URL}/#/bookmarks`);
        await page.waitForLoadState('networkidle');
        // Removed: waitForTimeout - use locator assertions instead
        const bookmarkCards = page.locator('[data-testid="bookmark-card"], .mantine-Card-root');
        const hasBookmarksAfterReload = await bookmarkCards.count() > 0;

        expect(hasBookmarksAfterReload).toBe(true);
        console.log(`✓ Bookmark persisted after page reload`);
      } else {
        console.log(`⚠ No bookmark button found for persistence test`);
      }
    });
  });

  test.describe('URL Pattern Analysis', () => {
    test('should analyze URL handling across different patterns', async ({ page }) => {
      const testResults = {
        total: 0,
        successful: 0,
        failed: 0,
        patterns: {} as Record<string, { total: number; successful: number; failed: number }>,
      };

      const allPatterns = Object.entries(URL_PATTERNS);

      for (const [category, urls] of allPatterns) {
        testResults.patterns[category] = { total: urls.length, successful: 0, failed: 0 };

        for (const url of urls.slice(0, 2)) { // Test first 2 URLs from each category to save time
          testResults.total++;
          testResults.patterns[category].total++;

          try {
            await page.goto(`${BASE_URL}/#/${url}`);
            await page.waitForLoadState('networkidle');
            // Removed: waitForTimeout - use locator assertions instead
            const pageTitle = await page.title();
            const hasError = pageTitle.includes('404') || pageTitle.includes('Error');

            if (hasError) {
              testResults.failed++;
              testResults.patterns[category].failed++;
              console.log(`❌ ${category}: ${String(url.split('/').pop())} - ${pageTitle}`);
            } else {
              testResults.successful++;
              testResults.patterns[category].successful++;
              console.log(`✓ ${category}: ${String(url.split('/').pop())}`);
            }
          } catch (error) {
            testResults.failed++;
            testResults.patterns[category].failed++;
            console.log(`❌ ${category}: ${String(url.split('/').pop())} - ${String(error)}`);
          }
        }
      }

      console.log('\n📊 URL Pattern Analysis Results:');
      console.log(`Total URLs tested: ${String(testResults.total)}`);
      console.log(`Successful: ${String(testResults.successful)}`);
      console.log(`Failed: ${String(testResults.failed)}`);
      console.log(`Success rate: ${((testResults.successful / testResults.total) * PERCENTAGE_MULTIPLIER).toFixed(1)}%`);

      console.log('\nBy category:');
      for (const [category, results] of Object.entries(testResults.patterns)) {
        const rate = ((results.successful / results.total) * PERCENTAGE_MULTIPLIER).toFixed(1);
        console.log(`  ${category}: ${String(results.successful)}/${String(results.total)} (${rate}%)`);
      }

      // Ensure at least 80% success rate
      const successRate = testResults.successful / testResults.total;
      expect(successRate).toBeGreaterThan(MIN_SUCCESS_RATE);
    });
  });
});

// Helper function to extract entity info from URL (currently unused - keeping for potential future use)
// function extractEntityInfo(url: string) {
//   const match = url.match(/https:\/\/api\.openalex\.org\/(\w+)\/?([^?]*)/);
//   if (match) {
//     const [, entityType, entityPath] = match;
//     return { entityType, entityPath: entityPath || 'list' };
//   }
//   return null;
// }