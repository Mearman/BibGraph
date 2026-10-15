/**
 * Unit tests for transport outcome events: the client must publish each attempt's outcome the moment it happens, not when the query settles. Under persistent throttling the rate-limit retry budget sleeps through five attempts before the query layer sees anything, which left the app reading "synced" and the loading panel claiming offline while every request was being answered with HTTP 429.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch BEFORE any imports that might capture a reference to it
const mockFetch = vi.fn();

Object.defineProperty(global, "fetch", {
  writable: true,
  value: mockFetch,
});

import { OpenAlexBaseClient, type ValidationSchema } from "./client";
import { type ClientRequestOutcome,subscribeToRequestOutcomes } from "./request-outcome-events";

const passthroughSchema = <T = unknown>(): ValidationSchema<T> => ({
  parse: (data: unknown) => data as T,
});

const HTTP_TOO_MANY_REQUESTS = 429;

const throttledResponse = () =>
  new Response("{}", {
    status: HTTP_TOO_MANY_REQUESTS,
    statusText: "Too Many Requests",
    headers: new Headers({ "content-type": "application/json" }),
  });

describe("transport outcome events", () => {
  let client: OpenAlexBaseClient;

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => throttledResponse());
    client = new OpenAlexBaseClient();
  });

  it("emits the 429 http-error on the first throttled response, before the retry budget exhausts", async () => {
    const outcomes: ClientRequestOutcome[] = [];
    const unsubscribe = subscribeToRequestOutcomes((outcome) => {
      outcomes.push(outcome);
    });

    try {
      // The client's rate-limit retries sleep with real timers; rejecting the call and flushing microtasks is enough for the first emission, which happens before any sleep
      const pending = client.get("works", {}, passthroughSchema());
      await Promise.resolve();
      await Promise.resolve();

      expect(outcomes.length).toBeGreaterThanOrEqual(1);
      expect(outcomes[0]?.kind).toBe("http-error");
      if (outcomes[0]?.kind === "http-error") {
        expect(outcomes[0]?.status).toBe(HTTP_TOO_MANY_REQUESTS);
      }
      void pending.catch(() => undefined);
    } finally {
      unsubscribe();
    }
  });

  it("emits a success outcome for an ok response", async () => {
    mockFetch.mockImplementation(() =>
      Response.json(
        { results: [], meta: { count: 0, db_response_time_ms: 1, page: 1, per_page: 25 } },
        { status: 200, headers: new Headers({ "content-type": "application/json" }) },
      ),
    );

    const outcomes: ClientRequestOutcome[] = [];
    const unsubscribe = subscribeToRequestOutcomes((outcome) => {
      outcomes.push(outcome);
    });

    try {
      await client.get("works", {}, passthroughSchema());
      expect(outcomes).toContainEqual({ kind: "success" });
    } finally {
      unsubscribe();
    }
  });
});
