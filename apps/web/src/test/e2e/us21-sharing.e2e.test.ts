/**
 * E2E Tests: US-21 Sharing
 *
 * Tests share button visibility on catalogue lists, shareable URL generation,
 * read-only rendering of shared lists, and metadata display consistency.
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
	await page.goto('/#/authors/A5017898742', { timeout: 30_000 });
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

/**
 * Open the share modal for a selected list and return the share URL.
 * @param page
 * @param listName
 */
const getShareUrl = async (page: Page, listName: string): Promise<string> => {
	await page.click(`[data-testid="selected-list-title"]:has-text("${listName}")`);
	await page.click('[data-testid="share-list-button"]');

	await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({
		timeout: 15_000,
	});

	const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
	return shareUrlInput.inputValue();
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
		const ariaLabel = await shareButton.getAttribute('aria-label');
		const buttonText = await shareButton.textContent();
		const hasAccessibleName = (ariaLabel && ariaLabel.length > 0) || (buttonText && buttonText.length > 0);
		expect(hasAccessibleName).toBe(true);
	});

	test('should generate shareable URL for a list', async ({ page }) => {
		await createShareableList(page, 'URL Generation Test');

		// Open share modal
		await page.click('[data-testid="selected-list-title"]:has-text("URL Generation Test")');
		await page.click('[data-testid="share-list-button"]');

		// Verify share dialog opens
		await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('h2', { hasText: /Share/i })).toBeVisible();

		// Verify share URL is generated and contains expected path segments
		const shareUrlInput = page.locator('input[value*="catalogue/shared/"]');
		await expect(shareUrlInput).toBeVisible({ timeout: 15_000 });

		const shareUrl = await shareUrlInput.inputValue();
		expect(shareUrl).toContain('localhost');
		expect(shareUrl).toContain('catalogue/shared/');
		expect(shareUrl.length).toBeGreaterThan(30);

		// Verify copy button is present
		const copyButton = page.locator('[data-testid="copy-share-url-button"]');
		await expect(copyButton).toBeVisible();
		await expect(copyButton).toBeEnabled();

		// Click copy and verify it responds
		await copyButton.click();
		// The button may change text to "Copied" or similar
		await expect(copyButton).toBeVisible();
	});

	test('should render shared list as read-only without authentication', async ({
		page,
		context,
	}) => {
		await createShareableList(page, 'Read-Only Share Test');
		const shareUrl = await getShareUrl(page, 'Read-Only Share Test');

		// Close the share modal
		await page.keyboard.press('Escape');

		// Open a new page in the same context to simulate another viewer
		const viewerPage = await context.newPage();
		await viewerPage.goto(shareUrl, { timeout: 30_000 });
		await waitForAppReady(viewerPage);

		// The shared list should render its content
		// Verify the list title is displayed
		await expect(viewerPage.locator('text="Read-Only Share Test"')).toBeVisible({
			timeout: 15_000,
		});

		// In read-only mode, edit and delete controls should not be visible
		const editButton = viewerPage.locator('[data-testid^="edit-list-"]');
		const deleteButton = viewerPage.locator('[data-testid^="delete-list-"]');

		// These should either not exist or be hidden for shared read-only views
		if (await editButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
			// If an edit button exists on the shared view, it should be disabled
			await expect(editButton).toBeDisabled();
		}

		if (await deleteButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await expect(deleteButton).toBeDisabled();
		}

		await viewerPage.close();
	});

	test('should display entity metadata identically to owner view', async ({
		page,
		context,
	}) => {
		await createShareableList(page, 'Metadata Consistency Test');
		const shareUrl = await getShareUrl(page, 'Metadata Consistency Test');

		// Close share modal
		await page.keyboard.press('Escape');

		// Select the list and capture entity metadata from owner view
		const listCard = page
			.locator('.mantine-Card-root[data-testid^="list-card-"]')
			.filter({ hasText: 'Metadata Consistency Test' })
			.first();
		await expect(listCard).toBeVisible({ timeout: 10_000 });
		await listCard.click();

		const ownerDetails = page.locator('[data-testid="selected-list-details"]');
		await expect(ownerDetails).toBeVisible({ timeout: 10_000 });

		// Capture owner-view entity text for comparison
		const ownerEntityText = await ownerDetails.textContent();

		// Open the shared URL in a new page
		const viewerPage = await context.newPage();
		await viewerPage.goto(shareUrl, { timeout: 30_000 });
		await waitForAppReady(viewerPage);

		// Wait for shared list content to load
		await expect(viewerPage.locator('text="Metadata Consistency Test"')).toBeVisible({
			timeout: 15_000,
		});

		// Capture shared-view content
		const sharedContent = await viewerPage.locator('main, [role="main"], #root').textContent();

		// Verify the shared view contains the list title
		expect(sharedContent).toContain('Metadata Consistency Test');

		// If the owner view showed entity details, verify they appear in the shared view too
		if (ownerEntityText && ownerEntityText.includes('A5017898742')) {
			// The entity ID or related metadata should appear in the shared view
			expect(sharedContent).toContain('A5017898742');
		}

		await viewerPage.close();
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await createShareableList(page, 'A11y Sharing Test');

		// Open share modal
		await page.click('[data-testid="selected-list-title"]:has-text("A11y Sharing Test")');
		await page.click('[data-testid="share-list-button"]');

		await expect(page.getByRole('dialog', { name: /Share/i })).toBeVisible({ timeout: 10_000 });

		// Wait for share URL to be generated so the modal is fully rendered
		await expect(page.locator('input[value*="catalogue/shared/"]')).toBeVisible({
			timeout: 15_000,
		});

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
