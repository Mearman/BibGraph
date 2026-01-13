/**
 * Playwright configuration for BibGraph E2E tests
 * Uses Playwright's built-in test runner and web server management
 */

import * as fs from "node:fs";

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Test directory - using src and e2e for all tests
  testDir: "./",

  // Test files pattern for E2E tests - run all tests except manual ones in CI
  testMatch: ["**/*.e2e.test.ts", "**/e2e/**/*.e2e.test.ts"],
  // Exclude manual tests from CI runs (they're too slow and comprehensive)
  testIgnore: process.env.CI ? ["**/manual/**"] : [],

  // Run tests in parallel - E2E tests are browser-isolated
  // With 4 shards in CI, each shard handles ~19 tests, so 3 workers per shard is efficient
  fullyParallel: true,
  workers: process.env.CI ? 3 : 4,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "test-results/playwright-report" }],
    // Force consistent JSON output path that matches CI expectations
    ["json", {
      outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE || 'test-results/results.json'
    }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests - configurable for production testing
    // In CI, use preview server port (4173), in dev use dev server port (5173)
    baseURL: process.env.E2E_BASE_URL ?? (process.env.CI ? "http://localhost:4173" : "http://localhost:5173"),

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Record video on failure
    video: "retain-on-failure",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Set user agent for consistency
    userAgent: "BibGraph-E2E-Tests/1.0 Playwright",

    // Timeout settings - increased for CI reliability
    actionTimeout: 30_000,
    navigationTimeout: 60_000,

    // Browser launch options for IndexedDB support
    launchOptions: {
      args: [
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--enable-features=SharedArrayBuffer',
      ],
    },

    // Grant permissions for storage APIs
    permissions: ['storage-access'],

    // Enable service workers and storage partitioning bypass
    serviceWorkers: 'allow',
  },

  // Test timeout - increased from 60s for complex test scenarios
  timeout: 120_000,

  // Global setup and teardown for cache warming and cleanup
  globalSetup: "./playwright.global-setup.ts",
  globalTeardown: "./playwright.global-teardown.ts",

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Reuse storage state for faster tests (cached cookies, localStorage, IndexedDB)
        // Disabled in CI to prevent stale state with preview server caching
        storageState: process.env.CI ? undefined : (fs.existsSync("./test-results/storage-state/state.json") ? "./test-results/storage-state/state.json" : undefined),
      },
    },

    // Uncomment for cross-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile testing
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Output directories
  outputDir: "test-results/playwright-artifacts",

  // Web server configuration for E2E tests
  webServer: process.env.CI ? undefined : {
    // In dev, use serve command for modern Vite setup
    // In CI, no webServer - expect external server to be running
    // Commands run from apps/web directory (set by Nx e2e target)
    command: "nx serve web",
    port: 5173,
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 300_000, // Increased from 120s to 300s for CI reliability
    env: {
      NODE_ENV: "development",
      RUNNING_E2E: "true",
    },
  },
});