/**
 * MSW (Mock Service Worker) handlers for OpenAlex API endpoints
 * Used to mock API responses in tests and prevent unhandled network requests
 *
 * In E2E tests: Check filesystem cache first, then fall back to API or mocks
 */

import type { Author, InstitutionEntity, Work } from "@bibgraph/types";
import { http, HttpResponse } from "msw";

const API_BASE = "https://api.openalex.org";

const MOCK_REFERENCED_WORK_ID_OFFSET_1 = 1000;
const MOCK_REFERENCED_WORK_ID_OFFSET_2 = 2000;
const MOCK_RELATED_WORK_ID_OFFSET_1 = 3000;
const MOCK_RELATED_WORK_ID_OFFSET_2 = 4000;
const MOCK_ABSTRACT_WORD_POSITION_MOCK = 3;
const MOCK_ABSTRACT_WORD_POSITION_ABSTRACT = 4;
const MOCK_ABSTRACT_WORD_POSITION_FOR = 5;
const MOCK_ABSTRACT_WORD_POSITION_TESTING = 6;
const DEFAULT_PAGE_SIZE = 25;
const MAX_MOCK_LIST_RESULTS = 10;
const MOCK_ENTITY_ID_BASE = 1_000_000_000;

/**
 * Filesystem cache utilities interface (injected in E2E mode)
 */
interface FilesystemCacheUtilities {
  readFromFilesystemCache: (entityType: string, id: string) => Promise<{ found: boolean; data?: unknown }>;
  writeToFilesystemCache: (entityType: string, id: string, data: unknown) => Promise<void>;
}

/**
 * Mock data factories for OpenAlex entities
 */
const createMockWork = (id: string): Work => {
  const mockWork: Work = {
  id: `https://openalex.org/${id}`,
  doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
  title: `Mock Work ${id}`,
  display_name: `Mock Work ${id}`,
  publication_year: 2023,
  publication_date: "2023-01-01",
  type: "article",
  ids: {
    openalex: `https://openalex.org/${id}`,
    doi: `https://doi.org/10.1000/${id.toLowerCase()}`,
    pmid: undefined,
    pmcid: undefined,
  },
  language: "en",
  primary_location: undefined,
  type_crossref: "journal-article",
  indexed_in: [],
  open_access: {
    is_oa: true,
    oa_url: undefined,
    any_repository_has_fulltext: false,
  },
  authorships: [
    {
      author_position: "first",
      author: {
        id: `https://openalex.org/A${id.slice(1)}`,
        display_name: `Mock Author for ${id}`,
        orcid: undefined,
      },
      institutions: [
        {
          id: `https://openalex.org/I${id.slice(1)}`,
          display_name: `Mock Institution for ${id}`,
          ror: undefined,
          country_code: "US",
          type: "education",
        },
      ],
    },
  ],
  countries_distinct_count: 1,
  institutions_distinct_count: 1,
  corresponding_author_ids: [`https://openalex.org/A${id.slice(1)}`],
  corresponding_institution_ids: [`https://openalex.org/I${id.slice(1)}`],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 1,
  has_fulltext: false,
  fulltext_origin: undefined,
  cited_by_count: 10,
  cited_by_percentile_year: {
    min: 75,
    max: 85,
  },
  biblio: {
    volume: "1",
    issue: "1",
    first_page: "1",
    last_page: "10",
  },
  is_retracted: false,
  is_paratext: false,
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations_count: 1,
  locations: [
    {
      source: {
        id: `https://openalex.org/S${id.slice(1)}`,
        display_name: `Mock Source for ${id}`,
        issn_l: "1234-5678",
        issn: ["1234-5678", "5678-1234"],
        is_oa: true,
        is_in_doaj: false,
        host_organization: undefined,
        host_organization_name: undefined,
        host_organization_lineage: [],
        type: "journal",
      },
      landing_page_url: `https://example.com/${id}`,
      pdf_url: undefined,
      is_oa: true,
      version: "publishedVersion",
      license: "cc-by",
    },
  ],
  best_oa_location: {
    source: {
      id: `https://openalex.org/S${id.slice(1)}`,
      display_name: `Mock Source for ${id}`,
      issn_l: "1234-5678",
      issn: ["1234-5678", "5678-1234"],
      is_oa: true,
      is_in_doaj: false,
      host_organization: undefined,
      host_organization_name: undefined,
      host_organization_lineage: [],
      type: "journal",
    },
    landing_page_url: `https://example.com/${id}`,
    pdf_url: undefined,
    is_oa: true,
    version: "publishedVersion",
    license: "cc-by",
  },
  sustainable_development_goals: [],
  grants: [],
  datasets: [],
  versions: [],
  referenced_works_count: 2,
  referenced_works: [
    `https://openalex.org/W${(Number.parseInt(id.slice(1)) + MOCK_REFERENCED_WORK_ID_OFFSET_1).toString()}`,
    `https://openalex.org/W${(Number.parseInt(id.slice(1)) + MOCK_REFERENCED_WORK_ID_OFFSET_2).toString()}`,
  ],
  related_works: [
    `https://openalex.org/W${(Number.parseInt(id.slice(1)) + MOCK_RELATED_WORK_ID_OFFSET_1).toString()}`,
    `https://openalex.org/W${(Number.parseInt(id.slice(1)) + MOCK_RELATED_WORK_ID_OFFSET_2).toString()}`,
  ],
  abstract_inverted_index: {
    This: [0],
    is: [1],
    a: [2],
    mock: [MOCK_ABSTRACT_WORD_POSITION_MOCK],
    abstract: [MOCK_ABSTRACT_WORD_POSITION_ABSTRACT],
    for: [MOCK_ABSTRACT_WORD_POSITION_FOR],
    testing: [MOCK_ABSTRACT_WORD_POSITION_TESTING],
  },
  cited_by_api_url: `https://api.openalex.org/works?filter=cites:${id}`,
  counts_by_year: [
    {
      year: 2023,
      cited_by_count: 5,
      works_count: 2,
    },
    {
      year: 2022,
      cited_by_count: 3,
      works_count: 1,
    },
    {
      year: 2021,
      cited_by_count: 2,
      works_count: 1,
    },
  ],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  };
  return mockWork;
};

