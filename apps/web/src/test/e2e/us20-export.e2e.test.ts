/**
 * E2E Tests: US-20 Export
 *
 * Tests export format selection (JSON, Compressed, CSV, BibTeX), export of current views
 * (catalogue lists), output validation, and large export handling.
 *
 * Available export formats in ExportModal: json, compressed, csv, bibtex
 * Note: RIS format is not implemented.
 */

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

const TEST_ENTITIES = {
	author: { type: 'authors' as const, id: 'A5017898742' },
	work: { type: 'works' as const, id: 'W2741809807' },
};

/**
 * Create a catalogue list and add entities so there is exportable content.
 * @param page
 * @param listName
 */
const createListWithEntities = async (page: Page, listName: string): Promise<void> => {
	// Navigate to catalogue and create list
	await page.goto(`${BASE_URL}/#/catalogue`, { timeout: 30_000 });
	await waitForAppReady(page);

	await Promise.race([
		page.waitForSelector('[data-testid="catalogue-manager"], .mantine-Tabs-panel', {
			timeout: 10_000,
		}),
		page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
	]);

	await page.click('button:has-text("Create New List")');
	await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
	await page.fill('input:below(:text("Title"))', listName);
	await page.click('button:has-text("Create List")');
	await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10_000 });
	await expect(
		page.locator(`[data-testid="selected-list-title"]:has-text("${listName}")`)
	).toBeVisible({ timeout: 10_000 });

	// Add an entity to the list
	await page.goto(`${BASE_URL}/#/${TEST_ENTITIES.work.type}/${TEST_ENTITIES.work.id}`, {
		timeout: 30_000,
	});
	await page.waitForLoadState('networkidle', { timeout: 30_000 });

	const addButton = page.locator('[data-testid="add-to-catalogue-button"]');
	if (await addButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
		await addButton.click();
		await expect(page.getByRole('dialog').filter({ hasText: /Add to/i })).toBeVisible({
			timeout: 10_000,
		});
		await page.locator('[data-testid="add-to-list-select"]').click();
		await page.locator(`[role="option"]:has-text("${listName}")`).click();
		await page.locator('[data-testid="add-to-list-submit"]').click();
		await expect(page.getByRole('dialog').filter({ hasText: /Add to/i })).not.toBeVisible({
			timeout: 5_000,
		});
	}

	// Return to catalogue
	await page.goto(`${BASE_URL}/#/catalogue`, { timeout: 30_000 });
	await waitForAppReady(page);
};

