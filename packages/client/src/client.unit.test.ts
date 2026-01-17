/**
 * Comprehensive Unit Tests for OpenAlex Base HTTP Client
 * Tests client configuration, rate limiting, error handling, retry mechanisms,
 * query parameter building, and response parsing
 */

// Mock fetch BEFORE any imports
const mockFetch = vi.fn();

// Mock global fetch using Object.defineProperty for Node.js compatibility
Object.defineProperty(global, "fetch", {
  writable: true,
  value: mockFetch,
});

import type { OpenAlexResponse } from "@bibgraph/types";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { OpenAlexBaseClient } from "./client";
import type { OpenAlexClientConfig } from "./internal/client-config";
import { OpenAlexApiError } from "./internal/errors";

describe("OpenAlexBaseClient", () => {
  let client: OpenAlexBaseClient;
  let mockResponse: Response;

  beforeEach(() => {
    // Clear all mock calls and instances before each test
    mockFetch.mockClear();

    // Create a factory function for mock responses to avoid reuse issues
    const createMockResponse = (data?: {
      results: unknown[];
      meta: { count: number; db_response_time_ms: number; page: number; per_page: number };
    }) => {
      const responseData = data ?? {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
      };
      return Response.json(responseData, {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "content-type": "application/json",
        }),
      });
    };

    mockResponse = createMockResponse();

    // Default mock - create a new response for each call
    mockFetch.mockImplementation(() => Promise.resolve(createMockResponse()));

    client = new OpenAlexBaseClient();
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultClient = new OpenAlexBaseClient();
      const rateLimitStatus = defaultClient.getRateLimitStatus();

      expect(rateLimitStatus.requestsToday).toBe(0);
      expect(rateLimitStatus.requestsRemaining).toBe(100_000);
      expect(rateLimitStatus.dailyResetTime).toBeInstanceOf(Date);
    });

    it("should initialize with custom configuration", async () => {
      const config: OpenAlexClientConfig = {
        baseUrl: "https://custom-api.example.com",
        userEmail: "test@example.com",
        rateLimit: {
          requestsPerSecond: 5,
          requestsPerDay: 5000,
        },
        timeout: 15_000,
        retries: 5,
        retryDelay: 2000,
      };

      const customClient = new OpenAlexBaseClient(config);

      await customClient.get("works");

      // Verify the custom baseUrl and userEmail are used
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://custom-api.example.com/works"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
            "User-Agent": "OpenAlex-TypeScript-Client/1.0",
          }) as HeadersInit,
        }),
      );

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("mailto=test%40example.com");
    });

    it("should merge rate limit configuration correctly", () => {
      const config: OpenAlexClientConfig = {
        rateLimit: {
          requestsPerSecond: 15,
          // requestsPerDay should use default
        },
      };

      const customClient = new OpenAlexBaseClient(config);
      const status = customClient.getRateLimitStatus();

      expect(status.requestsRemaining).toBe(100_000); // Uses default requestsPerDay
    });

    it("should update configuration dynamically", async () => {
      client.updateConfig({
        userEmail: "updated@example.com",
        rateLimit: {
          requestsPerSecond: 20,
        },
      });

      await client.get("authors");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("mailto=updated%40example.com");
    });
  });

  describe("URL Building and Query Parameters", () => {
    it("should build basic URL correctly", async () => {
      await client.get("works");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openalex.org/works",
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
            "User-Agent": "OpenAlex-TypeScript-Client/1.0",
          }) as HeadersInit,
        }),
      );
    });

    it("should include user email in query parameters when configured", async () => {
      client.updateConfig({ userEmail: "researcher@university.edu" });

      await client.get("works");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("mailto=researcher%40university.edu");
    });

    it("should handle various query parameter types", async () => {
      await client.get("works", {
        page: 2,
        per_page: 50,
        filter: "is_oa:true",
        select: ["id", "display_name", "publication_year"],
        sample: 100,
        seed: 42,
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(callUrl);

      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("per_page")).toBe("50");
      expect(url.searchParams.get("filter")).toBe("is_oa:true");
      expect(url.searchParams.get("select")).toBe(
        "id,display_name,publication_year",
      );
      expect(url.searchParams.get("sample")).toBe("100");
      expect(url.searchParams.get("seed")).toBe("42");
    });

    it("should handle null and undefined query parameters", async () => {
      await client.get("works", {
        page: 1,
        per_page: null as unknown as number,
        filter: undefined,
        select: ["id"],
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(callUrl);

      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("per_page")).toBeNull();
      expect(url.searchParams.get("filter")).toBeNull();
      expect(url.searchParams.get("select")).toBe("id");
    });

    it("should properly encode special characters in parameters", async () => {
      await client.get("works", {
        search: "machine learning & AI",
        filter: 'title.search:"deep learning"',
      });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(callUrl);

      expect(url.searchParams.get("search")).toBe("machine learning & AI");
      expect(url.searchParams.get("filter")).toBe(
        'title.search:"deep learning"',
      );
    });
  });

  describe("Rate Limiting Status", () => {
    it("should return accurate initial rate limit status", () => {
      const status = client.getRateLimitStatus();
      expect(status.requestsToday).toBe(0);
      expect(status.requestsRemaining).toBe(100_000);
      expect(status.dailyResetTime).toBeInstanceOf(Date);
    });

    it("should track requests made", async () => {
      await client.get("works");

      const status = client.getRateLimitStatus();
      expect(status.requestsToday).toBe(1);
      expect(status.requestsRemaining).toBe(99_999);
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP 404 errors without retries", async () => {
      const errorResponse = Response.json(
        { error: "Not found", message: "Work not found" },
        { status: 404, statusText: "Not Found" },
      );
      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(client.get("works/W999999999")).rejects.toThrow(
        OpenAlexApiError,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for 404

      // Reset mock and test the error message
      mockFetch.mockResolvedValueOnce(
        Response.json(
          { error: "Not found", message: "Work not found" },
          { status: 404, statusText: "Not Found" },
        ),
      );

      await expect(client.get("works/W999999999")).rejects.toThrow(
        "Work not found",
      );
    });

    it("should handle HTTP 500 errors with retries", async () => {
      const errorResponse = Response.json(
        { error: "Internal Server Error" },
        { status: 500, statusText: "Internal Server Error" },
      );

      // Create client with short retry delay for fast testing
      client = new OpenAlexBaseClient({ retryDelay: 1 }); // Even shorter delay

      // Reset mock completely and set specific sequence
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(mockResponse);

      const result = await client.get("works");

      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries
      expect(result).toBeDefined();
    }, 10_000); // 10 second timeout

    it("should throw OpenAlexApiError after max retries for server errors", async () => {
      const errorResponse = Response.json(
        { error: "Internal Server Error" },
        { status: 500, statusText: "Internal Server Error" },
      );

      // Reset mock completely and set specific mock
      mockFetch.mockReset();
      mockFetch.mockResolvedValue(errorResponse);
      client = new OpenAlexBaseClient({ retries: 1, retryDelay: 1 });

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    }, 10_000); // 10 second timeout

    it("should handle network errors with retries", async () => {
      const networkError = new Error("Network error");
      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);

      const result = await client.get("works");

      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries
      expect(result).toBeDefined();
    });

    it("should throw OpenAlexApiError after max retries for network errors", async () => {
      const networkError = new Error("Network error");
      mockFetch.mockRejectedValue(networkError);

      client = new OpenAlexBaseClient({ retries: 2, retryDelay: 10 }); // Reduce retry delay for faster test

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries

      // Reset mock for second test
      mockFetch.mockRejectedValue(networkError);
      await expect(client.get("works")).rejects.toThrow(/Network error/);
      expect(mockFetch).toHaveBeenCalledTimes(6); // Another 3 calls
    }, 10_000); // 10 second timeout for this test

    it("should handle timeout errors", async () => {
      // Mock AbortError which is thrown on timeout
      const timeoutError = new DOMException(
        "The operation was aborted",
        "AbortError",
      );
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);

      // Reset mock for second test
      mockFetch.mockRejectedValueOnce(timeoutError);
      await expect(client.get("works")).rejects.toThrow(
        /Request timeout after/,
      );
    });

    it("should parse error response JSON when available", async () => {
      const errorResponse = Response.json(
        {
          error: "Bad Request",
          message: "Invalid filter parameter",
        },
        { status: 400, statusText: "Bad Request" },
      );
      mockFetch.mockResolvedValueOnce(errorResponse);

      const promise = client.get("works");
      await expect(promise).rejects.toBeInstanceOf(OpenAlexApiError);
      await expect(promise).rejects.toMatchObject({
        message: "Invalid filter parameter",
        statusCode: 400,
      });
    });

    it("should handle malformed error response JSON", async () => {
      const errorResponse = new Response("Invalid JSON response", {
        status: 400,
        statusText: "Bad Request",
      });
      mockFetch.mockResolvedValueOnce(errorResponse);

      const promise = client.get("works");
      await expect(promise).rejects.toBeInstanceOf(OpenAlexApiError);
      await expect(promise).rejects.toMatchObject({
        message: "HTTP 400 Bad Request",
        statusCode: 400,
      });
    });
  });

  describe("Retry Mechanisms", () => {
    it("should not retry on client errors (4xx)", async () => {
      const clientError = Response.json(
        { error: "Bad Request" },
        { status: 400, statusText: "Bad Request" },
      );
      mockFetch.mockResolvedValueOnce(clientError);

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle configuration with zero retries", async () => {
      client = new OpenAlexBaseClient({ retries: 0 });

      const networkError = new Error("Network error");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe("Response Parsing", () => {
    it("should parse JSON responses correctly", async () => {
      const testData = {
        results: [{ id: "W123", display_name: "Test Work" }],
        meta: { count: 1 },
      };
      const jsonResponse = Response.json(testData, {
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
      });
      mockFetch.mockResolvedValueOnce(jsonResponse);

      const result = await client.get("works");
      expect(result).toEqual(testData);
    });

    it("should handle empty responses", async () => {
      const emptyResponse = new Response("", {
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
      });
      mockFetch.mockResolvedValueOnce(emptyResponse);

      // This should throw an error when trying to parse empty string as JSON
      await expect(client.get("works")).rejects.toThrow();
    });

    it("should handle malformed JSON responses", async () => {
      const malformedResponse = new Response("{ invalid json", {
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
      });
      mockFetch.mockResolvedValueOnce(malformedResponse);

      await expect(client.get("works")).rejects.toThrow();
    });
  });

  describe("HTTP Methods", () => {
    it("should make GET requests for get method", async () => {
      await client.get("works");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/works"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/json",
            "User-Agent": "OpenAlex-TypeScript-Client/1.0",
          }) as HeadersInit,
        }),
      );
    });

    it("should make GET requests with getResponse method", async () => {
      const responseData: OpenAlexResponse<unknown> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
      };

      mockFetch.mockResolvedValueOnce(
        Response.json(responseData, {
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await client.getResponse("works");
      expect(result).toEqual(responseData);
    });

    it("should make GET requests with getById method", async () => {
      const workData = { id: "W123", display_name: "Test Work" };
      mockFetch.mockResolvedValueOnce(
        Response.json(workData, {
          headers: { "content-type": "application/json" },
        }),
      );

      const result = await client.getById("works", "W123", {
        select: ["id", "display_name"],
      });

      expect(result).toEqual(workData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/works/W123"),
        expect.any(Object),
      );

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("select=id,display_name");
    });

    it("should properly encode IDs in getById method", async () => {
      mockFetch.mockResolvedValueOnce(
        Response.json({}, {
          headers: { "content-type": "application/json" },
        }),
      );

      await client.getById("works", "W123/special-chars", {});

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("/works/W123%2Fspecial-chars");
    });
  });

  describe("Streaming and Pagination", () => {
    it("should stream results using async generator", async () => {
      const batch1: OpenAlexResponse<{ id: string }> = {
        results: [{ id: "W1" }, { id: "W2" }],
        meta: { count: 4, db_response_time_ms: 10, page: 1, per_page: 2 },
      };

      // Since extractCursorFromResponse returns undefined, streaming will only fetch one batch
      mockFetch.mockResolvedValueOnce(
        Response.json(batch1, {
          headers: { "content-type": "application/json" },
        }),
      );

      const results: { id: string }[][] = [];
      for await (const batch of client.stream<{ id: string }>("works", {}, 2)) {
        results.push(batch);
      }

      // Only one batch since cursor extraction is not implemented
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual([{ id: "W1" }, { id: "W2" }]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle getAll method with result limit", async () => {
      const batch1: OpenAlexResponse<{ id: string }> = {
        results: [{ id: "W1" }, { id: "W2" }],
        meta: { count: 100, db_response_time_ms: 10, page: 1, per_page: 2 },
      };

      // Since streaming stops after first batch (cursor extraction not implemented),
      // getAll will only get the first batch results
      mockFetch.mockResolvedValueOnce(
        Response.json(batch1, {
          headers: { "content-type": "application/json" },
        }),
      );

      const results = await client.getAll("works", {}, 3);

      // Only first batch results since streaming stops
      expect(results).toHaveLength(2);
      expect(results).toEqual([{ id: "W1" }, { id: "W2" }]);
    });

    it("should handle getAll method without limit", async () => {
      const batch1: OpenAlexResponse<{ id: string }> = {
        results: [{ id: "W1" }, { id: "W2" }],
        meta: { count: 2, db_response_time_ms: 10, page: 1, per_page: 2 },
      };

      // Since streaming stops after first batch (cursor extraction not implemented)
      mockFetch.mockResolvedValueOnce(
        Response.json(batch1, {
          headers: { "content-type": "application/json" },
        }),
      );

      const results = await client.getAll("works");

      // Only first batch results since streaming stops when no cursor
      expect(results).toHaveLength(2);
      expect(results).toEqual([{ id: "W1" }, { id: "W2" }]);
    });
  });

  describe("Request Headers and User Agent", () => {
    it("should set correct default headers", async () => {
      await client.get("works");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.headers).toMatchObject({
        Accept: "application/json",
        "User-Agent": "OpenAlex-TypeScript-Client/1.0",
      });
    });
  });

  describe("Memory and Performance", () => {
    it("should handle rapid successive requests without memory leaks", async () => {
      // Make many requests in succession
      const promises = Array.from({ length: 10 }, (_, i) =>
        client.get(`works${String(i)}`),
      );
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    it("should handle very large query parameters efficiently", async () => {
      const largeSelect = Array.from(
        { length: 100 },
        (_, i) => `field${String(i)}`,
      );

      mockFetch.mockResolvedValueOnce(
        Response.json(
          {
            error: "Invalid select parameter",
            message: "Too many fields in select parameter",
          },
          {
            status: 400,
            statusText: "Bad Request",
            headers: new Headers({ "content-type": "application/json" }),
          },
        ),
      );

      await expect(
        client.get("works", { select: largeSelect }),
      ).rejects.toThrow(OpenAlexApiError);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      const url = new URL(callUrl);
      const selectParam = url.searchParams.get("select");

      expect(selectParam).toContain("field0,field1");
      expect(selectParam).toContain("field99");
      expect(selectParam?.split(",").length).toBe(100);
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    it("should reject responses with no content-type header", async () => {
      mockFetch.mockReset();
      const responseWithoutContentType = Response.json(
        { results: [], meta: { count: 0 } },
        { status: 200 },
      );
      const responseWithoutContentType2 = Response.json(
        { results: [], meta: { count: 0 } },
        { status: 200 },
      );
      mockFetch.mockResolvedValueOnce(responseWithoutContentType);
      mockFetch.mockResolvedValueOnce(responseWithoutContentType2);

      await expect(client.get("works")).rejects.toThrow(OpenAlexApiError);
      await expect(client.get("works")).rejects.toThrow(
        "Expected JSON response but got text/plain",
      );
    });

    it("should handle requests with empty endpoint", async () => {
      await client.get("");

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toBe("https://api.openalex.org/");
    });

    it("should preserve original error types in network failures", async () => {
      const customError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValue(customError);

      client = new OpenAlexBaseClient({ retries: 0 });

      const promise = client.get("works");
      await expect(promise).rejects.toBeInstanceOf(OpenAlexApiError);
      await expect(promise).rejects.toMatchObject({
        message: expect.stringContaining("Failed to fetch"),
      });
    });
  });
});
