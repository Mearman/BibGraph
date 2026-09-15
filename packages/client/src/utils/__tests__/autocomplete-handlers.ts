/**
 * MSW handlers for autocomplete API tests
 */
import { http, HttpResponse } from "msw";

const OPENALEX_BASE_URL = "https://api.openalex.org";
const MOCK_RESULT_COUNT = 5;
const BASE_ENTITY_ID_SUFFIX = 1000;
const BASE_CITED_BY_COUNT = 1000;
const CITED_BY_COUNT_STEP = 100;
const BASE_WORKS_COUNT = 500;
const WORKS_COUNT_STEP = 50;

// Sample autocomplete responses
const mockAutocompleteResponse = (entityType: string, query: string) => {
  const results: {
    id: string;
    display_name: string;
    entity_type: string;
    cited_by_count: number;
    works_count: number;
    hint: string;
  }[] = [];

  // Generate mock results
  for (let index = 0; index < MOCK_RESULT_COUNT; index++) {
    results.push({
      id: `https://openalex.org/${entityType[0].toUpperCase()}${String(BASE_ENTITY_ID_SUFFIX + index)}`,
      display_name: `${query} Result ${String(index + 1)}`,
      entity_type: entityType,
      cited_by_count: BASE_CITED_BY_COUNT - index * CITED_BY_COUNT_STEP,
      works_count: BASE_WORKS_COUNT - index * WORKS_COUNT_STEP,
      hint: `Sample ${entityType} for ${query}`,
    });
  }

  return results;
};

export const autocompleteHandlers = [
  // General autocomplete endpoint
  http.get(`${OPENALEX_BASE_URL}/autocomplete`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("work", query) });
  }),

  // Entity-specific autocomplete endpoints
  http.get(`${OPENALEX_BASE_URL}/autocomplete/authors`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("author", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/works`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("work", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/sources`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("source", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/institutions`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("institution", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/topics`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("topic", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/publishers`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("publisher", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/funders`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("funder", query) });
  }),

  http.get(`${OPENALEX_BASE_URL}/autocomplete/concepts`, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    if (!query || query.trim() === "") {
      return HttpResponse.json({ results: [] });
    }

    return HttpResponse.json({ results: mockAutocompleteResponse("concept", query) });
  }),
];
