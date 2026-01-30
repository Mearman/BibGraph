/**
 * E2E tests for Visit History (US-22)
 *
 * Tests history recording, display, persistence, clearing, and navigation.
 * History entries are stored in IndexedDB under a __history__ special list.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { StorageTestHelper } from '@/test/helpers/StorageTestHelper';
import { HistoryPage } from '@/test/page-objects/HistoryPage';

test.describe('@utility US-22 Visit History', () => {
	const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

	const TEST_ENTITIES = [
		{ type: 'authors', id: 'A5017898742' },
		{ type: 'works', id: 'W2741809807' },
		{ type: 'institutions', id: 'I27837315' },
		{ type: 'sources', id: 'S137773608' },
	];

	let historyPage: HistoryPage;
	let storage: StorageTestHelper;

	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);

		storage = new StorageTestHelper(page);
		await storage.clearAllStorage();

		historyPage = new HistoryPage(page);
	});

	test('should record entity page visits with timestamps', async ({ page }) => {
		// Visit two entities to populate history
		for (const entity of TEST_ENTITIES.slice(0, 2)) {
			await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
			await waitForAppReady(page);
			await page.waitForLoadState('networkidle');
		}

		// Navigate to history page
		await historyPage.gotoHistory();

		// Verify entries were recorded
		const entryCount = await historyPage.getEntryCount();
		expect(entryCount).toBeGreaterThanOrEqual(2);

		// Verify timestamps are displayed on history entries (rendered as Text elements
		// with relative time like "Just now", "2h ago" inside each Mantine Card)
		const cards = page.locator('.mantine-Card-root');
		// Each card contains a dimmed text element showing the timestamp
		const timestampText = cards.first().locator('.mantine-Text-root[data-c="dimmed"]').last();
		await expect(timestampText).toBeVisible({ timeout: 10_000 });
	});

	test('should list entries in reverse chronological order on /history', async ({ page }) => {
		// Visit entities in sequence: author first, then work
		await page.goto(`${BASE_URL}/#/${TEST_ENTITIES[0].type}/${TEST_ENTITIES[0].id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		await page.goto(`${BASE_URL}/#/${TEST_ENTITIES[1].type}/${TEST_ENTITIES[1].id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Navigate to history
		await historyPage.gotoHistory();

		const entries = await historyPage.getEntries();
		expect(entries.length).toBeGreaterThanOrEqual(2);

		// The most recently visited entity (work) should appear first (reverse chronological).
		// Cards show display names (not raw IDs), so verify the first card contains
		// the entity type badge corresponding to the last-visited entity ("Work").
		const historyCards = page.locator('.mantine-Card-root');
		const firstCardBadge = historyCards.first().locator('.mantine-Badge-root');
		await expect(firstCardBadge).toBeVisible({ timeout: 10_000 });
		const badgeText = await firstCardBadge.textContent();
		expect(badgeText).toBe('Work');
	});

	test('should persist history in IndexedDB (__history__ special list)', async ({ page }) => {
		// Visit an entity
		await page.goto(`${BASE_URL}/#/${TEST_ENTITIES[0].type}/${TEST_ENTITIES[0].id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Check IndexedDB contains history data
		const hasHistoryData = await page.evaluate(async () => {
			const databases = await window.indexedDB.databases();
			return databases.some(
				(db) => db.name !== undefined && db.name !== null && db.name.length > 0
			);
		});
		expect(hasHistoryData).toBe(true);

		// Reload the page to verify persistence
		await page.reload();
		await waitForAppReady(page);

		// Navigate to history and verify entries persisted
		await historyPage.gotoHistory();

		const entryCount = await historyPage.getEntryCount();
		expect(entryCount).toBeGreaterThanOrEqual(1);
	});

	test('should allow clearing all history', async ({ page }) => {
		// Visit entities to populate history
		for (const entity of TEST_ENTITIES.slice(0, 2)) {
			await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
			await waitForAppReady(page);
			await page.waitForLoadState('networkidle');
		}

		// Navigate to history page
		await historyPage.gotoHistory();

		// Verify entries exist
		const initialCount = await historyPage.getEntryCount();
		expect(initialCount).toBeGreaterThanOrEqual(2);

		// Clear all history
		await historyPage.clearAll();

		// Verify history is empty
		const isEmpty = await historyPage.hasEmptyState();
		expect(isEmpty).toBe(true);
	});

	test('should navigate to entity on history entry click', async ({ page }) => {
		// Visit an entity
		const entity = TEST_ENTITIES[0];
		await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Navigate to history page
		await historyPage.gotoHistory();

		// Click the first history entry
		await historyPage.clickEntry(0);

		// Verify navigation occurred to an entity page
		const currentUrl = page.url();
		expect(currentUrl).toMatch(/\/(authors|works|institutions|sources)\//);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Visit an entity to populate history
		await page.goto(`${BASE_URL}/#/${TEST_ENTITIES[0].type}/${TEST_ENTITIES[0].id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Navigate to history page
		await historyPage.gotoHistory();
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
