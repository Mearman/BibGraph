/**
 * E2E tests for mobile navigation menu
 * Tests US1: Mobile-First Header Navigation (P1)
 */

import { expect,test } from '@playwright/test';

import { waitForMantineStyles } from '../helpers/css-ready';

const MAX_TAB_ATTEMPTS = 20;
const MIN_TOUCH_TARGET_SIZE_PX = 44;

test.describe('Mobile Navigation Menu - E2E', () => {
  test.describe('T013: Mobile viewport behavior (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');
    });

    test('should show hamburger menu button on mobile', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await expect(menuButton).toBeVisible();
    });

    test('should hide desktop navigation buttons on mobile', async ({ page }) => {
      // Desktop navigation buttons should not be visible
      const homeButton = page.getByRole('link', { name: /^home$/i });
      const aboutButton = page.getByRole('link', { name: /^about$/i });

      await expect(homeButton).toBeHidden();
      await expect(aboutButton).toBeHidden();
    });

    test('should hide search input on mobile', async ({ page }) => {
      const searchInput = page.getByLabel(/global search input/i);
      await expect(searchInput).toBeHidden();
    });

    test('should open menu dropdown when hamburger clicked', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await menuButton.click();

      // Menu items should be visible
      await expect(page.getByRole('menuitem', { name: /home/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /about/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /history/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /bookmarks/i })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: /catalogue/i })).toBeVisible();
    });

    test('should navigate when menu item clicked', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await menuButton.click();

      const aboutMenuItem = page.getByRole('menuitem', { name: /about/i });
      await aboutMenuItem.click();

      // Should navigate to /about
      await expect(page).toHaveURL('/about');
    });

    test('should close menu after navigation', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await menuButton.click();

      const homeMenuItem = page.getByRole('menuitem', { name: /home/i });
      await homeMenuItem.click();

      // Menu should close
      await expect(page.getByRole('menuitem', { name: /about/i })).toBeHidden();
    });
  });

  test.describe('T014: Tablet viewport behavior (768px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/');
    });

    test('should show search input on tablet', async ({ page }) => {
      const searchInput = page.getByLabel(/global search input/i);
      await expect(searchInput).toBeVisible();
    });

    test('should show desktop navigation buttons on tablet', async ({ page }) => {
      await expect(page.getByRole('link', { name: /^home$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^about$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^history$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^bookmarks$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^catalogue$/i })).toBeVisible();
    });

    test('should hide hamburger menu button on tablet', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await expect(menuButton).toBeHidden();
    });
  });

  test.describe('T015: Desktop viewport behavior (1920px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
    });

    test('should show all desktop navigation buttons', async ({ page }) => {
      await expect(page.getByRole('link', { name: /^home$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^about$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^history$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^bookmarks$/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^catalogue$/i })).toBeVisible();
    });

    test('should show search input', async ({ page }) => {
      const searchInput = page.getByLabel(/global search input/i);
      await expect(searchInput).toBeVisible();
    });

    test('should hide hamburger menu button', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });
      await expect(menuButton).toBeHidden();
    });
  });

  test.describe('T016: Viewport resize behavior', () => {
    test('should adapt navigation when resizing from desktop to mobile', async ({ page }) => {
      // Start at desktop size
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      // Verify desktop state
      await expect(page.getByRole('link', { name: /^home$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeHidden();

      // Resize to mobile
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile state
      await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /^home$/i })).toBeHidden();
    });

    test('should adapt navigation when resizing from mobile to desktop', async ({ page }) => {
      // Start at mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Verify mobile state
      await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeVisible();

      // Resize to desktop
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Verify desktop state
      await expect(page.getByRole('link', { name: /^home$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeHidden();
    });
  });

  test.describe('T017: Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
    });

    test('should have accessible hamburger menu button', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /open navigation menu/i });

      // Should have aria-label
      await expect(menuButton).toHaveAttribute('aria-label');

      // Should be keyboard accessible
      await page.keyboard.press('Tab'); // Tab to first focusable element
      // Keep tabbing until we reach the menu button
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      let attempts = 0;
      let hasFocusedNavigationMenu = focused?.includes('navigation menu') === true;
      while (!hasFocusedNavigationMenu && attempts < MAX_TAB_ATTEMPTS) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
        hasFocusedNavigationMenu = focused?.includes('navigation menu') === true;
        attempts++;
      }

      // Should be able to open with Enter key
      await page.keyboard.press('Enter');
      await expect(page.getByRole('menuitem', { name: /home/i })).toBeVisible();
    });

    test('should have sufficient touch target size (≥44px)', async ({ page }) => {
      // Wait for Mantine styles to be fully applied before measuring
      await waitForMantineStyles(page);

      const menuButton = page.getByRole('button', { name: /open navigation menu/i });

      // Wait for button to be fully visible and styled
      await expect(menuButton).toBeVisible();

      const boundingBox = await menuButton.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX);
        expect(boundingBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE_PX);
      }
    });
  });
});
