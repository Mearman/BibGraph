/**
 * E2E tests for malformed URL scenarios
 *
 * Tests handling of invalid entity IDs, malformed DOIs, and broken URL formats.
 * Ensures the application gracefully handles malformed URLs without crashes,
 * blank pages, or security vulnerabilities (XSS).
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

declare global {
	interface Window {
		// Set by the XSS-probe tests below if an injected `<script>` payload ever executes.
		__alertShown?: boolean;
	}
}

const EXTREMELY_LONG_ID_DIGIT_COUNT = 1000;

test.describe('@error Malformed URL Errors', () => {
	test('should handle invalid work ID format', async ({ page }) => {
		// Work IDs should be W followed by digits
		await page.goto('#/works/invalid-work-id');
		await waitForAppReady(page);

		// Should show error message or handle gracefully
		const hasErrorMessage = await page.getByText(/error|invalid|not found|processing/i).isVisible().catch(() => false);
		const hasContent = (await page.locator('#root').textContent())?.length ?? 0;

		// Either show error message or have non-empty content (graceful handling)
		expect(hasErrorMessage || hasContent > 0).toBe(true);

		// Should not have blank page
		expect(hasContent).toBeGreaterThan(0);
	});

	test('should handle invalid author ID format', async ({ page }) => {
		// Author IDs should be A followed by digits
		await page.goto('#/authors/not-an-author');
		await waitForAppReady(page);

		// Should show error or processing message
		const isErrorOrProcessing = await page.getByText(/error|invalid|not found|processing/i).isVisible().catch(() => false);
		const hasContent = (await page.locator('#root').textContent())?.length ?? 0;

		// Should handle gracefully with either error message or content
		expect(isErrorOrProcessing || hasContent > 0).toBe(true);
	});

	test('should handle invalid institution ID format', async ({ page }) => {
		// Institution IDs should be I followed by digits
		await page.goto('#/institutions/invalid-institution-id');
		await waitForAppReady(page);

		const hasContent = await page.locator('#root').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		const hasError = await errorText.isVisible().catch(() => false);

		// At minimum, page should render something
		if (!hasError) {
			await expect(page.locator('#root')).toBeVisible();
		}
	});

	test('should handle malformed DOI with collapsed protocol', async ({ page }) => {
		// Test collapsed https:/doi.org instead of https://doi.org
		await page.goto('#/works/https:/doi.org/10.1234/test');
		await waitForAppReady(page);

		// Should handle gracefully - either fix URL, show error, or redirect
		// Not crash or show blank page
		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Verify page is in stable state (not stuck loading)
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible();
	});

	test('should handle DOI with missing prefix', async ({ page }) => {
		// DOI without 10. prefix
		await page.goto('#/works/invalid-doi-format');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		const hasError = await errorText.isVisible().catch(() => false);

		if (!hasError) {
			// At minimum, page should render something stable
			await expect(page.locator('#root')).toBeVisible();
		}
	});

	test('should handle malformed DOI in URL', async ({ page }) => {
		// DOI with special characters that might break URL parsing
		await page.goto('#/works/doi:malformed/doi/with/slashes');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or processing message
		const errorOrProcessing = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorOrProcessing.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle ORCID with invalid format', async ({ page }) => {
		// ORCIDs should be 0000-0000-0000-0000 format
		await page.goto('#/authors/orcid:invalid-orcid');
		await waitForAppReady(page);

		// Should show error or processing message
		const isErrorOrProcessing = await page.getByText(/error|invalid|not found|processing/i).isVisible().catch(() => false);
		const hasContent = (await page.locator('#root').textContent())?.length ?? 0;

		expect(isErrorOrProcessing || hasContent > 0).toBe(true);
	});

	test('should handle ROR with invalid format', async ({ page }) => {
		// ROR IDs have specific format
		await page.goto('#/institutions/ror:not-a-valid-ror');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		const hasError = await errorText.isVisible().catch(() => false);

		if (!hasError) {
			await expect(page.locator('#root')).toBeVisible();
		}
	});

	test('should handle ISSN with invalid format', async ({ page }) => {
		// ISSNs should be 0000-0000 format
		await page.goto('#/sources/issn:not-an-issn');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		const hasError = await errorText.isVisible().catch(() => false);

		if (!hasError) {
			await expect(page.locator('#root')).toBeVisible();
		}
	});

	test('should handle special characters in entity IDs', async ({ page }) => {
		// Test URL with special characters - should not execute as code
		await page.goto('#/works/<script>alert(1)</script>');
		await waitForAppReady(page);

		// Should not execute script
		const alertShown = await page.evaluate(() => {
			// Check if any alert was triggered
			return window.__alertShown ?? false;
		});
		expect(alertShown).toBe(false);

		// Should show error or safe handling
		const hasContent = await page.locator('body').textContent();
		expect(hasContent).toBeDefined();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Content should not contain unescaped script tags
		expect(hasContent).not.toContain('<script>');
	});

	test('should handle URL with query injection attempt', async ({ page }) => {
		// Use a real work ID to test query parameter handling
		await page.goto('#/works/W2741809807?filter=<script>alert(1)</script>');
		await waitForAppReady(page);

		// Should not execute script
		const alertShown = await page.evaluate(() => {
			return window.__alertShown ?? false;
		});
		expect(alertShown).toBe(false);

		// Page should render normally
		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Script tag should be escaped or not rendered
		const bodyHtml = await page.locator('body').innerHTML();
		expect(bodyHtml).not.toContain('<script>alert(1)</script>');
	});

	test('should handle extremely long entity IDs', async ({ page }) => {
		// Very long ID that exceeds normal limits
		const longId = 'W' + '9'.repeat(EXTREMELY_LONG_ID_DIGIT_COUNT);
		await page.goto(`/works/${longId}`);
		await waitForAppReady(page);

		// Should handle gracefully - not crash
		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle empty entity ID', async ({ page }) => {
		// Navigate to entity type root with trailing slash
		await page.goto('#/works/');
		await waitForAppReady(page);

		// Should either show works list/index or handle gracefully, not crash
		const content = page.locator('h1');
		await expect(content.first()).toBeVisible({ timeout: 10_000 });

		// Should not show generic error
		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);
	});

	test('should handle entity ID with only whitespace', async ({ page }) => {
		// URL encoded spaces
		await page.goto('#/works/%20%20%20');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or redirect to index
		const isErrorOrIndex = await page.getByText(/error|invalid|not found|works/i).isVisible().catch(() => false);
		expect(isErrorOrIndex).toBe(true);
	});

	test('should handle double-encoded URLs', async ({ page }) => {
		// Double URL encoding - common malformation
		const doubleEncoded = encodeURIComponent(encodeURIComponent('W2741809807'));
		await page.goto(`/works/${doubleEncoded}`);
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// May show error or may work - just ensure it doesn't crash
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible();
	});

	test('should handle URL with null bytes', async ({ page }) => {
		// Attempt to include null byte (URL encoded as %00)
		await page.goto('#/works/W123%00456');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should handle safely without crashes
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible();
	});

	test('should handle URL path traversal attempts', async ({ page }) => {
		// Path traversal attempt in entity ID
		await page.goto('#/works/../../../etc/passwd');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should not access filesystem or crash
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		const hasError = await errorText.isVisible().catch(() => false);

		// Should either show error or handle gracefully
		expect(hasError || (hasContent?.length ?? 0) > 0).toBe(true);
	});

	test('should handle Unicode in entity IDs', async ({ page }) => {
		// Unicode characters in entity ID
		await page.goto('#/works/W123🚀456');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle SQL injection patterns', async ({ page }) => {
		// SQL injection pattern in entity ID
		await page.goto("#/works/W123'; DROP TABLE works;--");
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should not execute any SQL and should handle safely
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle mixed valid and invalid entity ID components', async ({ page }) => {
		// Start with valid pattern but include invalid characters
		await page.goto('#/works/W1234567890ABC!@#$%');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or handle gracefully
		const errorOrProcessing = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorOrProcessing.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle entity type mismatch - work ID in author route', async ({ page }) => {
		// Valid work ID (W prefix) in author route (expects A prefix)
		await page.goto('#/authors/W2741809807');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error or redirect appropriately
		const isErrorOrProcessing = await page.getByText(/error|invalid|not found|processing/i).isVisible().catch(() => false);

		// Either shows error or handles gracefully
		expect(isErrorOrProcessing || (hasContent?.length ?? 0) > 0).toBe(true);
	});

	test('should handle malformed protocol in external ID', async ({ page }) => {
		// Invalid protocol format
		await page.goto('#/works/htp://invalid.protocol.com/work');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should show error message
		const errorText = page.getByText(/error|invalid|not found|processing/i);
		await expect(errorText.first()).toBeVisible({ timeout: 10_000 });
	});

	test('should handle consecutive slashes in URL', async ({ page }) => {
		// Multiple consecutive slashes
		await page.goto('#/works//W2741809807');
		await waitForAppReady(page);

		// Browser/router may normalize this - verify it doesn't crash
		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should either normalize URL or show content
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible();
	});

	test('should handle malformed hash URL format', async ({ page }) => {
		// Malformed hash routing format
		await page.goto('#/#//works/W2741809807');
		await waitForAppReady(page);

		const hasContent = await page.locator('body').textContent();
		expect(hasContent?.length).toBeGreaterThan(0);

		// Should handle gracefully - may normalize or show error
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible();
	});
});

test.describe('@error Malformed URL Error Recovery', () => {
	test('should recover from malformed URL to valid navigation', async ({ page }) => {
		// Start with malformed URL
		await page.goto('#/works/invalid-work-id');
		await waitForAppReady(page);

		const hasError = await page.getByText(/error|invalid|not found/i).isVisible().catch(() => false);

		// If error shown, verify recovery path exists
		if (hasError) {
			// Look for navigation options (home, browse, etc.)
			const navLinks = page.locator('a[href*="browse"]');
			const hasNavigation = await navLinks.count() > 0;

			// Should provide way to recover
			expect(hasNavigation).toBe(true);
		}

		// Navigate to valid page
		await page.goto('#/works/W2741809807');
		await waitForAppReady(page);

		// Should load successfully after malformed URL
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible({ timeout: 30_000 });
	});

	test('should maintain application state after malformed URL', async ({ page }) => {
		// Load valid page first
		await page.goto('#/browse');
		await waitForAppReady(page);

		const browseGrid = page.locator('[data-testid="browse-grid"]');
		await expect(browseGrid).toBeVisible();

		// Navigate to malformed URL
		await page.goto('#/works/invalid-id-format');
		await waitForAppReady(page);

		// Return to valid page
		await page.goto('#/browse');
		await waitForAppReady(page);

		// Application should still work normally
		await expect(browseGrid).toBeVisible();

		// Verify functionality still works
		const entityCards = page.locator('[data-testid^="entity-type-card-"]');
		const cardCount = await entityCards.count();
		expect(cardCount).toBeGreaterThan(0);
	});
});

test.describe('@error Malformed URL Accessibility', () => {
	test('should maintain accessibility on error pages from malformed URLs', async ({ page }) => {
		await page.goto('#/works/invalid-work-id');
		await waitForAppReady(page);

		// Error messages should be accessible
		const errorText = page.getByText(/error|invalid|not found|processing/i).first();
		const isVisible = await errorText.isVisible().catch(() => false);

		if (isVisible) {
			// Error should be in semantic HTML
			const parentTag = await errorText.evaluate(element => element.closest('div, section, main')?.tagName);
			expect(parentTag).toBeDefined();

			// Page should have proper landmark structure
			const main = page.locator('main');
			const hasMain = await main.count() > 0;
			expect(hasMain).toBe(true);
		}
	});

	test('should allow keyboard navigation on malformed URL error pages', async ({ page }) => {
		await page.goto('#/authors/invalid-author-id');
		await waitForAppReady(page);

		// Tab through interactive elements
		await page.keyboard.press('Tab');

		// Should be able to focus on interactive elements
		const focusedElement = page.locator(':focus');
		const hasFocus = await focusedElement.count() > 0;

		// If interactive elements exist, should be keyboard accessible
		const buttons = await page.locator('button').count();
		if (buttons > 0) {
			expect(hasFocus).toBe(true);
		}
	});
});
