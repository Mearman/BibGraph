/**
 * E2E tests for Edge Direction Correction
 *
 * Verifies that graph edges point in the correct direction according to OpenAlex data ownership model:
 * - Outbound: Edges from entity that owns the relationship data (e.g., Work → Author via authorships[])
 * - Inbound: Edges discovered via reverse lookup (e.g., Work ← Work via cited_by)
 *
 * Related:
 * - spec: 014-edge-direction-correction
 * - User Story 1: Accurate Citation Network Visualization (P1 - MVP)
 * - Tasks: T011-T016
 */

import type { Page } from '@playwright/test';
import { expect,test } from '@playwright/test';

/**
A single edge in the graph data exposed on `window.__GRAPH_DATA__` for E2E inspection.
 */
interface GraphEdge {
  readonly type: string;
  readonly source: string;
  readonly target: string;
  readonly direction: string;
}

declare global {
  interface Window {
    __GRAPH_DATA__?: { readonly edges?: readonly GraphEdge[] };
  }
}

const WAIT_FOR_GRAPH_RENDER_MS = 3000;

/**
 * Helper to extract graph data from page Assumes graph data is exposed via window object or can be extracted from DOM
 */
const getGraphEdges = async (page: Page): Promise<GraphEdge[]> => {
  // Try to get graph data from window object
  const edges = await page.evaluate(() => {
    if (window.__GRAPH_DATA__?.edges !== undefined) {
      return window.__GRAPH_DATA__.edges;
    }
    return null;
  });

  if (edges !== null) {
    return [...edges];
  }

  // Fallback: Look for data attributes or other DOM indicators This will need to be implemented based on actual graph rendering
  return [];
};

test.describe('Edge Direction - Work → Author (Authorship)', () => {
  test('should have Work as source and Author as target for authorship edges', async ({ page }) => {
    // Load a known work entity with authors
    // Using W2741809807 as test case (known work with multiple authors)
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.waitForTimeout(WAIT_FOR_GRAPH_RENDER_MS); // Allow graph to render

    // Get graph edges
    const edges = await getGraphEdges(page);

    // Find authorship edges
    const authorshipEdges = edges.filter((edge: GraphEdge) =>
      edge.type === 'AUTHORSHIP' || edge.type === 'authored'
    );

    // Verify at least one authorship edge exists
    expect(authorshipEdges.length).toBeGreaterThan(0);

    // Verify each authorship edge has correct direction
    for (const edge of authorshipEdges) {
      // Source should be a Work ID (starts with 'W')
      expect(edge.source).toMatch(/^W\d+/);

      // Target should be an Author ID (starts with 'A')
      expect(edge.target).toMatch(/^A\d+/);

      // Direction should be 'outbound' (Work owns the authorships[] data)
      expect(edge.direction).toBe('outbound');

      console.log(`✅ Authorship edge: ${edge.source} → ${edge.target} (${edge.direction})`);
    }
  });
});

test.describe('Edge Direction - Work → Work (Reference)', () => {
  test('should have citing Work as source and cited Work as target for reference edges', async ({ page }) => {
    // Load a work that cites other works
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    const edges = await getGraphEdges(page);

    // Find reference edges (outbound citations)
    const referenceEdges = edges.filter((edge: GraphEdge) =>
      (edge.type === 'REFERENCE' || edge.type === 'references') &&
      edge.direction === 'outbound'
    );

    if (referenceEdges.length > 0) {
      for (const edge of referenceEdges) {
        // Both source and target should be Work IDs
        expect(edge.source).toMatch(/^W\d+/);
        expect(edge.target).toMatch(/^W\d+/);

        // Direction should be 'outbound' (Work owns referenced_works[] data)
        expect(edge.direction).toBe('outbound');

        console.log(`✅ Reference edge: ${edge.source} → ${edge.target} (${edge.direction})`);
      }
    } else {
      console.log('⚠️  No outbound reference edges found (work may not cite others)');
    }
  });

  test('should have cited Work as source and citing Work as target for inbound citations', async ({ page }) => {
    // Load a work that is cited by others
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    const edges = await getGraphEdges(page);

    // Find inbound citation edges
    const inboundCitations = edges.filter((edge: GraphEdge) =>
      (edge.type === 'REFERENCE' || edge.type === 'references') &&
      edge.direction === 'inbound'
    );

    if (inboundCitations.length > 0) {
      for (const edge of inboundCitations) {
        // Both source and target should be Work IDs
        expect(edge.source).toMatch(/^W\d+/);
        expect(edge.target).toMatch(/^W\d+/);

        // Direction should be 'inbound' (discovered via reverse lookup)
        expect(edge.direction).toBe('inbound');

        console.log(`✅ Inbound citation: ${edge.source} → ${edge.target} (${edge.direction})`);
      }
    } else {
      console.log('⚠️  No inbound citation edges found (work may not be cited)');
    }
  });
});

