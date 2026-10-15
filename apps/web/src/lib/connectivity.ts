/**
 * Connectivity classification shared by the sync indicator and the offline banner. The split that matters: a request that never reached the server (no network, unreachable origin, fetch TypeError) is a network-level failure and may honestly read as offline; a request the server answered with an HTTP error status is a server or throttling problem and must never claim the user is offline.
 */

import { OpenAlexApiError } from "@bibgraph/client";

const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * The outcome of the most recent completed request. `null` until any request finishes.
 */
export type RequestOutcome =
  | { kind: "success" }
  | { kind: "network-error"; message: string }
  | { kind: "http-error"; status?: number; message: string };

export type UnresolvedRequestOutcome = Exclude<RequestOutcome, { kind: "success" }>;

/**
 * Classify a thrown query error. An OpenAlexApiError carrying a status code means the server answered; anything else (including a fetch TypeError wrapped by the client's network retries) failed before an answer arrived.
 */
export const classifyRequestError = (error: unknown): UnresolvedRequestOutcome => {
  if (error instanceof OpenAlexApiError && typeof error.statusCode === "number") {
    return { kind: "http-error", status: error.statusCode, message: error.message };
  }
  return {
    kind: "network-error",
    message: error instanceof Error ? error.message : String(error),
  };
};

export interface ConnectivityDecision {
  /**
   * Which global banner, if any, the outcome justifies.
   */
  banner: "none" | "offline" | "server-error";
  /**
   * What the sync indicator should read.
   */
  indicator: "synced" | "offline" | "error";
}

/**
 * Decide banner and indicator from the browser's own connectivity signal plus the last completed request's outcome. The browser being offline wins over any stale outcome; a network-level failure reads as offline even while `navigator.onLine` still claims otherwise; an HTTP error reads as a server problem; any success clears a stale failure.
 */
export const deriveConnectivity = ({
  isOnline,
  lastOutcome,
}: Readonly<{
  isOnline: boolean;
  lastOutcome: RequestOutcome | null;
}>): ConnectivityDecision => {
  if (!isOnline || lastOutcome?.kind === "network-error") {
    return { banner: "offline", indicator: "offline" };
  }
  if (lastOutcome?.kind === "http-error") {
    return { banner: "server-error", indicator: "error" };
  }
  return { banner: "none", indicator: "synced" };
};

/**
 * Human wording for the server-error banner, naming the retry behaviour: the client already retried with backoff (honouring Retry-After on 429), so the honest instruction is to wait and try again.
 */
export const serverErrorMessage = (outcome: Readonly<{ status?: number }>): string => {
  if (outcome.status === HTTP_TOO_MANY_REQUESTS) {
    return "OpenAlex is throttling requests (HTTP 429). The app already backed off and retried; wait a moment and try again.";
  }
  return "The server answered with an error. The app already retried with backoff; try again in a moment.";
};