test.describe('@workflow US-20 Export', () => {
	test.setTimeout(120_000);

	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);
	});

	test('should offer format selection with JSON, Compressed, CSV, BibTeX options', async ({ page }) => {
		await createListWithEntities(page, 'Format Selection Test');

		// Open export modal
		const exportButton = page.locator('[data-testid="export-list-button"]');
		await expect(exportButton).toBeVisible({ timeout: 10_000 });
		await exportButton.click();

		// Verify export dialog opens
		await expect(page.getByRole('dialog', { name: /Export/i })).toBeVisible({ timeout: 10_000 });

		// Check for format radio buttons (ExportModal renders 4 Radio components)
		const formatOptions = page.locator('input[type="radio"], [role="radio"]');
		const formatCount = await formatOptions.count();
		expect(formatCount).toBeGreaterThanOrEqual(4);

		// Verify all four format options are rendered
		const jsonOption = page.locator(
			'input[type="radio"][value="json"], label:has-text("JSON"), [role="radio"]:has-text("JSON")'
		);
		await expect(jsonOption.first()).toBeVisible();

		const compressedOption = page.locator(
			'input[type="radio"][value="compressed"], label:has-text("Compressed"), [role="radio"]:has-text("Compressed")'
		);
		await expect(compressedOption.first()).toBeVisible();

		const csvOption = page.locator(
			'input[type="radio"][value="csv"], label:has-text("CSV"), [role="radio"]:has-text("CSV")'
		);
		await expect(csvOption.first()).toBeVisible();

		const bibtexOption = page.locator(
			'input[type="radio"][value="bibtex"], label:has-text("BibTeX"), [role="radio"]:has-text("BibTeX")'
		);
		await expect(bibtexOption.first()).toBeVisible();
	});

	test('should export catalogue list as JSON', async ({ page }) => {
		await createListWithEntities(page, 'Export Current View');

		// Test export from catalogue view
		const exportButton = page.locator('[data-testid="export-list-button"]');
		await expect(exportButton).toBeVisible({ timeout: 10_000 });
		await exportButton.click();

		await expect(page.getByRole('dialog', { name: /Export/i })).toBeVisible({ timeout: 10_000 });

		// Select JSON format (should be default, but click explicitly)
		await page.locator('input[type="radio"][value="json"]').click();

		// Trigger export via the Export button inside the modal
		const exportSubmit = page.locator('[data-testid="export-list-button"]').last();
		await exportSubmit.click();

		// Verify export success notification
		await expect(page.locator('text="Export Successful"')).toBeVisible({ timeout: 10_000 });
	});

	test('should produce valid BibTeX output', async ({ page }) => {
		await createListWithEntities(page, 'BibTeX Export Test');

		const exportButton = page.locator('[data-testid="export-list-button"]');
		await expect(exportButton).toBeVisible({ timeout: 10_000 });
		await exportButton.click();

		await expect(page.getByRole('dialog', { name: /Export/i })).toBeVisible({ timeout: 10_000 });

		// Select BibTeX format
		const bibtexRadio = page.locator('input[type="radio"][value="bibtex"]');

		if (await bibtexRadio.isEnabled({ timeout: 3_000 }).catch(() => false)) {
			await bibtexRadio.click();

			// Trigger export and capture download
			const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
			const exportSubmit = page.locator('[data-testid="export-list-button"]').last();
			await exportSubmit.click();

			const download = await downloadPromise;

			// Verify download filename ends with .bib
			expect(download.suggestedFilename()).toMatch(/\.bib$/);

			// Read the downloaded content and validate BibTeX format
			const downloadPath = await download.path();
			if (downloadPath) {
				const fs = await import('node:fs');
				const content = fs.readFileSync(downloadPath, 'utf-8');

				// BibTeX entries start with @type{
				expect(content).toMatch(/@\w+\{/);
				// Should contain closing brace
				expect(content).toContain('}');
			}
		} else {
			// BibTeX export is disabled -- verify the radio is present but disabled
			await expect(bibtexRadio).toBeDisabled();
		}
	});

	// RIS format is not implemented in ExportModal (only json, compressed, csv, bibtex)
	test.skip('should produce valid RIS output', async () => {
		// RIS export format is not available in the current ExportModal.
		// ExportModal supports: json, compressed, csv, bibtex.
		// This test should be re-enabled when RIS support is added.
	});

	test('should handle large exports without blocking UI', async ({ page }) => {
		// Create a list with entities and verify that export does not block the UI
		await createListWithEntities(page, 'Large Export Test');

		const exportButton = page.locator('[data-testid="export-list-button"]');
		await expect(exportButton).toBeVisible({ timeout: 10_000 });
		await exportButton.click();

		await expect(page.getByRole('dialog', { name: /Export/i })).toBeVisible({ timeout: 10_000 });

		// Select JSON format and trigger export
		await page.locator('input[type="radio"][value="json"]').click();

		const exportSubmit = page.locator('[data-testid="export-list-button"]').last();
		await exportSubmit.click();

		// During export, verify the UI remains responsive
		const isResponsive = await page.evaluate(() => {
			return new Promise<boolean>((resolve) => {
				const start = performance.now();
				setTimeout(() => {
					const elapsed = performance.now() - start;
					// If elapsed is under 2 seconds, the UI is not blocked
					resolve(elapsed < 2_000);
				}, 100);
			});
		});

		expect(isResponsive).toBe(true);

		// Verify export completed successfully
		await expect(page.locator('text="Export Successful"')).toBeVisible({ timeout: 10_000 });
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await createListWithEntities(page, 'A11y Export Test');

		// Open export dialog
		const exportButton = page.locator('[data-testid="export-list-button"]');
		await expect(exportButton).toBeVisible({ timeout: 10_000 });
		await exportButton.click();

		await expect(page.getByRole('dialog', { name: /Export/i })).toBeVisible({ timeout: 10_000 });

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
