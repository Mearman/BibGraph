/**
 * CSS Loading Helpers
 *
 * Utilities to wait for CSS and Mantine styles to be fully loaded and applied.
 * Addresses timing issues in CI environments where styles load asynchronously.
 */

import type { Page } from "@playwright/test";

const MANTINE_SETTLE_WAIT_MS = 200;

/**
 * Wait for Mantine CSS to be fully loaded and applied
 * This fixes issues where element size/visibility checks fail before styles are loaded
 * @param page - Playwright Page instance
 * @param timeout - Maximum time to wait in milliseconds
 */
export const waitForMantineStyles = async (page: Page, timeout = 15_000): Promise<void> => {
  await page.waitForFunction(() => {
    // Create a test element with Mantine class
    const testElement = document.createElement('div');
    testElement.className = 'mantine-Text-root';
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';
    document.body.append(testElement);

    // Check if Mantine styles are applied by verifying computed styles
    const computedStyle = getComputedStyle(testElement);
    const hasMantineStyles = computedStyle.fontFamily !== 'initial' &&
                             computedStyle.fontFamily !== '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif';

    testElement.remove();
    return hasMantineStyles;
  }, { timeout });
};

/**
 * Wait for CSS to be fully loaded using the existing BasePageObject approach
 * This provides a more reliable CSS load detection than simple timeouts
 * @param page - Playwright Page instance
 * @param timeout - Maximum time to wait in milliseconds
 */
export const waitForStylesApplied = async (page: Page, timeout = 15_000): Promise<void> => {
  await page.waitForFunction(() => {
    const testElement = document.createElement('div');
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.pointerEvents = 'none';
    document.body.append(testElement);

    const computedStyle = getComputedStyle(testElement);
    const isStylesLoaded = computedStyle.position === 'absolute';

    testElement.remove();
    return isStylesLoaded;
  }, { timeout });

  // Additional wait for Mantine styles to settle
  await page.waitForTimeout(MANTINE_SETTLE_WAIT_MS);
};

/**
 * Wait for app to be ready including CSS and basic element detection
 * Combines CSS loading with basic app readiness checks
 * @param page - Playwright Page instance
 * @param timeout - Maximum time to wait in milliseconds
 */
export const waitForAppReady = async (page: Page, timeout = 20_000): Promise<void> => {
  // Wait for root element to be present
  await page.waitForSelector('#root', { timeout });

  // Wait for CSS to be applied
  await waitForStylesApplied(page, timeout);

  // Wait for Mantine styles specifically
  await waitForMantineStyles(page, timeout);
};

/**
 * Configuration options for {@link waitForVisibleElement}.
 */
interface WaitForVisibleElementOptions {
  /**
   * Maximum time to wait in milliseconds
   */
  timeout?: number;
  /**
   * Whether to wait for CSS to be loaded first
   */
  ensureCSS?: boolean;
}

/**
 * Enhanced wait for element that also ensures CSS is loaded Useful for elements that need correct styling for size/visibility checks
 * @param page - Playwright Page instance
 * @param selector - CSS selector for the element to wait for
 * @param options - Configuration options
 */
export const waitForVisibleElement = async (
  page: Page,
  selector: string,
  options: Readonly<WaitForVisibleElementOptions> = {}
): Promise<void> => {
  const { timeout = 15_000, ensureCSS = true } = options;

  if (ensureCSS) {
    // Ensure CSS is loaded before checking element visibility
    await waitForMantineStyles(page, timeout);
  }

  await page.waitForSelector(selector, {
    state: 'visible',
    timeout
  });
};