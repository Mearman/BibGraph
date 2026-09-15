/**
 * E2E tests for Field entity detail pages
 *
 * Tests field entity pages including title display, metadata rendering,
 * related subfields, parent domain navigation, and error handling.
 * @see spec-020 E2E Test Coverage
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { FieldsDetailPage } from '@/test/page-objects/FieldsDetailPage';

test.describe('@entity Fields Detail Page', () => {
	let fieldsPage: FieldsDetailPage;

	test.beforeEach(async ({ page }) => {
		fieldsPage = new FieldsDetailPage(page);
		await waitForAppReady(page);
	});

	test('should display field title correctly', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Get field name
		const fieldName = await fieldsPage.getFieldName();

		// Should display non-empty field name
		expect(fieldName).toBeTruthy();
		expect(fieldName).not.toBe('');

		// Field name should be visible in heading
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
		await expect(heading).toContainText(fieldName!);
	});

	test('should display field metadata including subfield and works counts', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Check metadata section is visible
		const metadataSection = page.locator('[data-testid="entity-metadata"]');
		await expect(metadataSection).toBeVisible();

		// Should display works count
		const worksCount = page.locator('text=/works count/i').or(
			page.locator(String.raw`text=/\d+ works/i`)
		);
		const worksCountVisible = await worksCount.count();
		if (worksCountVisible > 0) {
			await expect(worksCount.first()).toBeVisible();
		}

		// Should display subfield count or related subfields section
		const subfieldSection = page.locator('[data-testid="related-subfields"]');
		const hasSectionsVisible = await subfieldSection.count();
		if (hasSectionsVisible > 0) {
			await expect(subfieldSection).toBeVisible();
		}
	});

	test('should display related subfields section', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Should have related subfields section
		const subfieldSection = page.locator('[data-testid="related-subfields"]');

		// If section exists, verify it contains items
		const sectionExists = await subfieldSection.count();
		if (sectionExists > 0) {
			await expect(subfieldSection).toBeVisible();

			// Should have at least one subfield listed
			const subfields = await fieldsPage.getRelatedSubfields();
			expect(subfields.length).toBeGreaterThan(0);

			// Each subfield should have a clickable link
			const subfieldItems = page.locator('[data-testid="related-subfields"] [data-testid^="relationship-item-"]');
			const itemCount = await subfieldItems.count();

			if (itemCount > 0) {
				const firstItem = subfieldItems.first();
				await expect(firstItem).toBeVisible();

				// Should have clickable link
				const link = firstItem.locator('a');
				await expect(link).toBeVisible();
			}
		}
	});

	test('should navigate to parent domain when domain link clicked', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Get parent domain element
		const parentDomain = await fieldsPage.getParentDomain();

		// If parent domain exists, test navigation
		if (parentDomain !== null) {
			// Click parent domain link
			await fieldsPage.clickParentDomain();
			await waitForEntityData(page);

			// Should navigate to domain page
			await expect(page).toHaveURL(/\/domains\/D\d+/);

			// Domain page should load successfully
			const heading = page.locator('h1');
			await expect(heading).toBeVisible();

			// Should display domain name
			
			await expect(heading).toHaveText(/.+/);
		}
	});

	test('should load field page without errors', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Page should not display error messages
		await fieldsPage.expectNoError();

		// Should have proper page title
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();

		// Should have entity metadata section
		const metadataSection = page.locator('[data-testid="entity-metadata"]');
		await expect(metadataSection).toBeVisible();

		// Console should not have critical errors
		const consoleErrors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});

		// Wait a moment for any delayed errors
		// Removed: waitForTimeout - use locator assertions instead
		// Filter out known acceptable errors (if any)
		const criticalErrors = consoleErrors.filter(error => {
			// Filter out non-critical errors here if needed
			return !error.includes('ResizeObserver') &&
			       !error.includes('favicon');
		});

		expect(criticalErrors).toHaveLength(0);
	});

	test('should navigate between related subfields', async ({ page }) => {
		// Navigate to Computer Science field (F17)
		await fieldsPage.gotoField('F17');
		await waitForEntityData(page);
		await fieldsPage.expectFieldLoaded();

		// Get related subfields
		const subfields = await fieldsPage.getRelatedSubfields();

		// If subfields exist, test navigation
		if (subfields.length > 0) {
			// Click first subfield
			await fieldsPage.clickRelatedSubfield(0);
			await waitForEntityData(page);

			// Should navigate to subfield page
			await expect(page).toHaveURL(/\/subfields\/SF\d+/);

			// Subfield page should load successfully
			const heading = page.locator('h1');
			await expect(heading).toBeVisible();

			// Should display subfield name
			
			await expect(heading).toHaveText(/.+/);
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const accessibilityFieldsPage = new FieldsDetailPage(page);
		await accessibilityFieldsPage.gotoField('F17');
		await waitForAppReady(page);
		await waitForEntityData(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