const createMockAuthor = (id: string): Author => ({
  id: `https://openalex.org/${id}`,
  orcid: undefined,
  display_name: `Mock Author ${id}`,
  display_name_alternatives: [],
  works_count: 50,
  cited_by_count: 500,
  ids: {
    openalex: `https://openalex.org/${id}`,
    orcid: undefined,
  },
  last_known_institutions: [],
  affiliations: [],
  x_concepts: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  summary_stats: {
    "2yr_mean_citedness": 5,
    h_index: 10,
    i10_index: 5,
  },
  counts_by_year: [],
});

const createMockInstitution = (id: string): InstitutionEntity => ({
  id: `https://openalex.org/${id}`,
  ror: undefined,
  display_name: `Mock Institution ${id}`,
  country_code: "US",
  type: "education",
  lineage: [],
  cited_by_count: 0,
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  works_count: 0,
  geo: {
    country_code: "US",
    country: "United States",
  },
  international: {
    display_name: {},
  },
});

/**
 * Create filesystem cache helper functions with injected utilities
 */
const createCacheHelpers = (cacheUtils?: FilesystemCacheUtilities) => {
  /**
   * Attempt to read from filesystem cache (E2E only)
   */
  const tryFilesystemCache = async (entityType: string, id: string): Promise<unknown> => {
    if (!cacheUtils) return null;

    try {
      const result = await cacheUtils.readFromFilesystemCache(entityType, id);

      if (result.found) {
        console.log(`🎯 Filesystem cache hit: ${entityType}/${id}`);
        return result.data;
      }
    } catch (error) {
      console.warn(`⚠️ Filesystem cache error for ${entityType}/${id}:`, error);
    }

    return null;
  };

  /**
   * Write to filesystem cache (E2E only)
   */
  const writeToCache = async (entityType: string, id: string, data: unknown): Promise<void> => {
    if (!cacheUtils) return;

    try {
      await cacheUtils.writeToFilesystemCache(entityType, id, data);
      console.log(`💾 Cached response: ${entityType}/${id}`);
    } catch (error) {
      console.error(`❌ Failed to write ${entityType}/${id} to cache:`, error);
    }
  };

  return { tryFilesystemCache, writeToCache, isE2EMode: !!cacheUtils };
};

/**
 * Create MSW handlers with optional filesystem cache support
 */
