/**
 * E2E tests for incoming publication relationships on source detail pages
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

test.describe('Incoming Relationships - Source Publications', () => {
  test('should display incoming publications section on source detail page', async ({ page }) => {
    // Navigate to a source (journal/venue) with published works
    await page.goto('#/sources/S137773608'); // Example source

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Should see "Incoming Relationships" heading
    await expect(page.getByRole('heading', { name: /incoming relationships/i })).toBeVisible();

    // Should see "Publications" or "Works" section
    const publicationsSection = page.locator('[data-testid="relationship-section-publication-inbound"]');
    await expect(publicationsSection).toBeVisible();

    // Section should have label
    await expect(publicationsSection.getByText(/publications|works/i)).toBeVisible();

    // Should display count badge
    await expect(publicationsSection.locator('[data-testid="relationship-count"]')).toBeVisible();
  });

  test('should display list of published works', async ({ page }) => {
    await page.goto('#/sources/S137773608');

    const publicationsSection = page.locator('[data-testid="relationship-section-publication-inbound"]');
    await expect(publicationsSection).toBeVisible();

    // Should display at least one relationship item
    const relationshipItems = publicationsSection.locator('[data-testid^="relationship-item-"]');
    await expect(relationshipItems.first()).toBeVisible();

    // Each item should have a clickable work title
    const firstItem = relationshipItems.first();
    await expect(firstItem.locator('a')).toBeVisible();
  });

  test('should navigate to work when clicked', async ({ page }) => {
    await page.goto('#/sources/S137773608');

    const publicationsSection = page.locator('[data-testid="relationship-section-publication-inbound"]');
    const firstWork = publicationsSection.locator('[data-testid^="relationship-item-"]').first();
    const workLink = firstWork.locator('a').first();

    // Click the work link
    await workLink.click();

    // Should navigate to the work's detail page
    await expect(page).toHaveURL(/\/works\/W\d+/);
  });

  test('should display publication metadata (year, issue)', async ({ page }) => {
    await page.goto('#/sources/S137773608');

    const publicationsSection = page.locator('[data-testid="relationship-section-publication-inbound"]');
    const firstItem = publicationsSection.locator('[data-testid^="relationship-item-"]').first();

    // Should display work title
    await expect(firstItem.locator('a')).toBeVisible();

    // May display publication metadata (year, volume, issue)
    const subtitle = firstItem.locator('[data-testid="relationship-subtitle"]');
    if (await subtitle.count() > 0) {
      await expect(subtitle).toBeVisible();
    }
  });
});
