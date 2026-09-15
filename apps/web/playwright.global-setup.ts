/**
 * Playwright global setup
 * Handles storage state persistence and HAR caching for faster e2e tests
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";

import { startMSWServer } from "./test/setup/msw-setup";

// Use relative paths to avoid import.meta issues
// Note: process.cwd() is apps/web because nx e2e target sets cwd to apps/web
const STORAGE_STATE_PATH = path.join(
  process.cwd(),
  "test-results/storage-state/state.json"
);
const HAR_CACHE_DIR = path.join(
  process.cwd(),
  "test-results/har-cache"
);

const PAGE_LOAD_TIMEOUT_MS = 30_000;
const APP_INIT_WAIT_MS = 45_000;
const STORAGE_SAVE_TIMEOUT_MS = 10_000;
const INDEXEDDB_ACCESS_TIMEOUT_MS = 3000;

const globalSetup = async (config: FullConfig) => {
  // START MSW SERVER FIRST - must intercept requests before any browser contexts created
  startMSWServer();

  console.log("🚀 Starting Playwright global setup...");

  // Ensure directories exist
  const storageDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    console.log(`✅ Created storage state directory: ${storageDir}`);
  }

  if (!fs.existsSync(HAR_CACHE_DIR)) {
    fs.mkdirSync(HAR_CACHE_DIR, { recursive: true });
    console.log(`✅ Created HAR cache directory: ${HAR_CACHE_DIR}`);
  }

  // Ensure filesystem cache directory exists
  // Note: process.cwd() is already at apps/web when running E2E tests
  const FILESYSTEM_CACHE_DIR = path.join(
    process.cwd(),
    "public/data/openalex"
  );
  if (fs.existsSync(FILESYSTEM_CACHE_DIR)) {
    console.log(`✅ Filesystem cache directory exists: ${FILESYSTEM_CACHE_DIR}`);
  } else {
    fs.mkdirSync(FILESYSTEM_CACHE_DIR, { recursive: true });
    console.log(`✅ Created filesystem cache directory: ${FILESYSTEM_CACHE_DIR}`);
  }

  // Check if we should warm up the cache
  // Skip cache warmup in CI environments, during E2E tests, and when OpenAlex API requests are causing rate limiting
  const shouldWarmCache =
    process.env.CI === undefined &&
    process.env.RUNNING_E2E === undefined &&
    process.env.E2E_WARM_CACHE === "true" &&
    !fs.existsSync(STORAGE_STATE_PATH);

  if (shouldWarmCache) {
    console.log("🔥 Warming cache with initial application load...");

    const browser = await chromium.launch();
    const context = await browser.newContext({
      // Record network traffic for caching
      recordHar: {
        path: path.join(HAR_CACHE_DIR, "warmup.har"),
        mode: "minimal",
      },
    });

    const page = await context.newPage();

    try {
      // Navigate to the base URL to warm up the cache
      const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:5173";
      console.log(`📡 Loading ${baseURL} to warm cache...`);

      // Add timeout protection for the entire page load process
      await Promise.race([
        page.goto(baseURL, { waitUntil: "networkidle", timeout: PAGE_LOAD_TIMEOUT_MS }),
        new Promise((_resolve, reject) => {
          setTimeout(() => { reject(new Error("Page load timeout")); }, PAGE_LOAD_TIMEOUT_MS);
        })
      ]);

      // Wait for the application to initialize and cache to populate (with extended timeout)
      await Promise.race([
        page.waitForTimeout(APP_INIT_WAIT_MS),
        new Promise((_resolve, reject) => {
          setTimeout(() => { reject(new Error("Application initialization timeout")); }, APP_INIT_WAIT_MS);
        })
      ]);

      // Save storage state for reuse in tests (with timeout protection)
      // Include IndexedDB to support catalogue operations (Playwright 1.51+)
      await Promise.race([
        context.storageState({
          path: STORAGE_STATE_PATH,
          indexedDB: true // Enable IndexedDB state persistence
        }),
        new Promise((_resolve, reject) => {
          setTimeout(() => { reject(new Error("Storage state save timeout")); }, STORAGE_SAVE_TIMEOUT_MS);
        })
      ]);
      console.log(`✅ Storage state saved with IndexedDB support: ${STORAGE_STATE_PATH}`);

      // NOTE: IndexedDB databases are now preserved via storageState({ indexedDB: true })
      // Previous approach of deleting databases was causing test failures
      // The saved storage state will be reused across test runs for performance

      // Commented out: IndexedDB deletion code that was causing catalogue tests to fail
      // await page.evaluate(() => {
      //   return new Promise((resolve) => {
      //     if (!("indexedDB" in window)) {
      //       resolve({ error: "IndexedDB not available" });
      //       return;
      //     }
      //
      //     const databasesToDelete = [
      //       "user-interactions",
      //       "catalogue-db",
      //       "openalex-cache"
      //     ];
      //
      //     let deletedCount = 0;
      //     const totalCount = databasesToDelete.length;
      //
      //     const checkComplete = () => {
      //       if (deletedCount === totalCount) {
      //         resolve({ deletedDatabases: databasesToDelete.length });
      //       }
      //     };
      //
      //     databasesToDelete.forEach(dbName => {
      //       try {
      //         const deleteRequest = indexedDB.deleteDatabase(dbName);
      //
      //         deleteRequest.onsuccess = () => {
      //           console.log(`✅ Deleted IndexedDB: ${dbName}`);
      //           deletedCount++;
      //           checkComplete();
      //         };
      //
      //         deleteRequest.onerror = () => {
      //           console.log(`❌ Failed to delete IndexedDB: ${dbName}`);
      //           deletedCount++; // Still count as complete to avoid hanging
      //           checkComplete();
      //         };
      //
      //         deleteRequest.onblocked = () => {
      //           console.log(`⚠️ Blocked deleting IndexedDB: ${dbName}`);
      //           deletedCount++; // Still count as complete to avoid hanging
      //           checkComplete();
      //         };
      //       } catch (error) {
      //         console.log(`❌ Exception deleting IndexedDB ${dbName}:`, error);
      //         deletedCount++; // Still count as complete to avoid hanging
      //         checkComplete();
      //       }
      //     });
      //   });
      // });

      // Commented out: localStorage/sessionStorage clearing (now preserved in storage state)
      // await page.evaluate(() => {
      //   try {
      //     localStorage.clear();
      //     sessionStorage.clear();
      //     console.log("✅ Cleared localStorage and sessionStorage");
      //   } catch (error) {
      //     console.log("⚠️ Failed to clear storage:", error);
      //   }
      // });

      console.log("🧹 IndexedDB databases preserved for E2E test state");

      // Log cache statistics if available (with timeout protection)
      const cacheStats = await page.evaluate(async (indexedDbTimeoutMs) => {
        return new Promise((resolve) => {
          // Set a timeout for IndexedDB operations
          const timeout = setTimeout(() => {
            resolve({
              error: "IndexedDB access timeout",
              localStorageKeys: Object.keys(localStorage)
            });
          }, indexedDbTimeoutMs); // Reduced timeout since we just cleared databases

          // Check IndexedDB cache size
          if ("indexedDB" in window) {
            try {
              const request = indexedDB.open("openalex-cache");

              request.onsuccess = () => {
                clearTimeout(timeout);
                const database = request.result;
                const objectStoreNames = [...database.objectStoreNames];
                database.close();
                resolve({
                  indexedDBStores: objectStoreNames,
                  localStorageKeys: Object.keys(localStorage),
                });
              };

              request.onerror = () => {
                clearTimeout(timeout);
                resolve({
                  error: "Could not access IndexedDB",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

              request.onblocked = () => {
                clearTimeout(timeout);
                resolve({
                  error: "IndexedDB access blocked",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

              request.onupgradeneeded = () => {
                clearTimeout(timeout);
                resolve({
                  error: "IndexedDB needs upgrade",
                  localStorageKeys: Object.keys(localStorage)
                });
              };

            } catch (error) {
              clearTimeout(timeout);
              resolve({
                error: `IndexedDB exception: ${String(error)}`,
                localStorageKeys: Object.keys(localStorage)
              });
            }
          } else {
            clearTimeout(timeout);
            resolve({
              error: "IndexedDB not available",
              localStorageKeys: Object.keys(localStorage)
            });
          }
        });
      }, INDEXEDDB_ACCESS_TIMEOUT_MS);

      console.log("📊 Cache statistics after cleanup:", cacheStats);
    } catch (error) {
      console.error("❌ Cache warmup failed:", error);
      // Don't fail the entire setup if warmup fails
    } finally {
      await context.close();
      await browser.close();
    }
  } else {
    console.log("✅ Storage state exists, skipping cache warmup");
    console.log(`   Using: ${STORAGE_STATE_PATH}`);
  }

  console.log("✨ Global setup complete!");
  console.log(`   Storage state: ${STORAGE_STATE_PATH}`);
  console.log(`   HAR cache: ${HAR_CACHE_DIR}`);
};

 
export default globalSetup;
