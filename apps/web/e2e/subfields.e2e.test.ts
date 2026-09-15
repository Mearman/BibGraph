/**
 * E2E tests for Subfield entity detail pages
 *
 * Tests the Subfield entity detail page functionality including:
 * - Subfield title and metadata display
 * - Parent field and domain navigation
 * - Related topics section
 * - Page loading and error handling
 * @see spec-020 Phase 6: E2E test coverage for Subfields entity
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { SubfieldsDetailPage } from '@/test/page-objects/SubfieldsDetailPage';

test.describe('@entity Subfields Detail Page', () => {
	// Use a known subfield ID from OpenAlex
	// Subfield 1303: Biochemistry (under Field 13: Biochemistry, Genetics and Molecular Biology)
	const KNOWN_SUBFIELD_ID = '1303';

	test('should display subfield title correctly', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);

		// Navigate to the subfield detail page
		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Wait for entity loaded state
		await subfieldPage.expectSubfieldLoaded();

		// Verify subfield name is displayed
		const subfieldName = await subfieldPage.getSubfieldName();
		expect(subfieldName).toBeTruthy();
		expect(subfieldName).not.toBe('');
	});

	test('should display subfield metadata and counts', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);

		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);
		await subfieldPage.expectSubfieldLoaded();

		// Check for topic count (subfields should have related topics)
		const topicCount = await subfieldPage.getTopicCount();
		expect(topicCount).toBeGreaterThanOrEqual(0);

		// Verify parent field is displayed
		const parentField = await subfieldPage.getParentField();
		expect(parentField).toBeTruthy();
	});

	test('should display related topics section', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);

		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);
		await subfieldPage.expectSubfieldLoaded();

		// Wait for related topics section to be visible
		const relatedTopicsSection = page.locator('[data-testid="related-topics"]');

		// Related topics section should be visible if there are topics
		const topicCount = await subfieldPage.getTopicCount();
		if (topicCount > 0) {
			await expect(relatedTopicsSection).toBeVisible();

			// Get list of related topics
			const topics = await subfieldPage.getRelatedTopics();
			expect(topics.length).toBeGreaterThan(0);
		}
	});

	test('should navigate to parent field when clicked', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);

		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);
		await subfieldPage.expectSubfieldLoaded();

		// Get parent field name before navigation
		const parentFieldName = await subfieldPage.getParentField();
		expect(parentFieldName).toBeTruthy();

		// Click parent field link
		await subfieldPage.clickParentField();
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify navigation to field detail page
		await expect(page).toHaveURL(/\/fields\/\d+/);

		// Verify field title is displayed
		const fieldTitle = page.locator('[data-testid="entity-title"]');
		await expect(fieldTitle).toBeVisible();
	});

	test('should load page without errors', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);

		// Listen for console errors
		const consoleErrors: string[] = [];
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});

		// Navigate to subfield page
		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);
		await subfieldPage.expectSubfieldLoaded();

		// Verify no error states are displayed
		await subfieldPage.expectNoError();

		// Verify subfield name is visible
		const subfieldName = await subfieldPage.getSubfieldName();
		expect(subfieldName).toBeTruthy();

		// Check for critical console errors (filter out minor warnings)
		const criticalErrors = consoleErrors.filter(
			(error) =>
				!error.includes('ResizeObserver') && // Common harmless warning
				!error.includes('Warning: ') && // React warnings
				!error.includes('Download the React DevTools') // DevTools suggestion
		);
		expect(criticalErrors).toHaveLength(0);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const subfieldPage = new SubfieldsDetailPage(page);
		await subfieldPage.gotoSubfield(KNOWN_SUBFIELD_ID);
		await waitForAppReady(page);
		await waitForEntityData(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
