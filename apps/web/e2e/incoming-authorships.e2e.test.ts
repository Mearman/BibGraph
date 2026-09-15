/**
 * E2E tests for incoming authorship relationships on author detail pages
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

test.describe('Incoming Relationships - Author Authorships', () => {
  test('should display incoming authorships section on author detail page', async ({ page }) => {
    // Navigate to an author who has authored works
    await page.goto('#/authors/A5023888391'); // Example author with works

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Should see "Incoming Relationships" heading
    await expect(page.getByRole('heading', { name: /incoming relationships/i })).toBeVisible();

    // Should see "Works" or "Authorships" section
    const authorshipsSection = page.locator('[data-testid="relationship-section-authorship-inbound"]');
    await expect(authorshipsSection).toBeVisible();

    // Section should have label
    await expect(authorshipsSection.getByText(/authorships|works/i)).toBeVisible();

    // Should display count badge
    await expect(authorshipsSection.locator('[data-testid="relationship-count"]')).toBeVisible();
  });

  test('should display list of authored works', async ({ page }) => {
    await page.goto('#/authors/A5023888391');

    const authorshipsSection = page.locator('[data-testid="relationship-section-authorship-inbound"]');
    await expect(authorshipsSection).toBeVisible();

    // Should display at least one relationship item
    const relationshipItems = authorshipsSection.locator('[data-testid^="relationship-item-"]');
    await expect(relationshipItems.first()).toBeVisible();

    // Each item should have a clickable work title
    const firstItem = relationshipItems.first();
    await expect(firstItem.locator('a')).toBeVisible();
  });

  test('should navigate to work when clicked', async ({ page }) => {
    await page.goto('#/authors/A5023888391');

    const authorshipsSection = page.locator('[data-testid="relationship-section-authorship-inbound"]');
    const firstWork = authorshipsSection.locator('[data-testid^="relationship-item-"]').first();
    const workLink = firstWork.locator('a').first();

    // Click the work link
    await workLink.click();

    // Should navigate to the work's detail page
    await expect(page).toHaveURL(/\/works\/W\d+/);
  });

  test('should display authorship metadata (position, corresponding)', async ({ page }) => {
    await page.goto('#/authors/A5023888391');

    const authorshipsSection = page.locator('[data-testid="relationship-section-authorship-inbound"]');
    const firstItem = authorshipsSection.locator('[data-testid^="relationship-item-"]').first();

    // Should display work title
    await expect(firstItem.locator('a')).toBeVisible();

    // May display authorship metadata (position, corresponding author indicator)
    const metadata = firstItem.locator('[data-testid="relationship-metadata"]');
    if (await metadata.count() > 0) {
      // Metadata should contain position or corresponding indicator
      
      await expect(metadata).not.toBeEmpty();
    }
  });
});
