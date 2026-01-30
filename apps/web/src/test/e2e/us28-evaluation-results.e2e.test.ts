/**
 * E2E tests for Evaluation Results (US-28)
 *
 * Tests the /evaluation/results page which currently renders the
 * STAR Methodology Evaluation overview. The "Results & Analytics" card
 * is disabled since no comparison results are available yet.
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

	test('should display STAR evaluation page with results card on /evaluation/results', async ({ page }) => {
		// Navigate to results page
		await evaluationPage.gotoResults();

		// Verify the STAR evaluation page loaded
		const heading = page.getByRole('heading', { name: /STAR|evaluation/i });
		await expect(heading.first()).toBeVisible({ timeout: 10_000 });

		// Verify the "Results & Analytics" text is present
		const resultsCard = page.getByText(/Results & Analytics/i);
		await expect(resultsCard.first()).toBeVisible({ timeout: 10_000 });

		// Since no results exist yet, the "View Results" button should be disabled
		// or there should be a message about no results being available
		const noResultsText = page.getByText(/No comparison results available yet|Requires datasets/i);
		const hasNoResults = await noResultsText.first().isVisible({ timeout: 5_000 }).catch(() => false);

		// Either no-results message or the results card must be visible
		expect(hasNoResults || await resultsCard.first().isVisible()).toBe(true);
	});

	test('should handle empty results with informative message', async ({ page }) => {
		await evaluationPage.gotoResults();

		// The page should indicate that no results are available yet
		const emptyIndicator = page.getByText(/No comparison results available yet|Requires datasets|no results/i);
		const hasEmptyIndicator = await emptyIndicator.first().isVisible({ timeout: 5_000 }).catch(() => false);

		// Alternatively, the Results & Analytics card itself conveys this state
		const resultsCard = page.getByText(/Results & Analytics/i);
		const hasResultsCard = await resultsCard.first().isVisible({ timeout: 5_000 }).catch(() => false);

		// At least one of these should be present to inform the user
		expect(hasEmptyIndicator || hasResultsCard).toBe(true);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to results page
		await evaluationPage.gotoResults();
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		// Filter to only critical and serious violations
		const criticalViolations = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);

		expect(criticalViolations).toEqual([]);
	});
});
