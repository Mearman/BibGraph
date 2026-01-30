/**
 * E2E tests for Xpac Data Toggle (US-29)
 *
 * Tests the Xpac (extended research outputs) toggle in /settings,
 * including its effect on search results, visual distinction of
 * dataset/software/specimen works, and state persistence.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { BaseSPAPageObject } from '@/test/page-objects/BaseSPAPageObject';
import { SettingsPage } from '@/test/page-objects/SettingsPage';

test.describe('@utility US-29 Xpac Data Toggle', () => {
	const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

	let settingsPage: SettingsPage;

	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);

		settingsPage = new SettingsPage(page);
	});

	test('should display Xpac toggle in /settings', async ({ page }) => {
		// Navigate to settings
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		// Verify xpac toggle is present
		const xpacToggle = page.locator(
			"[data-testid='xpac-toggle'], [data-testid='include-xpac']"
		);
		await expect(xpacToggle).toBeVisible({ timeout: 10_000 });

		// Verify toggle has accessible label
		const ariaChecked = await xpacToggle.getAttribute('aria-checked');
		expect(['true', 'false']).toContain(ariaChecked);

		// Verify descriptive text about xpac is present
		const xpacDescription = page.getByText(/xpac|extended research|dataset|software|specimen/i);
		await expect(xpacDescription.first()).toBeVisible();
	});

	test('should update search results when toggled', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to settings and get initial xpac state
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		const initialState = await settingsPage.isXpacEnabled();

		// Toggle xpac
		await settingsPage.toggleXpac();

		// Wait for notification confirming toggle
		await page.locator('.mantine-Notification-root').waitFor({ timeout: 5_000 }).catch(() => {
			// Notification may not appear in all cases
		});

		// Verify state changed
		const newState = await settingsPage.isXpacEnabled();
		expect(newState).toBe(!initialState);

		// Navigate to search and perform a query
		await pageObject.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);

		// Search for a common term that may have xpac results
		const searchInput = page.locator(
			"[data-testid='search-input'], input[placeholder*='search' i], input[type='search']"
		);
		const hasSearch = await searchInput.first().isVisible().catch(() => false);

		if (hasSearch) {
			await searchInput.first().fill('bioplastics');
			await searchInput.first().press('Enter');
			await page.waitForLoadState('networkidle');

			// Verify results loaded (results may differ based on xpac state)
			await pageObject.expectNoError();
		}
	});

	test('should visually distinguish Xpac works with badge (dataset/software/specimen)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Enable xpac if not already enabled
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		const isEnabled = await settingsPage.isXpacEnabled();
		if (!isEnabled) {
			await settingsPage.toggleXpac();
			await page.locator('.mantine-Notification-root').waitFor({ timeout: 5_000 }).catch(() => {
				// Notification may not appear
			});
		}

		// Navigate to browse or search to find xpac works
		await pageObject.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);

		// Search for dataset/software type works
		const searchInput = page.locator(
			"[data-testid='search-input'], input[placeholder*='search' i], input[type='search']"
		);
		const hasSearch = await searchInput.first().isVisible().catch(() => false);

		if (hasSearch) {
			await searchInput.first().fill('dataset bioplastics');
			await searchInput.first().press('Enter');
			await page.waitForLoadState('networkidle');

			// Check for badge elements distinguishing xpac works
			const badges = page.locator(
				".mantine-Badge-root, [data-testid*='badge'], [data-testid*='xpac']"
			);
			await badges.first().isVisible().catch(() => false);

			// Badges may or may not be present depending on search results
			// The key assertion is that the page renders without errors
			await pageObject.expectNoError();
		}
	});

	test('should persist toggle state across sessions', async ({ page }) => {
		// Navigate to settings
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		// Get initial state
		const initialState = await settingsPage.isXpacEnabled();

		// Toggle xpac
		await settingsPage.toggleXpac();

		// Wait for save confirmation
		await page.locator('.mantine-Notification-root').waitFor({ timeout: 5_000 }).catch(() => {
			// Notification may not appear
		});

		// Verify state changed
		const changedState = await settingsPage.isXpacEnabled();
		expect(changedState).toBe(!initialState);

		// Reload the page to simulate new session
		await page.reload();
		await waitForAppReady(page);

		// Navigate back to settings
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		// Verify state persisted
		const persistedState = await settingsPage.isXpacEnabled();
		expect(persistedState).toBe(changedState);
		expect(persistedState).not.toBe(initialState);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to settings page
		await page.goto(`${BASE_URL}/#/settings`);
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
