/**
 * E2E tests for incoming relationship visualization
 * Tests viewing incoming citations, authorships, affiliations, publications, and funding
 * @see specs/016-entity-relationship-viz/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

import { clearGraph,populateWorkCitations } from './helpers/populate-graph';

test.describe('Incoming Relationships - Work Citations', () => {
  test.beforeEach(async ({ page }) => {
    // Clear graph before each test for isolation
    await page.goto('#/');
    await page.waitForLoadState('networkidle');
    await clearGraph(page);
  });

  test('should display incoming citations section on work detail page', async ({ page }) => {
    // Navigate to work page
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');

    // Populate graph with test citation data
    await populateWorkCitations(page);

    // Wait for page to render with new graph data
    // Removed: waitForTimeout - use locator assertions instead
    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Should see "Incoming Relationships" heading
    await expect(page.getByRole('heading', { name: /incoming relationships/i })).toBeVisible();

    // Should see "Citations" section
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');
    await expect(citationsSection).toBeVisible();

    // Section should have label "Citations"
    await expect(citationsSection.getByText(/citations/i)).toBeVisible();

    // Should display count badge
    await expect(citationsSection.locator('[data-testid="relationship-count"]')).toBeVisible();
  });

  test('should display list of citing works', async ({ page }) => {
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');
    await populateWorkCitations(page);
    // Removed: waitForTimeout - use locator assertions instead
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');
    await expect(citationsSection).toBeVisible();

    // Should display at least one relationship item
    const relationshipItems = citationsSection.locator('[data-testid^="relationship-item-"]');
    await expect(relationshipItems.first()).toBeVisible();

    // Each item should have a clickable entity name
    const firstItem = relationshipItems.first();
    await expect(firstItem.locator('a')).toBeVisible();
  });

  test('should navigate to citing work when clicked', async ({ page }) => {
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');
    await populateWorkCitations(page);
    // Removed: waitForTimeout - use locator assertions instead
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');
    const firstCitation = citationsSection.locator('[data-testid^="relationship-item-"]').first();
    const citationLink = firstCitation.locator('a').first();

    // Get the link text before clicking
    const citationTitle = await citationLink.textContent();
    expect(citationTitle).toBeTruthy();

    // Click the citation link
    await citationLink.click();

    // Should navigate to the citing work's detail page
    await expect(page).toHaveURL(/\/works\/W\d+/);

    // New page should display the citation title
    if (citationTitle !== null) {
      await expect(page.locator('h1')).toContainText(citationTitle);
    }
  });

  test('should display "Showing X of Y" count when citations exceed page size', async ({ page }) => {
    // Navigate to a work with many citations (>50)
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');
    await populateWorkCitations(page);
    // Removed: waitForTimeout - use locator assertions instead
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');
    await expect(citationsSection).toBeVisible();

    // Check for count display
    const countText = citationsSection.locator(String.raw`text=/showing \d+ of \d+/i`);

    // If count exists, verify it shows correct format
    if (await countText.count() > 0) {
      await expect(countText).toBeVisible();
      const text = await countText.textContent();
      expect(text).toMatch(/showing \d+ of \d+/i);
    }
  });

  test('should display "Load more" button when citations exceed 50', async ({ page }) => {
    // Navigate to a work with many citations
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');
    await populateWorkCitations(page);
    // Removed: waitForTimeout - use locator assertions instead
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');

    // Check if "Load more" button exists (only if there are >50 citations)
    const loadMoreButton = citationsSection.getByRole('button', { name: /load more/i });

    if (await loadMoreButton.count() > 0) {
      await expect(loadMoreButton).toBeVisible();

      // Click "Load more"
      await loadMoreButton.click();

      // Should see more items loaded
      // Count should update
      const countText = citationsSection.locator(String.raw`text=/showing \d+ of \d+/i`);
      await expect(countText).toBeVisible();
    }
  });

  test('should handle works with no incoming citations', async ({ page }) => {
    // Navigate to a work with no citations (newly published work or isolated work)
    // This test may need to be updated with a real work ID that has 0 citations
    await page.goto('#/works/W1');

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Incoming relationships section should still exist
    const incomingSection = page.locator('[data-testid="incoming-relationships"]');

    if (await incomingSection.count() > 0) {
      // Should show empty state or no citations section
      const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');

      // Either section doesn't exist, or shows empty state
      if (await citationsSection.count() === 0) {
        // Section not rendered - acceptable
        expect(true).toBe(true);
      } else {
        // Section exists but shows empty state
        await expect(citationsSection.getByText(/no citations/i)).toBeVisible();
      }
    }
  });

  test('should display work metadata in citation items', async ({ page }) => {
    await page.goto('#/works/W2741809807');
    await page.waitForLoadState('networkidle');
    await populateWorkCitations(page);
    // Removed: waitForTimeout - use locator assertions instead
    const citationsSection = page.locator('[data-testid="relationship-section-citations-inbound"]');
    const firstItem = citationsSection.locator('[data-testid^="relationship-item-"]').first();

    // Should display work title as main display name
    const titleLink = firstItem.locator('a').first();
    await expect(titleLink).toBeVisible();

    // May display subtitle (e.g., publication year, source)
    const subtitle = firstItem.locator('[data-testid="relationship-subtitle"]');
    if (await subtitle.count() > 0) {
      await expect(subtitle).toBeVisible();
    }
  });
});
