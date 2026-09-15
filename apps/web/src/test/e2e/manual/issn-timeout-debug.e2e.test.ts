import { hostnameMatches } from '@bibgraph/utils';
import { expect,test } from '@playwright/test';

const DEPLOYED_URL = 'https://mearman.github.io/BibGraph';
const DEBUG_TEST_TIMEOUT_MS = 60_000;
const MAIN_TEXT_PREVIEW_LENGTH = 200;
const EXTENDED_TEXT_PREVIEW_LENGTH = 500;
const RECENT_CONSOLE_MESSAGES_COUNT = 10;
const MIN_CONTENT_LENGTH = 100;

/**
 * ISSN Timeout Debug Test
 *
 * Investigates why issn:2041-1723 times out despite being valid in OpenAlex API.
 * Captures console logs, network activity, and page state to diagnose the issue.
 */

test.describe('ISSN Timeout Investigation', () => {
  test.setTimeout(DEBUG_TEST_TIMEOUT_MS);

  test('should debug ISSN timeout with full diagnostics', async ({ page }) => {
    const consoleMessages: { type: string; text: string }[] = [];
    const errors: string[] = [];
    const networkRequests: { url: string; status: number | null }[] = [];

    // Capture console messages
    page.on('console', (message) => {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    // Capture network requests
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
      });
    });

    // Navigate to ISSN route
    const targetUrl = `${DEPLOYED_URL}/#/sources/issn/2041-1723`;
    console.log('Navigating to:', targetUrl);

    try {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      console.log('Page loaded successfully');
      console.log('Final URL:', page.url());

      // Try to find main content
      try {
        await page.locator('main').waitFor({ timeout: 10_000 });
        const mainText = await page.locator('main').textContent();
        console.log('Main content found:', mainText?.slice(0, MAIN_TEXT_PREVIEW_LENGTH));
      } catch (mainError) {
        console.log('Main selector not found:', mainError);
      }

      // Check for loading indicators
      const loadingIndicators = await page
        .locator('[data-loading], .loading, .skeleton')
        .count();
      console.log('Loading indicators found:', loadingIndicators);

      // Check for error messages
      const errorMessages = await page
        .locator('[data-error], .error, .error-message')
        .count();
      console.log('Error messages found:', errorMessages);
    } catch (navigationError) {
      console.log('Navigation failed:', navigationError);
    }

    // Output diagnostics
    console.log('\n=== DIAGNOSTICS ===');
    console.log('Console Errors:', errors.length);
    for (const [index, error] of errors.entries()) console.log(`  ${String(index + 1)}. ${error}`);

    console.log('\nNetwork Requests:', networkRequests.length);
    const openalexRequests = networkRequests.filter((request) =>
      hostnameMatches(request.url, 'openalex.org'),
    );
    console.log('OpenAlex API Requests:', openalexRequests.length);
    for (const request of openalexRequests) console.log(`  ${String(request.status)} - ${request.url}`)
    ;

    console.log('\nConsole Messages (last 10):');
    for (const message of consoleMessages.slice(-RECENT_CONSOLE_MESSAGES_COUNT)) {
      console.log(`  [${message.type}] ${message.text}`);
    }

    // This test is for diagnostics - always pass so we can see the output
    expect(true).toBe(true);
  });

  test('should test ISSN route with extended timeout', async ({ page }) => {
    const targetUrl = `${DEPLOYED_URL}/#/sources/issn/2041-1723`;

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait longer for potential async loading
    // Removed: waitForTimeout - use locator assertions instead
    const finalUrl = page.url();
    console.log('Final URL after extended wait:', finalUrl);

    const mainText = await page.locator('body').textContent();
    console.log('Page content (first 500 chars):', mainText?.slice(0, EXTENDED_TEXT_PREVIEW_LENGTH));

    // Check if we got redirected to search
    const isSearchPage = finalUrl.includes('/search');
    console.log('Redirected to search?', isSearchPage);

    // Check if page shows any content
    const hasContent = mainText !== null && mainText.length > MIN_CONTENT_LENGTH;
    console.log('Has content?', hasContent);

    expect(hasContent).toBe(true);
  });

  test('should compare working ROR vs failing ISSN', async ({ page }) => {
    console.log('\n=== Testing Working ROR ===');

    // First test a working ROR
    await page.goto(`${DEPLOYED_URL}/#/institutions/ror/02y3ad647`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await page.locator('main').waitFor({ timeout: 10_000 });
    const rorUrl = page.url();
    const rorMain = await page.locator('main').textContent();

    console.log('ROR URL:', rorUrl);
    console.log('ROR loaded successfully');
    console.log('ROR content length:', rorMain?.length);

    console.log('\n=== Testing Failing ISSN ===');

    // Now test the failing ISSN
    await page.goto(`${DEPLOYED_URL}/#/sources/issn/2041-1723`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Removed: waitForTimeout - use locator assertions instead
    const issnUrl = page.url();
    const issnMain = await page.locator('body').textContent();

    console.log('ISSN URL:', issnUrl);
    console.log('ISSN content length:', issnMain?.length);
    console.log('ISSN content (first 500 chars):', issnMain?.slice(0, EXTENDED_TEXT_PREVIEW_LENGTH));

    // Compare behaviors
    console.log('\n=== COMPARISON ===');
    console.log('ROR stayed on entity page:', rorUrl.includes('/institutions/'));
    console.log('ISSN stayed on entity page:', issnUrl.includes('/sources/'));
    console.log(
      'ISSN redirected to search:',
      issnUrl.includes('/search') || issnUrl.includes('?q='),
    );

    expect(true).toBe(true);
  });
});
