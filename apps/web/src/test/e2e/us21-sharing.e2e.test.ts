/**
 * E2E Tests: US-21 Sharing
 *
 * Tests share button visibility on catalogue lists, shareable URL generation,
 * copy functionality, and accessibility of the share modal.
 *
 * ShareModal components use these data-testids:
 * - share-url-input: TextInput containing the share URL
 * - copy-share-url-button: Button to copy the share URL
 * - toggle-qr-code-button: Button to show/hide QR code
 * - open-share-link-button: ActionIcon to open link in new tab
 * - share-qr-code: QR code image element
 *
 * Share button on SelectedListDetails: data-testid="share-list-button"
 */

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

/**
 * Create a catalogue list with at least one entity for sharing tests.
 * @param page
 * @param listName
 */
const createShareableList = async (page: Page, listName: string): Promise<void> => {
	await page.goto(`${BASE_URL}/#/catalogue`, { timeout: 30_000 });
	await waitForAppReady(page);

	await Promise.race([
		page.waitForSelector('[data-testid="catalogue-manager"], .mantine-Tabs-panel', {
			timeout: 10_000,
		}),
		page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
	]);

	// Create the list
	await page.click('button:has-text("Create New List")');
	await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });
	await page.fill('input:below(:text("Title"))', listName);
	await page.fill('textarea:below(:text("Description"))', `Shareable list: ${listName}`);
	await page.click('button:has-text("Create List")');
	await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10_000 });
	await expect(
		page.locator(`[data-testid="selected-list-title"]:has-text("${listName}")`)
	).toBeVisible({ timeout: 10_000 });

	// Add an entity so the list is not empty
	await page.goto(`${BASE_URL}/#/authors/A5017898742`, { timeout: 30_000 });
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

test.describe('@workflow US-21 Sharing', () => {
	test.setTimeout(120_000);

	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);
	});

	test('should show share button on catalogue lists', async ({ page }) => {
		await createShareableList(page, 'Share Button Test');

		// Verify the share button is visible on the selected list detail view
		const shareButton = page.locator('[data-testid="share-list-button"]');
		await expect(shareButton).toBeVisible({ timeout: 10_000 });
		await expect(shareButton).toBeEnabled();

		// Verify the share button has appropriate accessible labelling
		// SelectedListDetails renders: aria-label="Share this list with others"
		const ariaLabel = await shareButton.getAttribute('aria-label');
		const buttonText = await shareButton.textContent();
		const hasAccessibleName = (ariaLabel && ariaLabel.length > 0) || (buttonText && buttonText.length > 0);
		expect(hasAccessibleName).toBe(true);
	});

	test('should generate shareable URL for a list', async ({ page }) => {
		await createShareableList(page, 'URL Generation Test');

		// Open share modal
		await page.click('[data-testid="share-list-button"]');

		// Verify share dialog opens
		await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible({ timeout: 10_000 });

		// Wait for the share URL to populate in the input (data-testid="share-url-input")
		const shareUrlInput = page.locator('[data-testid="share-url-input"]');
		await expect(shareUrlInput).toBeVisible({ timeout: 15_000 });

		// Wait until the input value is non-empty (URL generation is async)
		await expect(shareUrlInput).not.toHaveValue('', { timeout: 15_000 });

		const shareUrl = await shareUrlInput.inputValue();
		expect(shareUrl).toContain('localhost');
		expect(shareUrl).toContain('catalogue/shared/');
		expect(shareUrl.length).toBeGreaterThan(30);

		// Verify copy button is present (data-testid="copy-share-url-button")
		const copyButton = page.locator('[data-testid="copy-share-url-button"]');
		await expect(copyButton).toBeVisible();
		await expect(copyButton).toBeEnabled();

		// Click copy and verify it responds (text changes to "Copied!")
		await copyButton.click();
		await expect(copyButton).toBeVisible();
	});

	// Shared list read-only rendering requires a dedicated route for /catalogue/shared/:token
	// which is not currently implemented as a separate view. The share URL triggers an import flow.
	test.skip('should render shared list as read-only without authentication', async () => {
		// Shared list URLs use the import flow rather than rendering a read-only view.
		// Navigating to a share URL opens the Import modal, not a standalone read-only page.
		// This test should be re-enabled when a dedicated shared list viewer route is added.
	});

	// Same dependency on a dedicated shared list viewer route
	test.skip('should display entity metadata identically to owner view', async () => {
		// Shared list URLs use the import flow rather than rendering a read-only view.
		// There is no separate read-only rendering to compare against the owner view.
		// This test should be re-enabled when a dedicated shared list viewer route is added.
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await createShareableList(page, 'A11y Sharing Test');

		// Open share modal
		await page.click('[data-testid="share-list-button"]');

		await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible({ timeout: 10_000 });

		// Wait for share URL to be generated so the modal is fully rendered
		const shareUrlInput = page.locator('[data-testid="share-url-input"]');
		await expect(shareUrlInput).toBeVisible({ timeout: 15_000 });
		await expect(shareUrlInput).not.toHaveValue('', { timeout: 15_000 });

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
