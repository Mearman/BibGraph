/**
 * Route Manifest for E2E Test Coverage Tracking
 *
 * This file documents all application routes to enable coverage tracking and gap analysis.
 * Total: 46 route patterns across 12 entity types + utility routes.
 *
 * @module coverage/route-manifest
 */

/**
 * Single route pattern documentation
 */
interface RoutePattern {
  /** URL pattern (with parameter placeholders) */
  pattern: string;
  /** Route file location (lazy-loaded component) */
  routeFile: string;
  /** Route category: entity-index, entity-detail, utility, special */
  category: 'entity-index' | 'entity-detail' | 'utility' | 'special';
  /** Entity type (if applicable) */
  entityType?: string;
  /** Test tags for Playwright */
  testTags: string[];
  /** E2E test file (if exists) */
  e2eTest?: string;
  /** Has E2E test coverage */
  hasCoverage: boolean;
}

/**
 * Complete route manifest for BibGraph application
 */
export const ROUTE_MANIFEST: readonly RoutePattern[] = [
  // ============================================================
  // UTILITY ROUTES (7 routes)
  // ============================================================

  {
    pattern: '/',
    routeFile: 'index.lazy.tsx',
    category: 'utility',
    testTags: ['@homepage', '@utility'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/explore',
    routeFile: 'explore.lazy.tsx',
    category: 'utility',
    testTags: ['@explore', '@utility'],
    e2eTest: 'explore.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/settings',
    routeFile: 'settings.tsx',
    category: 'utility',
    testTags: ['@settings', '@utility'],
    e2eTest: 'settings.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/cache',
    routeFile: 'cache.lazy.tsx',
    category: 'utility',
    testTags: ['@cache', '@utility'],
    e2eTest: 'cache.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/text',
    routeFile: 'text/index.lazy.tsx',
    category: 'utility',
    testTags: ['@text', '@utility'],
    e2eTest: 'browse.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/evaluation',
    routeFile: 'evaluation.tsx',
    category: 'utility',
    testTags: ['@evaluation', '@utility'],
    e2eTest: 'explore.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/autocomplete',
    routeFile: 'autocomplete/index.lazy.tsx',
    category: 'utility',
    testTags: ['@autocomplete', '@utility'],
    e2eTest: 'autocomplete.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // SPECIAL ID RESOLUTION ROUTES (3 routes)
  // ============================================================

  {
    pattern: '/:$externalId',
    routeFile: '$externalId.lazy.tsx',
    category: 'special',
    testTags: ['@external-id', '@special'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/$bareId',
    routeFile: '$_.lazy.tsx',
    category: 'special',
    testTags: ['@bare-id', '@special'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: 'https://:$',
    routeFile: 'https/$.lazy.tsx',
    category: 'special',
    testTags: ['@https-url', '@special'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // OPENALEX URL ROUTES (2 routes)
  // ============================================================

  {
    pattern: 'https://openalex.org/$',
    routeFile: 'openalex.org/$.lazy.tsx',
    category: 'special',
    testTags: ['@openalex-url', '@special'],
    e2eTest: 'openalex-url-bookmarking.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/openalex-url/$',
    routeFile: 'openalex-url/$.lazy.tsx',
    category: 'special',
    testTags: ['@openalex-url-internal', '@special'],
    e2eTest: 'openalex-url-bookmarking.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // API PROXY ROUTE (1 route)
  // ============================================================

  {
    pattern: '/api-openalex-org/$',
    routeFile: 'api-openalex-org/$.lazy.tsx',
    category: 'special',
    testTags: ['@api-proxy', '@special'],
    e2eTest: 'explore.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // WORKS (2 routes)
  // ============================================================

  {
    pattern: '/works',
    routeFile: 'works/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'works',
    testTags: ['@works', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/works/$workId',
    routeFile: 'works/$_.lazy.tsx',
    category: 'entity-detail',
    entityType: 'works',
    testTags: ['@works', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // AUTHORS (3 routes)
  // ============================================================

  {
    pattern: '/authors',
    routeFile: 'authors/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'authors',
    testTags: ['@authors', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/authors/$authorId',
    routeFile: 'authors/$_.lazy.tsx',
    category: 'entity-detail',
    entityType: 'authors',
    testTags: ['@authors', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/orcid/$orcid',
    routeFile: 'authors/orcid.$orcid.lazy.tsx',
    category: 'entity-detail',
    entityType: 'authors',
    testTags: ['@authors', '@entity', '@orcid'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // SOURCES (3 routes)
  // ============================================================

  {
    pattern: '/sources',
    routeFile: 'sources/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'sources',
    testTags: ['@sources', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/sources/$sourceId',
    routeFile: 'sources/$sourceId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'sources',
    testTags: ['@sources', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/issn/$issn',
    routeFile: 'sources/issn.$issn.lazy.tsx',
    category: 'entity-detail',
    entityType: 'sources',
    testTags: ['@sources', '@entity', '@issn'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // INSTITUTIONS (3 routes)
  // ============================================================

  {
    pattern: '/institutions',
    routeFile: 'institutions/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'institutions',
    testTags: ['@institutions', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/institutions/$institutionId',
    routeFile: 'institutions/$_.lazy.tsx',
    category: 'entity-detail',
    entityType: 'institutions',
    testTags: ['@institutions', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/ror/$ror',
    routeFile: 'institutions/ror.$ror.lazy.tsx',
    category: 'entity-detail',
    entityType: 'institutions',
    testTags: ['@institutions', '@entity', '@ror'],
    e2eTest: 'external-canonical-ids.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // PUBLISHERS (2 routes)
  // ============================================================

  {
    pattern: '/publishers',
    routeFile: 'publishers/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'publishers',
    testTags: ['@publishers', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/publishers/$publisherId',
    routeFile: 'publishers/$publisherId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'publishers',
    testTags: ['@publishers', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // FUNDERS (2 routes)
  // ============================================================

  {
    pattern: '/funders',
    routeFile: 'funders/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'funders',
    testTags: ['@funders', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/funders/$funderId',
    routeFile: 'funders/$funderId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'funders',
    testTags: ['@funders', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // TOPICS (2 routes)
  // ============================================================

  {
    pattern: '/topics',
    routeFile: 'topics/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'topics',
    testTags: ['@topics', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/topics/$topicId',
    routeFile: 'topics/$topicId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'topics',
    testTags: ['@topics', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // CONCEPTS (2 routes)
  // ============================================================

  {
    pattern: '/concepts',
    routeFile: 'concepts/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'concepts',
    testTags: ['@concepts', '@entity', '@entity-index'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/concepts/$conceptId',
    routeFile: 'concepts/$conceptId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'concepts',
    testTags: ['@concepts', '@entity', '@entity-detail'],
    e2eTest: 'page-smoke.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // KEYWORDS (2 routes)
  // ============================================================

  {
    pattern: '/keywords',
    routeFile: 'keywords/index.lazy.tsx',
    category: 'entity-index',
    entityType: 'keywords',
    testTags: ['@keywords', '@entity', '@entity-index'],
    e2eTest: 'keywords-navigation.e2e.test.ts',
    hasCoverage: true,
  },
  {
    pattern: '/keywords/$keywordId',
    routeFile: 'keywords/$keywordId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'keywords',
    testTags: ['@keywords', '@entity', '@entity-detail'],
    e2eTest: 'keywords-navigation.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // DOMAINS (1 route - index not implemented)
  // ============================================================

  {
    pattern: '/domains/$domainId',
    routeFile: 'domains/$domainId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'domains',
    testTags: ['@domains', '@entity', '@entity-detail'],
    e2eTest: 'domains.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // FIELDS (1 route - index not implemented)
  // ============================================================

  {
    pattern: '/fields/$fieldId',
    routeFile: 'fields/$fieldId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'fields',
    testTags: ['@fields', '@entity', '@entity-detail'],
    e2eTest: 'fields.e2e.test.ts',
    hasCoverage: true,
  },

  // ============================================================
  // SUBFIELDS (1 route - index not implemented)
  // ============================================================

  {
    pattern: '/subfields/$subfieldId',
    routeFile: 'subfields/$subfieldId.lazy.tsx',
    category: 'entity-detail',
    entityType: 'subfields',
    testTags: ['@subfields', '@entity', '@entity-detail'],
    e2eTest: 'subfields.e2e.test.ts',
    hasCoverage: true,
  },
] as const;

/**
 * Coverage statistics helper
 */
export const COVERAGE_STATS = {
  /** Total route patterns */
  totalRoutes: ROUTE_MANIFEST.length,
  /** Routes with E2E coverage */
  withCoverage: ROUTE_MANIFEST.filter((r) => r.hasCoverage).length,
  /** Coverage percentage */
  coveragePercentage: Math.round(
    (ROUTE_MANIFEST.filter((r) => r.hasCoverage).length / ROUTE_MANIFEST.length) * 100
  ),
  /** Routes by category */
  byCategory: {
    utility: ROUTE_MANIFEST.filter((r) => r.category === 'utility').length,
    special: ROUTE_MANIFEST.filter((r) => r.category === 'special').length,
    'entity-index': ROUTE_MANIFEST.filter((r) => r.category === 'entity-index').length,
    'entity-detail': ROUTE_MANIFEST.filter((r) => r.category === 'entity-detail').length,
  },
  /** Routes by entity type */
  byEntityType: Object.entries(
    ROUTE_MANIFEST.reduce((acc, route) => {
      if (route.entityType) {
        acc[route.entityType] = (acc[route.entityType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  ),
} as const;

/**
 * Get routes by test tag
 * @param tag
 */
export const getRoutesByTag = (tag: string): readonly RoutePattern[] => ROUTE_MANIFEST.filter((route) =>
    route.testTags.some((t) => t === tag || t.startsWith(tag))
  );

/**
 * Get routes by entity type
 * @param entityType
 */
export const getRoutesByEntityType = (entityType: string): readonly RoutePattern[] => ROUTE_MANIFEST.filter((route) => route.entityType === entityType);

/**
 * Get routes without coverage
 */
export const getUncoveredRoutes = (): readonly RoutePattern[] => ROUTE_MANIFEST.filter((route) => !route.hasCoverage);
