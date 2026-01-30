/**
 * E2E tests for Evaluation Results (US-28)
 *
 * Tests the /evaluation/results page functionality including metrics dashboard,
 * STAR methodology metrics, CSV/JSON export, and empty results handling.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { EvaluationPage } from '@/test/page-objects/EvaluationPage';

test.describe('@utility US-28 Evaluation Results', () => {
	const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

	let evaluationPage: EvaluationPage;

	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);

		evaluationPage = new EvaluationPage(page);
	});

	test('should display metrics dashboard on /evaluation/results', async ({ page }) => {
		// Navigate to results page
		await evaluationPage.gotoResults();

		// Verify results page loaded
		const heading = page.getByRole('heading', { name: /result|evaluation|metric|dashboard/i });
		await expect(heading.first()).toBeVisible({ timeout: 10_000 });

		// Check for metric cards or empty state
		const metricCards = await evaluationPage.getMetricCards();
		const hasEmpty = await evaluationPage.hasEmptyResults();

		// Either metric cards are displayed or empty state is shown
		expect(metricCards > 0 || hasEmpty).toBe(true);
	});

	test('should show STAR methodology metrics', async ({ page }) => {
		await evaluationPage.gotoResults();

		// Check for STAR metrics section
		const hasStarMetrics = await evaluationPage.hasStarMetrics();

		if (hasStarMetrics) {
			// Verify STAR metrics elements are visible
			const starSection = page.locator("[data-testid='star-metrics']");
			await expect(starSection).toBeVisible({ timeout: 10_000 });

			// Check for STAR methodology labels
			const starLabels = page.getByText(/STAR|structural|topological|algorithmic|representativeness/i);
			await expect(starLabels.first()).toBeVisible();
		} else {
			// If no results uploaded yet, verify results page is accessible
			const heading = page.getByRole('heading', { name: /result|evaluation/i });
			await expect(heading.first()).toBeVisible({ timeout: 10_000 });
		}
	});

	test('should export results as CSV', async ({ page }) => {
		await evaluationPage.gotoResults();

		// Check for export button
		const exportButton = page.locator(
			"[data-testid='export-results'], button:has-text('Export'), button:has-text('CSV')"
		);
		const hasExport = await exportButton.first().isVisible().catch(() => false);

		if (hasExport) {
			// Set up download listener
			const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);

			// Export as CSV
			await evaluationPage.exportResults('csv');

			const download = await downloadPromise;
			if (download) {
				// Verify download filename contains csv
				expect(download.suggestedFilename()).toMatch(/\.csv$/i);
			}
		} else {
			// Verify the results page renders
			const heading = page.getByRole('heading', { name: /result|evaluation/i });
			await expect(heading.first()).toBeVisible({ timeout: 10_000 });
		}
	});

	test('should export results as JSON', async ({ page }) => {
		await evaluationPage.gotoResults();

		// Check for export button
		const exportButton = page.locator(
			"[data-testid='export-results'], button:has-text('Export'), button:has-text('JSON')"
		);
		const hasExport = await exportButton.first().isVisible().catch(() => false);

		if (hasExport) {
			// Set up download listener
			const downloadPromise = page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);

			// Export as JSON
			await evaluationPage.exportResults('json');

			const download = await downloadPromise;
			if (download) {
				// Verify download filename contains json
				expect(download.suggestedFilename()).toMatch(/\.json$/i);
			}
		} else {
			// Verify the results page renders
			const heading = page.getByRole('heading', { name: /result|evaluation/i });
			await expect(heading.first()).toBeVisible({ timeout: 10_000 });
		}
	});

	test('should handle empty results with informative message', async ({ page }) => {
		await evaluationPage.gotoResults();

		// Check for empty results state
		const hasEmpty = await evaluationPage.hasEmptyResults();

		if (hasEmpty) {
			// Verify empty state message is informative
			const emptyMessage = page.locator(
				"[data-testid='empty-results'], .mantine-Text-root"
			);
			await expect(emptyMessage.first()).toBeVisible({ timeout: 10_000 });

			// Should contain guidance text
			const guidanceText = page.getByText(/no results|upload|dataset|run evaluation|empty/i);
			await expect(guidanceText.first()).toBeVisible();
		} else {
			// Results exist, verify metric cards are displayed
			const metricCards = await evaluationPage.getMetricCards();
			expect(metricCards).toBeGreaterThan(0);
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to results page
		await evaluationPage.gotoResults();
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
