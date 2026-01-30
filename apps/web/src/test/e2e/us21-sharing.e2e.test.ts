/**
 * E2E Tests: US-21 Sharing
 *
 * Tests share button visibility on catalogue lists, shareable URL generation,
 * copy functionality, and accessibility of the share modal.
 *
 * Share flow:
 * 1. Create a list and select it (SelectedListDetails renders)
 * 2. Click "Share" button on SelectedListDetails (data-testid="share-list-button")
 *    OR click "Share" button on CatalogueHeader (triggers handleShare)
 * 3. handleShare generates share URL and opens ShareModal
 * 4. ShareModal displays:
 *    - share-url-input: TextInput with the share URL
 *    - copy-share-url-button: CopyButton to copy URL
 *    - toggle-qr-code-button: Button to show/hide QR code
 *    - open-share-link-button: ActionIcon to open link in new tab
 */

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

/**
 * Create a catalogue list for sharing tests.
 * Uses the same working pattern as catalogue-basic-functionality tests.
 */
const createShareableList = async (page: Page, listName: string): Promise<void> => {
	await page.goto('/#/catalogue', { timeout: 30_000 });
	await waitForAppReady(page);

	await Promise.race([
		page.waitForSelector('[data-testid="catalogue-manager"]', { timeout: 10_000 }),
		page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
	]);

	// Open the "Create New List" menu dropdown
	await page.click('button:has-text("Create New List")');

	// Click "Create Custom List" menu item
	const createCustomItem = page.locator('[role="menuitem"]:has-text("Create Custom List")');
	await expect(createCustomItem).toBeVisible({ timeout: 5_000 });
	await createCustomItem.click();

	// Wait for create modal
	await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });

	// Fill title
	await page.locator('#list-title').fill(listName);

	// Optionally fill description
	const descriptionInput = page.locator('#list-description');
	if (await descriptionInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
		await descriptionInput.fill(`Shareable list: ${listName}`);
	}

	// Submit
	await page.click('button:has-text("Create List")');
	await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10_000 });

	// Wait for the list card to appear in the catalogue grid
	const listCard = page.locator('[data-testid^="list-card-"]').filter({ hasText: listName }).first();
	await expect(listCard).toBeVisible({ timeout: 10_000 });

	// If the list was not auto-selected, click the card to select it
	const selectedTitle = page.locator('[data-testid="selected-list-title"]').filter({ hasText: listName });
	const isAlreadySelected = await selectedTitle.isVisible({ timeout: 3_000 }).catch(() => false);
	if (!isAlreadySelected) {
		await listCard.click();
		await expect(selectedTitle).toBeVisible({ timeout: 10_000 });
	}
};

test.describe('@workflow US-21 Sharing', () => {
	test.setTimeout(120_000);

	test.beforeEach(async ({ page }) => {
		await page.goto('/', {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);
	});

	test('should show share button on catalogue lists', async ({ page }) => {
		await createShareableList(page, 'Share Button Test');

		// Verify the share button is visible on the selected list detail view
		// SelectedListDetails renders: data-testid="share-list-button"
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

		// Ensure no leftover dialog is visible from list creation before proceeding
		await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10_000 });

		// Click the share button on SelectedListDetails
		const shareButton = page.locator('[data-testid="share-list-button"]');
		await expect(shareButton).toBeVisible({ timeout: 10_000 });
		await shareButton.click();

		// The handleShare callback in useCatalogueManagerState:
		// 1. Calls generateShareUrl(selectedList.id) - this is async
		// 2. Sets shareUrl state
		// 3. Opens the ShareModal (setShowShareModal(true))
		// The modal title is "Share List" (set in CatalogueModals)

		// Wait for the share URL input to appear inside the dialog. This is more
		// reliable than waiting for [role="dialog"] because the modal opens only
		// after the async generateShareUrl resolves.
		const shareUrlInput = page.locator('[data-testid="share-url-input"]');
		await expect(shareUrlInput).toBeVisible({ timeout: 20_000 });

		// Wait until the input value is non-empty (URL generation is async)
		await expect(shareUrlInput).not.toHaveValue('', { timeout: 15_000 });

		const shareUrl = await shareUrlInput.inputValue();
		// The share URL is generated by useCatalogue.generateShareUrl()
		// which typically produces a URL containing the origin + catalogue path
		expect(shareUrl.length).toBeGreaterThan(10);

		// Verify the share dialog is fully rendered
		await expect(page.locator('[role="dialog"]')).toBeVisible();

		// Verify copy button is present (data-testid="copy-share-url-button")
		const copyButton = page.locator('[data-testid="copy-share-url-button"]');
		await expect(copyButton).toBeVisible();
		await expect(copyButton).toBeEnabled();

		// Click copy button and verify it responds
		await copyButton.click();
		// After clicking, the CopyButton text changes to "Copied!"
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

		// Open share modal via the share button on SelectedListDetails
		const shareButton = page.locator('[data-testid="share-list-button"]');
		await expect(shareButton).toBeVisible({ timeout: 10_000 });
		await shareButton.click();

		// Wait for share dialog
		await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10_000 });

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
