/**
 * Unit tests for OpenAlexBaseClient.getByIds: batched multi-id retrieval through the `openalex_id` OR filter, chunked at the documented per-request value limit and keyed by canonical short id. The global fetch is a mock, so no request leaves the process.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch BEFORE any imports that might capture a reference to it
const mockFetch = vi.fn();

Object.defineProperty(global, "fetch", {
  writable: true,
  value: mockFetch,
});

import type { ValidationSchema } from "./client";
import { OpenAlexBaseClient } from "./client";

/**
 * The per-request OR-value limit the client chunks at, from the OpenAlex filter docs; asserted here so a docs change that moves the limit fails this suite rather than silently dropping batch results
 */
const DOCUMENTED_OR_FILTER_VALUE_LIMIT = 100;

/**
 * Test-only schema that accepts any parsed value, for exercising the client's fetch plumbing without constraining mock payloads to a real entity schema
 */
const passthroughSchema = <T = unknown>(): ValidationSchema<T> => ({
  parse: (data: unknown) => data as T,
});

/**
 * Build an OpenAlex list-response envelope around the given results
 */
const envelope = (results: readonly unknown[]): Response =>
  Response.json(
    {
      results,
      meta: {
        count: results.length,
        db_response_time_ms: 5,
        page: 1,
        per_page: Math.max(results.length, 1),
      },
    },
    { headers: { "content-type": "application/json" } },
  );

const requestedIds = (call: number): string[] => {
  const url = new URL(mockFetch.mock.calls[call]?.[0] as string);
  const filter = url.searchParams.get("filter") ?? "";
  return filter.replace(/^openalex_id:/, "").split("|");
};

describe("OpenAlexBaseClient.getByIds", () => {
  let client: OpenAlexBaseClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new OpenAlexBaseClient();
  });

  it("issues one batched request per documented OR-value limit chunk", async () => {
    mockFetch.mockImplementation(() => envelope([]));
    const ids = Array.from(
      { length: 101 },
      (_, index) => `W${String(index + 1)}`,
    );

    await client.getByIds({
      endpoint: "works",
      ids,
      schema: passthroughSchema(),
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(requestedIds(0)).toHaveLength(DOCUMENTED_OR_FILTER_VALUE_LIMIT);
    expect(requestedIds(1)).toHaveLength(1);
    const firstUrl = new URL(mockFetch.mock.calls[0]?.[0] as string);
    const secondUrl = new URL(mockFetch.mock.calls[1]?.[0] as string);
    expect(firstUrl.searchParams.get("per_page")).toBe("100");
    expect(secondUrl.searchParams.get("per_page")).toBe("1");
  });

  it("returns an empty map and makes no request when no ids are given", async () => {
    const works = await client.getByIds({
      endpoint: "works",
      ids: [],
      schema: passthroughSchema(),
    });

    expect(works.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("deduplicates and canonicalises ids into a single request with uppercase short keys", async () => {
    mockFetch.mockImplementation(() =>
      envelope([{ id: "https://openalex.org/W1" }, { id: "https://openalex.org/W2" }]),
    );

    const works = await client.getByIds({
      endpoint: "works",
      ids: ["W1", "w1", "https://openalex.org/W1", "W2"],
      schema: passthroughSchema(),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(requestedIds(0)).toEqual(["W1", "W2"]);
    expect([...works.keys()]).toEqual(["W1", "W2"]);
  });

  it("omits requested ids OpenAlex does not return", async () => {
    mockFetch.mockImplementation(() => envelope([{ id: "https://openalex.org/W1" }]));

    const works = await client.getByIds({
      endpoint: "works",
      ids: ["W1", "W404"],
      schema: passthroughSchema(),
    });

    expect(works.has("W1")).toBe(true);
    expect(works.has("W404")).toBe(false);
  });

  it("forwards extra params such as select while controlling filter and per_page", async () => {
    mockFetch.mockImplementation(() => envelope([]));

    await client.getByIds({
      endpoint: "works",
      ids: ["W1"],
      params: { select: ["id", "title"] },
      schema: passthroughSchema(),
    });

    const url = new URL(mockFetch.mock.calls[0]?.[0] as string);
    expect(url.searchParams.get("select")).toBe("id,title");
    expect(url.searchParams.get("filter")).toBe("openalex_id:W1");
    expect(url.searchParams.get("per_page")).toBe("1");
  });
});