export const createOpenalexHandlers = (cacheUtils?: FilesystemCacheUtilities) => {
  const { isE2EMode } = createCacheHelpers(cacheUtils);

  return [
  // Get single work by ID
  http.get(`${API_BASE}/works/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    // Handle rate limit simulation (test mode only)
    if (id === "W2799442855") {
      return HttpResponse.json(
        { error: "API rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "x-powered-by": "msw",
            "x-msw-request-id": `mock-rate-limit-${id}`,
          },
        },
      );
    }

    // Return mock data for all tests (including E2E)
    const work = createMockWork(id);
    return HttpResponse.json(work, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // Get single author by ID
  http.get(`${API_BASE}/authors/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    // Return mock data for all tests (including E2E)
    const author = createMockAuthor(id);
    return HttpResponse.json(author, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // Get single institution by ID
  http.get(`${API_BASE}/institutions/:id`, ({ params }) => {
    const { id } = params;

    if (typeof id !== "string") {
      return HttpResponse.json(
        { error: "Invalid ID" },
        {
          status: 400,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-invalid-id",
          },
        },
      );
    }

    // Return mock data for all tests (including E2E)
    const institution = createMockInstitution(id);
    return HttpResponse.json(institution, {
      headers: {
        "x-powered-by": "msw",
        "x-msw-request-id": `mock-${id}`,
      },
    });
  }),

  // List works endpoint
  http.get(`${API_BASE}/works`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || DEFAULT_PAGE_SIZE;

    const works = Array.from({ length: Math.min(perPage, MAX_MOCK_LIST_RESULTS) }, (_, index) =>
      createMockWork(`W${(MOCK_ENTITY_ID_BASE + index).toString()}`),
    );

    return HttpResponse.json(
      {
        results: works,
        meta: {
          count: works.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-works-list-${String(perPage)}`,
        },
      },
    );
  }),

  // List authors endpoint
  http.get(`${API_BASE}/authors`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || DEFAULT_PAGE_SIZE;

    const authors = Array.from({ length: Math.min(perPage, MAX_MOCK_LIST_RESULTS) }, (_, index) =>
      createMockAuthor(`A${(MOCK_ENTITY_ID_BASE + index).toString()}`),
    );

    return HttpResponse.json(
      {
        results: authors,
        meta: {
          count: authors.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-authors-list-${String(perPage)}`,
        },
      },
    );
  }),

  // List institutions endpoint
  http.get(`${API_BASE}/institutions`, ({ request }) => {
    const url = new URL(request.url);
    const perPage = Number(url.searchParams.get("per_page")) || DEFAULT_PAGE_SIZE;

    const institutions = Array.from({ length: Math.min(perPage, MAX_MOCK_LIST_RESULTS) }, (_, index) =>
      createMockInstitution(`I${(MOCK_ENTITY_ID_BASE + index).toString()}`),
    );

    return HttpResponse.json(
      {
        results: institutions,
        meta: {
          count: institutions.length,
          db_response_time_ms: 10,
          page: 1,
          per_page: perPage,
          groups_count: undefined,
        },
      },
      {
        headers: {
          "x-powered-by": "msw",
          "x-msw-request-id": `mock-institutions-list-${String(perPage)}`,
        },
      },
    );
  }),

  // Catch-all for other entity types (sources, topics, publishers, funders, concepts)
  http.get(`${API_BASE}/sources/:id`, ({ params }) => {
    const { id } = params;
    if (typeof id !== "string") return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });

    return HttpResponse.json({
      id: `https://openalex.org/${id}`,
      display_name: `Mock Source ${id}`,
      type: "journal",
      cited_by_count: 0,
      counts_by_year: [],
      updated_date: "2023-01-01",
      created_date: "2023-01-01",
      works_count: 0,
      works_api_url: `https://api.openalex.org/works?filter=primary_location.source.id:${id}`,
    });
  }),

  http.get(`${API_BASE}/topics/:id`, ({ params }) => {
    const { id } = params;
    if (typeof id !== "string") return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });

    return HttpResponse.json({ id: `https://openalex.org/${id}`, display_name: `Mock Topic ${id}` });
  }),

  http.get(`${API_BASE}/publishers/:id`, ({ params }) => {
    const { id } = params;
    if (typeof id !== "string") return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });

    return HttpResponse.json({ id: `https://openalex.org/${id}`, display_name: `Mock Publisher ${id}` });
  }),

  http.get(`${API_BASE}/funders/:id`, ({ params }) => {
    const { id } = params;
    if (typeof id !== "string") return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });

    return HttpResponse.json({ id: `https://openalex.org/${id}`, display_name: `Mock Funder ${id}` });
  }),

  http.get(`${API_BASE}/concepts/:id`, ({ params }) => {
    const { id } = params;
    if (typeof id !== "string") return HttpResponse.json({ error: "Invalid ID" }, { status: 400 });

    return HttpResponse.json({ id: `https://openalex.org/${id}`, display_name: `Mock Concept ${id}` });
  }),

    // Catch-all for unhandled OpenAlex API routes
    http.get(`${API_BASE}/*`, () => {
      // In E2E mode, return mock error instead of hitting API to avoid rate limiting
      if (isE2EMode) {
        console.log(`🎭 Unhandled request, returning mock 404 to avoid API calls`);
        return HttpResponse.json(
          { error: "Entity not found in E2E test mode" },
          {
            status: 404,
            headers: {
              "x-powered-by": "msw-mock-fallback",
              "x-msw-request-id": "mock-e2e-catch-all",
            },
          },
        );
      }

      return HttpResponse.json(
        { error: "Not found" },
        {
          status: 404,
          headers: {
            "x-powered-by": "msw",
            "x-msw-request-id": "mock-catch-all",
          },
        },
      );
    }),
  ];
};

/**
 * Default handlers for non-E2E tests (no filesystem cache)
 */
export const openalexHandlers = createOpenalexHandlers();
