/**
 * Tests for query bookmarking functionality
 */

import {
  areQueriesEquivalent,
  createQueryBookmarkRequest,
  extractPaginationParameters,
  extractQueryParameters,
  generateQueryId,
  generateQueryTitle,
  PAGINATION_PARAMETERS,
} from "../query-bookmarking";
import type { OpenAlexSearchParams as OpenAlexSearchParameters } from "../route-schemas";

describe("Query Bookmarking", () => {
  const mockSearchParameters: OpenAlexSearchParameters = {
    filter: "author.id:A5017898742",
    search: "machine learning",
    sort: "cited_by_count:desc",
    page: 2,
    per_page: 25,
    cursor: "abc123",
    sample: 100,
    seed: 42,
    group_by: "author",
    mailto: "test@example.com"
  };

  describe("extractQueryParameters", () => {
    it("should extract only semantic query parameters", () => {
      const result = extractQueryParameters(mockSearchParameters);

      expect(result).toEqual({
        filter: "author.id:A5017898742",
        search: "machine learning",
        sort: "cited_by_count:desc",
        group_by: "author",
        mailto: "test@example.com"
      });
    });

    it("should return empty object when only pagination parameters exist", () => {
      const paginationOnly: OpenAlexSearchParameters = {
        page: 1,
        per_page: 50,
        cursor: "xyz789"
      };

      const result = extractQueryParameters(paginationOnly);

      expect(result).toEqual({});
    });

    it("should handle undefined values", () => {
      const withUndefined: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        page: undefined,
        per_page: undefined
      };

      const result = extractQueryParameters(withUndefined);

      expect(result).toEqual({
        filter: "author.id:A5017898742"
      });
    });
  });

  describe("extractPaginationParameters", () => {
    it("should extract only pagination parameters", () => {
      const result = extractPaginationParameters(mockSearchParameters);

      expect(result).toEqual({
        page: 2,
        per_page: 25,
        cursor: "abc123",
        sample: 100,
        seed: 42
      });
    });

    it("should return empty object when no pagination parameters exist", () => {
      const noPagination: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        search: "test"
      };

      const result = extractPaginationParameters(noPagination);

      expect(result).toEqual({});
    });
  });

  describe("generateQueryId", () => {
    it("should generate consistent query IDs", () => {
      const id1 = generateQueryId("works", mockSearchParameters);
      const id2 = generateQueryId("works", mockSearchParameters);

      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different queries", () => {
      const id1 = generateQueryId("works", mockSearchParameters);
      const id2 = generateQueryId("authors", mockSearchParameters);

      expect(id1).not.toBe(id2);
    });

    it("should generate same ID for equivalent queries with different pagination", () => {
      const query1: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        page: 1,
        per_page: 50
      };

      const query2: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        page: 2,
        per_page: 25
      };

      const id1 = generateQueryId("works", query1);
      const id2 = generateQueryId("works", query2);

      expect(id1).toBe(id2);
    });

    it("should include all semantic parameters in ID", () => {
      const id = generateQueryId("works", mockSearchParameters);

      expect(id).toContain("works");
      expect(id).toContain("filter=author.id:A5017898742");
      expect(id).toContain("search=machine learning");
      expect(id).toContain("sort=cited_by_count:desc");
      expect(id).toContain("group_by=author");
      expect(id).toContain("mailto=test@example.com");
    });
  });

  describe("createQueryBookmarkRequest", () => {
    it("should create bookmark request with filtered parameters", () => {
      const request = createQueryBookmarkRequest("works", undefined, mockSearchParameters);

      expect(request.internalEndpoint).toBe("/works");
      expect(request.cacheKey).toContain("https://api.openalex.org/works");
      expect(request.cacheKey).toContain("filter=author.id%3AA5017898742");
      expect(request.cacheKey).toContain("search=machine+learning");
      // Should NOT contain pagination parameters
      expect(request.cacheKey).not.toContain("page=2");
      expect(request.cacheKey).not.toContain("per_page=25");
      expect(request.cacheKey).not.toContain("cursor=abc123");
    });

    it("should handle entity-specific queries", () => {
      const request = createQueryBookmarkRequest("authors", "A5017898742", {
        select: "id,display_name"
      });

      expect(request.internalEndpoint).toBe("/authors/A5017898742");
      expect(request.cacheKey).toContain("https://api.openalex.org/authors/A5017898742");
      expect(request.cacheKey).toContain("select=id%2Cdisplay_name");
    });
  });

  describe("areQueriesEquivalent", () => {
    it("should identify equivalent queries ignoring pagination", () => {
      const query1: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        search: "test",
        page: 1,
        per_page: 50
      };

      const query2: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        search: "test",
        page: 2,
        per_page: 25
      };

      expect(areQueriesEquivalent(query1, query2)).toBe(true);
    });

    it("should identify different queries", () => {
      const query1: OpenAlexSearchParameters = {
        filter: "author.id:A5017898742",
        search: "test"
      };

      const query2: OpenAlexSearchParameters = {
        filter: "author.id:A1234567890",
        search: "test"
      };

      expect(areQueriesEquivalent(query1, query2)).toBe(false);
    });

    it("should handle empty queries", () => {
      const empty1: OpenAlexSearchParameters = {};
      const empty2: OpenAlexSearchParameters = {};

      expect(areQueriesEquivalent(empty1, empty2)).toBe(true);
    });
  });

  describe("generateQueryTitle", () => {
    it("should generate descriptive titles", () => {
      const title = generateQueryTitle("works", {
        filter: "author.id:A5017898742",
        search: "machine learning",
        sort: "cited_by_count:desc"
      });

      expect(title).toContain("Works");
      expect(title).toContain('"machine learning"');
      expect(title).toContain("by author");
      expect(title).toContain("sorted cited_by_count:desc");
    });

    it("should handle concept filters", () => {
      const title = generateQueryTitle("works", {
        filter: "concepts.id:C15744967"
      });

      expect(title).toContain("Works");
      expect(title).toContain("by concept");
    });

    it("should handle year filters", () => {
      const title = generateQueryTitle("works", {
        filter: "publication_year:2023"
      });

      expect(title).toContain("Works");
      expect(title).toContain("by year");
    });

    it("should fall back to entity name for simple queries", () => {
      // Test step by step
      const entityType = "authors";
      const searchParameters = {};

      // Test extractQueryParameters directly
      const queryParameters = extractQueryParameters(searchParameters);
      console.log('Extracted query params:', queryParameters);
      console.log('Query params length:', Object.keys(queryParameters).length);

      // Test parts building manually
      const parts: string[] = [];
      if (queryParameters.search !== undefined && queryParameters.search !== "") {
        parts.push(`"${queryParameters.search}"`);
      }
      if (queryParameters.filter !== undefined && queryParameters.filter !== "") {
        const filterString = queryParameters.filter;
        if (filterString.includes('author.id:')) {
          parts.push('by author');
        } else if (filterString.includes('concepts.id:')) {
          parts.push('by concept');
        } else if (filterString.includes('institutions.id:')) {
          parts.push('by institution');
        } else if (filterString.includes('publication_year:')) {
          parts.push('by year');
        } else {
          parts.push('filtered');
        }
      }
      console.log('Parts array:', parts);
      console.log('Parts length:', parts.length);

      const title = generateQueryTitle(entityType, searchParameters);
      console.log('Function output:', title);
      console.log('Expected:', "Authors list");

      expect(title).toBe("Authors list");
    });
  });

  describe("PAGINATION_PARAMETERS", () => {
    it("should include all expected pagination parameters", () => {
      expect(PAGINATION_PARAMETERS.has("page")).toBe(true);
      expect(PAGINATION_PARAMETERS.has("per_page")).toBe(true);
      expect(PAGINATION_PARAMETERS.has("cursor")).toBe(true);
      expect(PAGINATION_PARAMETERS.has("sample")).toBe(true);
      expect(PAGINATION_PARAMETERS.has("seed")).toBe(true);
    });

    it("should not include semantic parameters", () => {
      expect(PAGINATION_PARAMETERS.has("filter")).toBe(false);
      expect(PAGINATION_PARAMETERS.has("search")).toBe(false);
      expect(PAGINATION_PARAMETERS.has("sort")).toBe(false);
      expect(PAGINATION_PARAMETERS.has("group_by")).toBe(false);
      expect(PAGINATION_PARAMETERS.has("mailto")).toBe(false);
    });
  });
});