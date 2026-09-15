/**
 * E2E tests for Domains Detail Page
 * Tests domain entity detail pages, metadata display, and relationships
 * @see spec-020 Phase 1: T010 - Domain entity E2E tests
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { DomainsDetailPage } from '@/test/page-objects/DomainsDetailPage';

const ENTITY_DETAIL_LOAD_TARGET_MS = 2000;

test.describe('@entity Domains Detail Page', () => {
  // OpenAlex has 5 domains: D1-D5
  const TEST_DOMAIN_ID = 'D1'; // Health Sciences (known stable domain)

  test('should display domain title correctly', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    const title = await domainsPage.getDomainName();
    expect(title).toBeTruthy();
    expect(title).not.toBe('');
  });

  test('should display domain metadata with field and subfield counts', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    // Check for metadata section
    const metadataSection = page.locator('[data-testid="entity-metadata"]');
    await expect(metadataSection).toBeVisible();

    // Verify field count is displayed
    const fieldCount = await domainsPage.getFieldCount();
    expect(fieldCount).toBeGreaterThanOrEqual(0);

    // Verify subfield count is displayed
    const subfieldCount = await domainsPage.getSubfieldCount();
    expect(subfieldCount).toBeGreaterThanOrEqual(0);
  });

  test('should display related fields section', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    // Check for related fields section
    const relatedFieldsSection = page.locator('[data-testid="related-fields"]').first();

    // Section may be visible if domain has fields
    const fieldCount = await domainsPage.getFieldCount();
    if (fieldCount > 0) {
      await expect(relatedFieldsSection).toBeVisible();

      // Verify field items are displayed
      const relatedFields = await domainsPage.getRelatedFields();
      expect(relatedFields.length).toBeGreaterThan(0);
    }
  });

  test('should navigate to related field when clicked', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    const fieldCount = await domainsPage.getFieldCount();

    // Only test navigation if there are related fields
    if (fieldCount > 0) {
      const relatedFields = await domainsPage.getRelatedFields();
      expect(relatedFields.length).toBeGreaterThan(0);

      // Click first related field
      await domainsPage.clickRelatedField(0);

      // Verify navigation to field detail page
      await page.waitForURL(/\/fields\/F\d+/);
      await waitForAppReady(page);
      await waitForEntityData(page);

      // Verify we're on a field page
      const fieldTitle = page.locator('[data-testid="entity-title"]');
      await expect(fieldTitle).toBeVisible();
    }
  });

  test('should load page without errors', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);

    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    // Verify no errors occurred
    await domainsPage.expectNoError();
    expect(errors).toHaveLength(0);

    // Verify page structure is intact
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Verify header is present
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should handle non-existent domain gracefully', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    const invalidDomainId = 'D999999';

    await domainsPage.gotoDomain(invalidDomainId);
    await waitForAppReady(page);

    // Page should load without crashing
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // Should show error state or empty state
    const errorMessage = page.locator('[data-testid="error-message"]');
    const emptyState = page.locator('[data-testid="empty-state"]');

    // Either error or empty state should be visible
    const hasErrorOrEmpty = (await errorMessage.count() > 0) || (await emptyState.count() > 0);

    if (!hasErrorOrEmpty) {
      // Alternatively, entity title might not be visible
      const entityTitle = page.locator('[data-testid="entity-title"]');
      const isTitleVisible = await entityTitle.isVisible().catch(() => false);
      expect(isTitleVisible).toBe(false);
    }
  });

  test('should display consistent domain metadata across page loads', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);

    // First load
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    const firstTitle = await domainsPage.getDomainName();
    const firstFieldCount = await domainsPage.getFieldCount();
    const firstSubfieldCount = await domainsPage.getSubfieldCount();

    // Reload page
    await page.reload();
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();

    // Verify consistency
    const secondTitle = await domainsPage.getDomainName();
    const secondFieldCount = await domainsPage.getFieldCount();
    const secondSubfieldCount = await domainsPage.getSubfieldCount();

    expect(secondTitle).toBe(firstTitle);
    expect(secondFieldCount).toBe(firstFieldCount);
    expect(secondSubfieldCount).toBe(firstSubfieldCount);
  });

  test('should load entity detail page within performance target (<2s)', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);

    // Measure page load time
    const startTime = Date.now();
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);
    await domainsPage.expectDomainLoaded();
    const endTime = Date.now();

    const loadTime = endTime - startTime;
    console.log(`Entity detail page load time: ${String(loadTime)}ms`);

    // Target: <2000ms for entity detail page
    expect(loadTime).toBeLessThan(ENTITY_DETAIL_LOAD_TARGET_MS);

    // Verify entity title is displayed
    const title = await domainsPage.getDomainName();
    expect(title).toBeTruthy();
  });

  test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
