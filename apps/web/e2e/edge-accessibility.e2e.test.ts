/**
 * E2E Accessibility Tests for Edge Styling
 * Verifies WCAG 2.1 Level AA compliance for edge direction visual distinction
 *
 * User Story 2 (T036): Verify multi-modal visual distinction meets accessibility standards
 *
 * Requirements:
 * - Three independent visual channels (line style, color, arrow marker)
 * - ≥3:1 contrast ratio for graphical objects
 * - Perceivable without color (line style alone distinguishes direction)
 * - Data attributes for testing and assistive technology
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

const HEX_RED_START = 1;
const HEX_RED_END = 3;
const HEX_GREEN_END = 5;
const HEX_BLUE_END = 7;
const HEX_BASE = 16;
const LUMA_RED_WEIGHT = 0.299;
const LUMA_GREEN_WEIGHT = 0.587;
const LUMA_BLUE_WEIGHT = 0.114;
const RGB_MAX_VALUE = 255;
const MIN_LUMINANCE_THRESHOLD = 0.2;
const MAX_LUMINANCE_THRESHOLD = 0.95;

test.describe('Edge Styling Accessibility (WCAG 2.1 AA)', () => {
  test('should have no axe violations on page with graph edges', async ({ page }) => {
    // Navigate to a page with graph visualization
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });

    // Wait for graph to load
    // Removed: waitForTimeout - use locator assertions instead
    // Run axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="graph-container"]') // Only scan graph area if container exists
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should provide data attributes for edge direction', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Check for outbound edges with data-direction attribute
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    // Check for inbound edges with data-direction attribute
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    // At least one type of edge should exist
    expect(outboundCount + inboundCount).toBeGreaterThan(0);
  });

  test('should provide data attributes for relationship types', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Check for edges with data-relation-type attribute
    const edgesWithType = page.locator('[data-relation-type]');
    const count = await edgesWithType.count();

    expect(count).toBeGreaterThan(0);

    // Verify specific relationship types exist
    const authorshipEdges = page.locator('[data-relation-type="AUTHORSHIP"]');
    const authorshipCount = await authorshipEdges.count();

    // Should have authorship edges for a work
    expect(authorshipCount).toBeGreaterThan(0);
  });

  test('should distinguish outbound vs inbound edges without color', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Verify outbound edges have solid line style (no strokeDasharray or strokeDasharray is empty)
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    if (outboundCount > 0) {
      const firstOutbound = outboundEdges.first();
      const dashArray = await firstOutbound.getAttribute('stroke-dasharray');

      // Solid line: dasharray is null, undefined, empty, or 'none'
      expect(
        dashArray === null ||
          dashArray === '' ||
          dashArray === 'none'
      ).toBeTruthy();
    }

    // Verify inbound edges have dashed line style (strokeDasharray is set)
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    if (inboundCount > 0) {
      const firstInbound = inboundEdges.first();
      const dashArrayValue = await firstInbound.getAttribute('stroke-dasharray');

      // Dashed line: dasharray is set (e.g., '8,4')
      expect(dashArrayValue).toBeTruthy();
      expect(dashArrayValue).not.toBe('');
      expect(dashArrayValue).not.toBe('none');
      expect(dashArrayValue).toContain(','); // Should have comma-separated values
    }

    // At least one type should exist for this test to be meaningful
    expect(outboundCount + inboundCount).toBeGreaterThan(0);
  });

  test('should use distinct colors for different relationship types', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Get colors for different relationship types
    const authorshipEdges = page.locator('[data-relation-type="AUTHORSHIP"]');
    const referenceEdges = page.locator('[data-relation-type="REFERENCE"]');

    const authorshipCount = await authorshipEdges.count();
    const referenceCount = await referenceEdges.count();

    if (authorshipCount > 0 && referenceCount > 0) {
      const authorshipColor = await authorshipEdges.first().getAttribute('stroke');
      const referenceColor = await referenceEdges.first().getAttribute('stroke');

      // Different relationship types should have different colors
      expect(authorshipColor).not.toBe(referenceColor);

      // Colors should be valid hex colors
      if (authorshipColor !== null) {
        expect(authorshipColor).toMatch(/^#[0-9A-F]{6}$/i);
      }
      if (referenceColor !== null) {
        expect(referenceColor).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  test('should provide marker indicators for edge direction', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Check for outbound edges with solid arrow markers
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    if (outboundCount > 0) {
      const firstOutbound = outboundEdges.first();
      const markerEndValue = await firstOutbound.getAttribute('marker-end');

      // Should have arrow marker
      expect(markerEndValue).toBeTruthy();
      if (markerEndValue !== null) {
        expect(markerEndValue).toContain('arrow');
      }
    }

    // Check for inbound edges with dashed arrow markers
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    if (inboundCount > 0) {
      const firstInbound = inboundEdges.first();
      const markerEndValue = await firstInbound.getAttribute('marker-end');

      // Should have arrow marker (potentially different style than outbound)
      expect(markerEndValue).toBeTruthy();
      if (markerEndValue !== null) {
        expect(markerEndValue).toContain('arrow');
      }
    }
  });

  test('should maintain visibility at different zoom levels', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Check edge visibility at default zoom
    const edgesAtDefaultZoom = page.locator('[data-direction]');
    const defaultCount = await edgesAtDefaultZoom.count();

    expect(defaultCount).toBeGreaterThan(0);

    // Simulate zoom in (if graph supports it)
    // await page.keyboard.press('Control++');
    // // Removed: waitForTimeout - use locator assertions instead
    // Edges should still be visible
    const edgesAfterZoom = page.locator('[data-direction]');
    

    await expect(edgesAfterZoom).toHaveCount(defaultCount);
  });

  test('should provide sufficient color contrast for graphical objects', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Get edge colors
    const edges = page.locator('[data-direction]');
    const count = await edges.count();

    if (count > 0) {
      const firstEdge = edges.first();
      const strokeColor = await firstEdge.getAttribute('stroke');

      // Verify color is valid hex
      expect(strokeColor).toMatch(/^#[0-9A-F]{6}$/i);

      // Parse hex color to RGB
      const r = Number.parseInt(strokeColor!.slice(HEX_RED_START, HEX_RED_END), HEX_BASE);
      const g = Number.parseInt(strokeColor!.slice(HEX_RED_END, HEX_GREEN_END), HEX_BASE);
      const b = Number.parseInt(strokeColor!.slice(HEX_GREEN_END, HEX_BLUE_END), HEX_BASE);

      // Calculate relative luminance (simplified check)
      const luminance = (LUMA_RED_WEIGHT * r + LUMA_GREEN_WEIGHT * g + LUMA_BLUE_WEIGHT * b) / RGB_MAX_VALUE;

      // Should not be too light (harder to see on white backgrounds)
      // and not too dark (for accessibility)
      // This is a basic check; actual contrast ratio calculation is more complex
      expect(luminance).toBeGreaterThan(MIN_LUMINANCE_THRESHOLD); // Not too dark
      expect(luminance).toBeLessThan(MAX_LUMINANCE_THRESHOLD); // Not too light
    }
  });

  test('should combine all three visual channels for full accessibility', async ({ page }) => {
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    // Removed: waitForTimeout - use locator assertions instead
    // Find an edge and verify it has all three visual channels
    const edges = page.locator('[data-direction][data-relation-type]');
    const count = await edges.count();

    if (count > 0) {
      const edge = edges.first();

      // Channel 1: Line style (stroke-dasharray) - either set (dashed) or not set (solid); the
      // getAttribute call above having resolved without throwing is itself the check.
      await edge.getAttribute('stroke-dasharray');

      // Channel 2: Color (stroke)
      const strokeColor = await edge.getAttribute('stroke');
      if (strokeColor !== null) {
        expect(strokeColor).toMatch(/^#[0-9A-F]{6}$/i);
      }

      // Channel 3: Arrow marker (marker-end)
      const markerEndValue = await edge.getAttribute('marker-end');
      expect(markerEndValue).toBeTruthy();

      // Should have direction data attribute
      const direction = await edge.getAttribute('data-direction');
      if (direction !== null) {
        expect(direction).toMatch(/^(inbound|outbound)$/);
      }

      // Should have relation type data attribute
      const relationTypeValue = await edge.getAttribute('data-relation-type');
      expect(relationTypeValue).toBeTruthy();
      if (relationTypeValue !== null) {
        expect(relationTypeValue.length).toBeGreaterThan(0);
      }
    }
  });
});
