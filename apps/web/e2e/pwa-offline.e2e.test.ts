/**
 * E2E: PWA installability and offline behaviour.
 *
 * These tests need a production build: the service worker (sw.js), the web manifest and the precached shell only exist when the built app is served (vite preview, or the CI static server on port 4173). The Vite dev server serves none of them, so on a dev-server run the suite skips with the reason below. Run locally against a preview server:
 *
 * `pnpm --dir apps/web exec vite preview --port 5186`
 *
 * `E2E_BASE_URL=http://localhost:5186 pnpm --filter @bibgraph/web run test:e2e e2e/pwa-offline.e2e.test.ts`
 */

import { expect, test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";

// Present in the committed static data cache (public/data/openalex), so the entity page renders without any live OpenAlex traffic.
const OFFLINE_TEST_WORK_ID = "W2741809807";

// Must match OPENALEX_STATIC_DATA_CACHE_NAME in apps/web/vite.config.ts, the CacheFirst cache the service worker fills when the static data tier is read.
const OPENALEX_STATIC_DATA_CACHE_NAME = "openalex-static-data";

const HTTP_OK_STATUS = 200;

const SW_ACTIVATION_TIMEOUT_MS = 30_000;
const RUNTIME_CACHE_FILL_TIMEOUT_MS = 20_000;

test.describe("PWA offline @pwa", () => {
  test.beforeEach(async ({ request, baseURL }) => {
    // The dev server has no sw.js; skip loudly rather than fail on infrastructure.
    const swUrl = new URL("sw.js", baseURL).toString();
    const swResponse = await request.get(swUrl);
    test.skip(
      swResponse.status() !== HTTP_OK_STATUS,
      `no sw.js at ${swUrl}: this suite needs a production build served by vite preview, not the dev server`,
    );
  });

  test("serves a web manifest that makes the app installable", async ({ page }) => {
    await page.goto("#/", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    const manifestProbe = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      const href = link?.getAttribute("href");
      if (href === undefined || href === null) {
        return null;
      }
      const response = await fetch(new URL(href, window.location.href).toString());
      const manifest: unknown = await response.json();
      return { status: response.status, manifest };
    });

    expect(manifestProbe).not.toBeNull();
    expect(manifestProbe?.status).toBe(HTTP_OK_STATUS);

    // Test files may coerce (constitution Principle I); the expectations below still verify the shape at runtime.
    const manifest = manifestProbe?.manifest as { icons?: { sizes?: string }[] } | undefined;
    expect(manifest).toBeDefined();
    expect(Array.isArray(manifest?.icons)).toBe(true);
    // Chromium requires at least 192px and 512px icons; iOS uses apple-touch-icon.
    const iconSizes = (manifest?.icons ?? []).map((icon) => icon.sizes ?? "");
    expect(iconSizes).toContain("192x192");
    expect(iconSizes).toContain("512x512");
  });

  test("serves the shell and a cached entity page after an offline reload", async ({ page, context }) => {
    await page.goto("#/", { waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Wait for the service worker to activate, then reload once: the first load is not controlled by the worker, so only from this reload onwards do fetches go through the runtime caches.
    await page.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state === "activated";
      },
      { timeout: SW_ACTIVATION_TIMEOUT_MS },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForAppReady(page);

    // Visit an entity page while online so the CacheFirst static data route fills.
    await page.goto(`#/works/${OFFLINE_TEST_WORK_ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="entity-detail-layout"] h1', {
      state: "visible",
      timeout: SW_ACTIVATION_TIMEOUT_MS,
    });
    await expect
      .poll(
        async () =>
          page.evaluate(async (cacheName) => {
            const cache = await caches.open(cacheName);
            return (await cache.keys()).length;
          }, OPENALEX_STATIC_DATA_CACHE_NAME),
        { timeout: RUNTIME_CACHE_FILL_TIMEOUT_MS },
      )
      .toBeGreaterThan(0);

    await context.setOffline(true);
    try {
      // Reload with no network: the shell must come from the service worker precache, not a browser error page.
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForAppReady(page);

      const isControlled = await page.evaluate(
        () => navigator.serviceWorker.controller !== null,
      );
      expect(isControlled).toBe(true);

      // The cached entity page renders from the runtime cache.
      await page.waitForSelector('[data-testid="entity-detail-layout"] h1', {
        state: "visible",
        timeout: SW_ACTIVATION_TIMEOUT_MS,
      });

      // Degradation is visible, not silent: the offline banner shows. Under Chromium network emulation, navigator.onLine re-initialises to true on navigation, so the offline signal lost by the reload is re-applied here (the page is still genuinely offline; the shell and entity above were served without any network).
      await context.setOffline(false);
      await context.setOffline(true);
      await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
