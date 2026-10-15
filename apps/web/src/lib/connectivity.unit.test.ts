/**
 * Unit tests for connectivity classification: a failed request is either a network-level failure (no network, unreachable origin) or an HTTP error from a reachable server, and the banner/indicator decision follows that split so throttling is never reported as being offline.
 */

import { describe, expect, it } from "vitest";

import {
  deriveConnectivity,
  type RequestOutcome,
  type UnresolvedRequestOutcome,
} from "./connectivity";

const SUCCESS: RequestOutcome = { kind: "success" };

describe("deriveConnectivity", () => {
  it("shows no banner and a synced indicator while online with no failing outcome", () => {
    expect(deriveConnectivity({ isOnline: true, lastOutcome: null })).toEqual({
      banner: "none",
      indicator: "synced",
    });
    expect(deriveConnectivity({ isOnline: true, lastOutcome: SUCCESS })).toEqual({
      banner: "none",
      indicator: "synced",
    });
  });

  it("reports offline when the browser is offline or a request failed at the network level", () => {
    const networkError: UnresolvedRequestOutcome = {
      kind: "network-error",
      message: "Network error after 3 attempts",
    };

    expect(deriveConnectivity({ isOnline: false, lastOutcome: null }).banner).toBe("offline");
    expect(deriveConnectivity({ isOnline: true, lastOutcome: networkError })).toEqual({
      banner: "offline",
      indicator: "offline",
    });
  });

  it("reports a server error, never offline, when the server answered with an HTTP error", () => {
    const throttled: UnresolvedRequestOutcome = { kind: "http-error", status: 429, message: "Too many requests" };

    expect(deriveConnectivity({ isOnline: true, lastOutcome: throttled })).toEqual({
      banner: "server-error",
      indicator: "error",
    });
  });

  it("an offline browser wins over a stale HTTP error outcome", () => {
    const serverError: UnresolvedRequestOutcome = { kind: "http-error", status: 500, message: "Server error" };

    expect(deriveConnectivity({ isOnline: false, lastOutcome: serverError }).banner).toBe("offline");
  });

  it("a later success clears a stale failure", () => {
    expect(deriveConnectivity({ isOnline: true, lastOutcome: SUCCESS }).banner).toBe("none");
  });
});
