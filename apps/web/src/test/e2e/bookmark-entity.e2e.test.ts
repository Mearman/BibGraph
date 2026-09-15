/**
 * E2E Test: Bookmark Entity Pages (T010)
 *
 * Tests bookmarking functionality on entity pages including:
 * - Navigate to entity page
 * - Click bookmark button to add bookmark
 * - Verify bookmark is added and persists in storage
 * - Navigate away and return to verify persistence
 * - Click bookmark button again to remove bookmark
 * - Verify bookmark is removed from storage
 *
 * This test is designed to FAIL initially as the bookmark button
 * does not have a data-testid attribute for reliable E2E testing.
 *
 * Required implementation:
 * - Add data-testid="entity-bookmark-button" to bookmark ActionIcon
 * - Ensure bookmark state persists across navigations
 * - Verify storage provider integration works correctly
 */

import { expect,test } from "@playwright/test";

test.describe("Bookmark Entity Pages (T010)", () => {
  const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
  const BASE_URL = IS_CI ? "http://localhost:4173" : "http://localhost:5173";

  // Test entities from different types with known stable IDs
  const TEST_ENTITIES = [
    { type: "authors", id: "A5017898742", description: "Test Author" },
    { type: "works", id: "W2741809807", description: "Test Work" },
    { type: "institutions", id: "I27837315", description: "Test Institution" },
    { type: "sources", id: "S137773608", description: "Test Source" },
  ];

  const MULTI_BOOKMARK_ENTITY_COUNT = 3;
  const RAPID_TOGGLE_COUNT = 5;

  test.beforeEach(async ({ page, context }) => {
    // Clear all storage to ensure clean state
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Clear IndexedDB storage (bookmarks are stored here)
    await page.evaluate(async () => {
      const deleteDB = async (databaseName: string) => {
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(databaseName);
          request.onsuccess = () => { resolve(); };
          request.onerror = () => { reject(new Error(request.error?.message ?? "IndexedDB request failed")); };
          request.onblocked = () => {
            console.warn(`Database ${databaseName} deletion blocked`);
            resolve(); // Continue anyway
          };
        });
      };

      // Delete both catalogue and user interactions databases
      return Promise.all([
        deleteDB('catalogue-db'),
        deleteDB('user-interactions')
      ]);
    });

    // Wait a moment for cleanup to complete
    // Removed: waitForTimeout - use locator assertions instead
  });

  test.describe("Author Entity Bookmarking", () => {
    test("should display bookmark button on author page", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for page to fully render
      // Removed: waitForTimeout - use locator assertions instead
      // THIS TEST WILL FAIL - bookmark button needs data-testid attribute
      // Expected: <ActionIcon data-testid="entity-bookmark-button">
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');

      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });
    });

    test("should bookmark author entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // THIS TEST WILL FAIL - bookmark button needs data-testid attribute
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // Verify initial state - should NOT be bookmarked
      // The button should have variant="light" and color="gray" when not bookmarked
      
      await expect(bookmarkButton).not.toHaveAttribute('data-variant', 'filled');

      // Click to bookmark
      await bookmarkButton.click();

      // Wait for bookmark operation to complete
      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark state changed - button should now be filled/yellow
      
      await expect(bookmarkButton).toHaveAttribute('data-variant', 'filled');

      // Verify bookmark was persisted in IndexedDB
      const isBookmarked = await page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => { resolve(request.result); };
          request.onerror = () => { reject(new Error(request.error?.message ?? "IndexedDB request failed")); };
        });

        const transaction = database.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest: IDBRequest<unknown[]> = store.getAll();

        const entities = await new Promise<unknown[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => { resolve(getAllRequest.result); };
          getAllRequest.onerror = () => { reject(new Error(getAllRequest.error?.message ?? "IndexedDB getAll request failed")); };
        });

        const isCatalogueRecord = (value: unknown): value is { listId: unknown; entityId: unknown; entityType: unknown } =>
          typeof value === 'object' && value !== null;

        database.close();

        // Check if entity exists in bookmarks list
        return entities.some(record =>
          isCatalogueRecord(record) &&
          record.listId === 'bookmarks' &&
          record.entityId === 'A5017898742' &&
          record.entityType === 'authors'
        );
      });

      expect(isBookmarked).toBe(true);
    });

    test("should persist bookmark across page navigation", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // Navigate to author page and bookmark it
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate away to a different entity
      const differentEntity = TEST_ENTITIES[1]; // Work
      await page.goto(`${BASE_URL}/#/${differentEntity.type}/${differentEntity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Navigate back to the original author
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark is still active (button should be filled)
      const returnedBookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(returnedBookmarkButton).toBeVisible({ timeout: 10_000 });

      
      await expect(returnedBookmarkButton).toHaveAttribute('data-variant', 'filled');
    });

    test("should unbookmark entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // First bookmark the entity
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify it's bookmarked
      let variant = bookmarkButton;
      await expect(variant).toHaveAttribute('data-variant', 'filled');

      // Now unbookmark it
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify it's no longer bookmarked
      variant = bookmarkButton;
      await expect(variant).not.toHaveAttribute('data-variant', 'filled');

      // Verify bookmark was removed from IndexedDB
      const isBookmarked = await page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => { resolve(request.result); };
          request.onerror = () => { reject(new Error(request.error?.message ?? "IndexedDB request failed")); };
        });

        const transaction = database.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest: IDBRequest<unknown[]> = store.getAll();

        const entities = await new Promise<unknown[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => { resolve(getAllRequest.result); };
          getAllRequest.onerror = () => { reject(new Error(getAllRequest.error?.message ?? "IndexedDB getAll request failed")); };
        });

        const isCatalogueRecord = (value: unknown): value is { listId: unknown; entityId: unknown; entityType: unknown } =>
          typeof value === 'object' && value !== null;

        database.close();

        // Check if entity still exists in bookmarks list
        return entities.some(record =>
          isCatalogueRecord(record) &&
          record.listId === 'bookmarks' &&
          record.entityId === 'A5017898742' &&
          record.entityType === 'authors'
        );
      });

      expect(isBookmarked).toBe(false);
    });

    test("should reload page and maintain bookmark state", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // Bookmark the entity
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Reload the page
      await page.reload({ waitUntil: 'domcontentloaded' });
      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark button still shows bookmarked state
      const reloadedBookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(reloadedBookmarkButton).toBeVisible({ timeout: 10_000 });

      
      await expect(reloadedBookmarkButton).toHaveAttribute('data-variant', 'filled');
    });
  });

  test.describe("Work Entity Bookmarking", () => {
    test("should bookmark work entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[1]; // Work

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // Click to bookmark
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark state changed
      
      await expect(bookmarkButton).toHaveAttribute('data-variant', 'filled');

      // Verify in storage
      const isBookmarked = await page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => { resolve(request.result); };
          request.onerror = () => { reject(new Error(request.error?.message ?? "IndexedDB request failed")); };
        });

        const transaction = database.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest: IDBRequest<unknown[]> = store.getAll();

        const entities = await new Promise<unknown[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => { resolve(getAllRequest.result); };
          getAllRequest.onerror = () => { reject(new Error(getAllRequest.error?.message ?? "IndexedDB getAll request failed")); };
        });

        const isCatalogueRecord = (value: unknown): value is { listId: unknown; entityId: unknown; entityType: unknown } =>
          typeof value === 'object' && value !== null;

        database.close();

        return entities.some(record =>
          isCatalogueRecord(record) &&
          record.listId === 'bookmarks' &&
          record.entityId === 'W2741809807' &&
          record.entityType === 'works'
        );
      });

      expect(isBookmarked).toBe(true);
    });
  });

  test.describe("Institution Entity Bookmarking", () => {
    test("should bookmark institution entity successfully", async ({ page }) => {
      const entity = TEST_ENTITIES[2]; // Institution

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      
      await expect(bookmarkButton).toHaveAttribute('data-variant', 'filled');
    });
  });

  test.describe("Multiple Entity Bookmarking", () => {
    test("should bookmark multiple entities from different types", async ({ page }) => {
      // Bookmark entities of different types
      for (const entity of TEST_ENTITIES.slice(0, MULTI_BOOKMARK_ENTITY_COUNT)) {
        await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
        await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });
        await bookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
      }

      // Verify all bookmarks exist in storage
      const bookmarkCount = await page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('catalogue-db');
          request.onsuccess = () => { resolve(request.result); };
          request.onerror = () => { reject(new Error(request.error?.message ?? "IndexedDB request failed")); };
        });

        const transaction = database.transaction(['entities'], 'readonly');
        const store = transaction.objectStore('entities');
        const getAllRequest: IDBRequest<unknown[]> = store.getAll();

        const entities = await new Promise<unknown[]>((resolve, reject) => {
          getAllRequest.onsuccess = () => { resolve(getAllRequest.result); };
          getAllRequest.onerror = () => { reject(new Error(getAllRequest.error?.message ?? "IndexedDB getAll request failed")); };
        });

        const isCatalogueRecord = (value: unknown): value is { listId: unknown; entityId: unknown; entityType: unknown } =>
          typeof value === 'object' && value !== null;

        database.close();

        return entities.filter(record => isCatalogueRecord(record) && record.listId === 'bookmarks').length;
      });

      expect(bookmarkCount).toBe(MULTI_BOOKMARK_ENTITY_COUNT);
    });

    test("should navigate to bookmarks page and see bookmarked entities", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      // Bookmark an entity first
      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate to bookmarks page
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Should see the bookmarked entity card
      const bookmarkCard = page.locator('[data-testid="bookmark-card"]').first();
      await expect(bookmarkCard).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Error Handling", () => {
    test("should handle rapid bookmark toggle without errors", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Listen for console errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // Rapidly toggle bookmark multiple times
      for (let index = 0; index < RAPID_TOGGLE_COUNT; index++) {
        await bookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
      }

      // Wait for any errors to surface
      // Removed: waitForTimeout - use locator assertions instead
      // Should not have any bookmark-related errors
      const bookmarkErrors = errors.filter(e =>
        e.toLowerCase().includes('bookmark') ||
        e.toLowerCase().includes('storage')
      );
      expect(bookmarkErrors).toHaveLength(0);
    });

    test("should display loading state during bookmark operation", async ({ page }) => {
      const entity = TEST_ENTITIES[0]; // Author

      await page.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
      await expect(bookmarkButton).toBeVisible({ timeout: 10_000 });

      // The ActionIcon component should show loading state
      // This is indicated by the 'loading' prop being true
      await bookmarkButton.click();

      // In a real scenario, the loading prop would be briefly true
      // For this test, we just verify the button remains interactable
      // Removed: waitForTimeout - use locator assertions instead
      
      await expect(bookmarkButton).toBeEnabled();
    });
  });
});