test.describe('Edge Direction - Work → Source (Publication)', () => {
  test('should have Work as source and Source as target for publication edges', async ({ page }) => {
    // Load a work published in a source/venue
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    const edges = await getGraphEdges(page);

    // Find publication edges
    const publicationEdges = edges.filter((edge: GraphEdge) =>
      edge.type === 'PUBLICATION' || edge.type === 'published_in'
    );

    // Verify at least one publication edge exists (works are published in sources)
    expect(publicationEdges.length).toBeGreaterThan(0);

    for (const edge of publicationEdges) {
      // Source should be a Work ID
      expect(edge.source).toMatch(/^W\d+/);

      // Target should be a Source ID (starts with 'S')
      expect(edge.target).toMatch(/^S\d+/);

      // Direction should be 'outbound' (Work owns primary_location.source data)
      expect(edge.direction).toBe('outbound');

      console.log(`✅ Publication edge: ${edge.source} → ${edge.target} (${edge.direction})`);
    }
  });
});

test.describe('Edge Direction - Work → Topic', () => {
  test('should have Work as source and Topic as target for topic edges', async ({ page }) => {
    // Load a work with topics
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    const edges = await getGraphEdges(page);

    // Find topic edges
    const topicEdges = edges.filter((edge: GraphEdge) =>
      edge.type === 'TOPIC' || edge.type === 'work_has_topic'
    );

    if (topicEdges.length > 0) {
      for (const edge of topicEdges) {
        // Source should be a Work ID
        expect(edge.source).toMatch(/^W\d+/);

        // Target should be a Topic ID (starts with 'T')
        expect(edge.target).toMatch(/^T\d+/);

        // Direction should be 'outbound' (Work owns topics[] data)
        expect(edge.direction).toBe('outbound');

        console.log(`✅ Topic edge: ${edge.source} → ${edge.target} (${edge.direction})`);
      }
    } else {
      console.log('⚠️  No topic edges found');
    }
  });
});

test.describe('Edge Direction - Author → Institution (Affiliation)', () => {
  test('should have Author as source and Institution as target for affiliation edges', async ({ page }) => {
    // Load an author with institutional affiliations
    // First load a work, then navigate to an author
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Click on an author node to navigate (if visible)
    // This is a simplified approach - actual implementation may vary
    const authorLinks = page.locator('a[href*="/authors/A"]');
    const authorCount = await authorLinks.count();

    if (authorCount > 0) {
      const firstAuthor = authorLinks.first();
      await firstAuthor.click();
      await page.waitForLoadState('load');
      // Removed: waitForTimeout - use locator assertions instead
      const edges = await getGraphEdges(page);

      // Find affiliation edges
      const affiliationEdges = edges.filter((edge: GraphEdge) =>
        edge.type === 'AFFILIATION' || edge.type === 'affiliated'
      );

      if (affiliationEdges.length > 0) {
        for (const edge of affiliationEdges) {
          // Source should be an Author ID
          expect(edge.source).toMatch(/^A\d+/);

          // Target should be an Institution ID (starts with 'I')
          expect(edge.target).toMatch(/^I\d+/);

          // Direction should be 'outbound' (Author owns affiliations[] data)
          expect(edge.direction).toBe('outbound');

          console.log(`✅ Affiliation edge: ${edge.source} → ${edge.target} (${edge.direction})`);
        }
      } else {
        console.log('⚠️  No affiliation edges found');
      }
    } else {
      console.log('⚠️  No author links found to click');
    }
  });
});

test.describe('Edge Direction - Institution → Institution (Lineage)', () => {
  test('should have child Institution as source and parent Institution as target for lineage edges', async ({ page }) => {
    // Load an institution with parent/child relationships
    // Navigate via an author's institution
    await page.goto('#/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Navigate to institution (via author if needed)
    const institutionLinks = page.locator('a[href*="/institutions/I"]');
    const institutionCount = await institutionLinks.count();

    if (institutionCount > 0) {
      const firstInstitution = institutionLinks.first();
      await firstInstitution.click();
      await page.waitForLoadState('load');
      // Removed: waitForTimeout - use locator assertions instead
      const edges = await getGraphEdges(page);

      // Find lineage edges
      const lineageEdges = edges.filter((edge: GraphEdge) =>
        edge.type === 'LINEAGE' || edge.type === 'institution_child_of'
      );

      if (lineageEdges.length > 0) {
        for (const edge of lineageEdges) {
          // Both source and target should be Institution IDs
          expect(edge.source).toMatch(/^I\d+/);
          expect(edge.target).toMatch(/^I\d+/);

          // Direction should be 'outbound' (Institution owns lineage[] data)
          expect(edge.direction).toBe('outbound');

          console.log(`✅ Lineage edge: ${edge.source} → ${edge.target} (${edge.direction})`);
        }
      } else {
        console.log('⚠️  No lineage edges found (institution may not have parent)');
      }
    } else {
      console.log('⚠️  No institution links found to click');
    }
  });
});
