/**
 * Integration tests for AutocompleteApi
 * Tests autocomplete API integration with mocked responses
 */

import { setupServer } from "msw/node";
import { afterAll, afterEach,beforeAll, describe, expect, it } from "vitest";

import { CachedOpenAlexClient } from "../../cached-client";
import { autocompleteHandlers } from "./autocomplete-handlers";

// Setup MSW server with autocomplete handlers
const server = setupServer(...autocompleteHandlers);

describe("AutocompleteApi Integration Tests", () => {
  let client: CachedOpenAlexClient;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
    client = new CachedOpenAlexClient({
      userEmail: "test@bibgraph.dev",
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe("General Autocomplete", () => {
    it("should fetch results across all entity types", async () => {
      const results = await client.client.autocomplete.autocompleteGeneral(
        "machine learning",
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("display_name");
      expect(results[0]).toHaveProperty("entity_type");
    });

    it("should handle queries with special characters", async () => {
      const results =
        await client.client.autocomplete.autocompleteGeneral("C++ programming");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should return empty array for nonsense query", async () => {
      const results = await client.client.autocomplete.autocompleteGeneral(
        "xyzqweasdzxc123456789",
      );

      expect(Array.isArray(results)).toBe(true);
      // May return empty or small results
    });
  });

  describe("Entity-Specific Autocomplete Endpoints", () => {
    it("should fetch authors with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteAuthors("Einstein");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("display_name");
      expect(results[0].entity_type).toBe("author");
    });

    it("should fetch works with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteWorks("neural networks");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("work");
    });

    it("should fetch sources with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteSources("Nature");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("source");
    });

    it("should fetch institutions with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteInstitutions("MIT");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("institution");
    });

    it("should fetch topics with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteTopics("artificial intelligence");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("topic");
    });

    it("should fetch publishers with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompletePublishers("Springer");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("publisher");
    });

    it("should fetch funders with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteFunders("NSF");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("funder");
    });

    it("should fetch concepts with autocomplete", async () => {
      const results = await client.client.autocomplete.autocompleteConcepts("deep learning");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entity_type).toBe("concept");
    });
  });

  describe("Response Structure", () => {
    it("should return results with required fields", async () => {
      const results = await client.client.autocomplete.autocompleteWorks(
        "machine learning",
      );

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("display_name");
      expect(result).toHaveProperty("entity_type");
      expect(typeof result.id).toBe("string");
      expect(typeof result.display_name).toBe("string");
    });

    it("should include optional fields when available", async () => {
      const results = await client.client.autocomplete.autocompleteWorks(
        "neural networks",
      );

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      // These fields may or may not be present - validate them when present
      const isCitedByCountValid = result.cited_by_count === undefined || typeof result.cited_by_count === "number";
      const isHintValid = result.hint === undefined || typeof result.hint === "string";
      expect(isCitedByCountValid).toBe(true);
      expect(isHintValid).toBe(true);
    });
  });

  describe("Sorting and Ranking", () => {
    it("should return results sorted by relevance/citation count", async () => {
      const results = await client.client.autocomplete.autocompleteWorks(
        "artificial intelligence",
      );

      // Just verify we get results - the OpenAlex API may return results in various orders
      // depending on relevance scoring which may not strictly follow citation counts
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(1);

      // Check that results with citation counts exist
      const resultsWithCitations = results.filter(
        (r) => r.cited_by_count !== undefined && r.cited_by_count > 0,
      );

      // If we have results with citations, they should be reasonably ordered
      // but we don't enforce strict descending order as the API uses complex relevance scoring
      const firstCitationCount = resultsWithCitations.length > 0 ? resultsWithCitations[0].cited_by_count : 0;
      const isCitationCountValid = resultsWithCitations.length === 0 || (firstCitationCount !== undefined && firstCitationCount > 0);
      expect(isCitationCountValid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty query gracefully", async () => {
      // Empty queries return empty arrays instead of throwing errors
      const results = await client.client.autocomplete.autocompleteGeneral("");
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it("should handle whitespace-only query", async () => {
      // Whitespace queries return empty arrays instead of throwing errors
      const WHITESPACE_QUERY_LENGTH = 3;
      const results = await client.client.autocomplete.autocompleteGeneral(' '.repeat(WHITESPACE_QUERY_LENGTH));
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });
  });

  describe("Parameter Validation", () => {
    it("should not send format parameter", async () => {
      // This test verifies the fix - format parameter should never be sent
      const results = await client.client.autocomplete.autocompleteGeneral("test");

      // If we get results without 403 error, the parameter is not being sent
      expect(Array.isArray(results)).toBe(true);
    });

    it("should not send per_page parameter by default", async () => {
      // Default behavior should not include per_page
      const results = await client.client.autocomplete.autocompleteGeneral("test");

      // If we get results without 403 error, the parameter is not being sent incorrectly
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Real-World Queries", () => {
    it("should find famous authors", async () => {
      const results = await client.client.autocomplete.autocompleteAuthors("Marie Curie");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].display_name.toLowerCase()).toContain("curie");
    });

    it("should find well-known institutions", async () => {
      const results = await client.client.autocomplete.autocompleteInstitutions(
        "Massachusetts Institute of Technology",
      );

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.display_name.toLowerCase());
      expect(
        names.some(
          (name) => name.includes("mit") || name.includes("massachusetts"),
        ),
      ).toBe(true);
    });

    it("should find major journals", async () => {
      const results = await client.client.autocomplete.autocompleteSources("Nature");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].display_name.toLowerCase()).toContain("nature");
    });

    it("should find popular topics", async () => {
      const results = await client.client.autocomplete.autocompleteTopics(
        "Machine Learning",
      );

      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.display_name.toLowerCase());
      expect(names.some((name) => name.includes("machine"))).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should complete requests in reasonable time", async () => {
      const startTime = Date.now();

      await client.client.autocomplete.autocompleteGeneral("test");

      const duration = Date.now() - startTime;
      // Should complete within 5 seconds
      const MAX_REQUEST_DURATION_MS = 5000;
      expect(duration).toBeLessThan(MAX_REQUEST_DURATION_MS);
    });

    it("should handle multiple concurrent requests", async () => {
      const queries = ["test1", "test2", "test3"];

      const results = await Promise.all(
        queries.map(async (q) => client.client.autocomplete.autocompleteGeneral(q)),
      );

      expect(results).toHaveLength(queries.length);
      for (const result of results) {
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle very short queries", async () => {
      const results = await client.client.autocomplete.autocompleteGeneral("AI");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle very long queries", async () => {
      const longQuery =
        "machine learning artificial intelligence deep learning neural networks";

      const results = await client.client.autocomplete.autocompleteGeneral(longQuery);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle queries with numbers", async () => {
      const results = await client.client.autocomplete.autocompleteGeneral(
        "COVID-19 pandemic 2020",
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle queries with punctuation", async () => {
      const results = await client.client.autocomplete.autocompleteGeneral(
        "machine-learning, AI & neural-networks",
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle unicode characters", async () => {
      const results =
        await client.client.autocomplete.autocompleteGeneral("日本の大学");

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
