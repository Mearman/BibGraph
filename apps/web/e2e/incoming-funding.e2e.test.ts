/**
 * E2E tests for incoming funding relationships on funder detail pages
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

test.describe('Incoming Relationships - Funder Grants', () => {
  test('should display incoming funded works section on funder detail page', async ({ page }) => {
    // Navigate to a funder with funded works
    await page.goto('#/funders/F4320332161'); // Example funder

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Should see "Incoming Relationships" heading
    await expect(page.getByRole('heading', { name: /incoming relationships/i })).toBeVisible();

    // Should see "Funded Works" or "Grants" section
    const fundingSection = page.locator('[data-testid="relationship-section-funded_by-inbound"]');
    await expect(fundingSection).toBeVisible();

    // Section should have label
    await expect(fundingSection.getByText(/funded works|grants/i)).toBeVisible();

    // Should display count badge
    await expect(fundingSection.locator('[data-testid="relationship-count"]')).toBeVisible();
  });

  test('should display list of funded works', async ({ page }) => {
    await page.goto('#/funders/F4320332161');

    const fundingSection = page.locator('[data-testid="relationship-section-funded_by-inbound"]');
    await expect(fundingSection).toBeVisible();

    // Should display at least one relationship item
    const relationshipItems = fundingSection.locator('[data-testid^="relationship-item-"]');
    await expect(relationshipItems.first()).toBeVisible();

    // Each item should have a clickable work title
    const firstItem = relationshipItems.first();
    await expect(firstItem.locator('a')).toBeVisible();
  });

  test('should navigate to funded work when clicked', async ({ page }) => {
    await page.goto('#/funders/F4320332161');

    const fundingSection = page.locator('[data-testid="relationship-section-funded_by-inbound"]');
    const firstWork = fundingSection.locator('[data-testid^="relationship-item-"]').first();
    const workLink = firstWork.locator('a').first();

    // Click the work link
    await workLink.click();

    // Should navigate to the work's detail page
    await expect(page).toHaveURL(/\/works\/W\d+/);
  });

  test('should display funding metadata (award ID, amount)', async ({ page }) => {
    await page.goto('#/funders/F4320332161');

    const fundingSection = page.locator('[data-testid="relationship-section-funded_by-inbound"]');
    const firstItem = fundingSection.locator('[data-testid^="relationship-item-"]').first();

    // Should display work title
    await expect(firstItem.locator('a')).toBeVisible();

    // May display funding metadata (award ID, amount)
    const metadata = firstItem.locator('[data-testid="relationship-metadata"]');
    if (await metadata.count() > 0) {
      await expect(metadata).toBeVisible();
    }
  });
});
