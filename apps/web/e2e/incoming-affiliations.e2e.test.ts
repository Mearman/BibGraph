/**
 * E2E tests for incoming affiliation relationships on institution detail pages
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

test.describe('Incoming Relationships - Institution Affiliations', () => {
  test('should display incoming affiliations section on institution detail page', async ({ page }) => {
    // Navigate to an institution with affiliated authors
    await page.goto('#/institutions/I27837315'); // Example institution

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Should see "Incoming Relationships" heading
    await expect(page.getByRole('heading', { name: /incoming relationships/i })).toBeVisible();

    // Should see "Affiliations" or "Authors" section
    const affiliationsSection = page.locator('[data-testid="relationship-section-affiliation-inbound"]');
    await expect(affiliationsSection).toBeVisible();

    // Section should have label
    await expect(affiliationsSection.getByText(/affiliations|authors/i)).toBeVisible();

    // Should display count badge
    await expect(affiliationsSection.locator('[data-testid="relationship-count"]')).toBeVisible();
  });

  test('should display list of affiliated authors', async ({ page }) => {
    await page.goto('#/institutions/I27837315');

    const affiliationsSection = page.locator('[data-testid="relationship-section-affiliation-inbound"]');
    await expect(affiliationsSection).toBeVisible();

    // Should display at least one relationship item
    const relationshipItems = affiliationsSection.locator('[data-testid^="relationship-item-"]');
    await expect(relationshipItems.first()).toBeVisible();

    // Each item should have a clickable author name
    const firstItem = relationshipItems.first();
    await expect(firstItem.locator('a')).toBeVisible();
  });

  test('should navigate to author when clicked', async ({ page }) => {
    await page.goto('#/institutions/I27837315');

    const affiliationsSection = page.locator('[data-testid="relationship-section-affiliation-inbound"]');
    const firstAuthor = affiliationsSection.locator('[data-testid^="relationship-item-"]').first();
    const authorLink = firstAuthor.locator('a').first();

    // Click the author link
    await authorLink.click();

    // Should navigate to the author's detail page
    await expect(page).toHaveURL(/\/authors\/A\d+/);
  });
});
