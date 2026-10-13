/**
 * Unit tests for reviewer-facing wording: raw failures map to plain messages with a next step, the start stages have labels, and the post-start notices name a truncated pool, an empty search and missing starting works.
 */

import { describe, expect, it } from "vitest";

import {
  ReviewUserError,
  type StartedReview,
} from "@/lib/algorithms/review-service";

import { describeError, stageLabel, startNotices } from "./review-messages";

const noticesInput = (
  overrides: Partial<StartedReview> = {},
): Pick<StartedReview, "poolCapped" | "queryResultCount" | "missingSeeds"> => ({
  poolCapped: false,
  queryResultCount: 10,
  missingSeeds: [],
  ...overrides,
});

describe("describeError", () => {
  it("shows plain wording for a missing review", () => {
    const described = describeError(new Error("review not found: abc"));
    expect(described.message).toContain("could not be found");
    expect(described.retryable).toBe(false);
  });

  it("shows plain wording for an unloaded pool", () => {
    const described = describeError(
      new Error("pool for review X is not loaded"),
    );
    expect(described.message).toContain("not finished loading");
    expect(described.retryable).toBe(true);
  });

  it("shows plain wording for a network failure", () => {
    const described = describeError(new Error("failed to fetch"));
    expect(described.message).toContain("could not reach OpenAlex");
    expect(described.retryable).toBe(true);
  });

  it("passes a reviewer-worded error through unchanged", () => {
    const described = describeError(
      new ReviewUserError("Your search terms matched no works on OpenAlex."),
    );
    expect(described.message).toBe(
      "Your search terms matched no works on OpenAlex.",
    );
    expect(described.retryable).toBe(false);
  });

  it("falls back to plain generic wording for anything else", () => {
    expect(describeError(new Error("unknown error")).message).toContain(
      "Something went wrong",
    );
    expect(describeError("pool for review X is not loaded").message).toContain(
      "not finished loading",
    );
  });
});

describe("stageLabel", () => {
  it("labels every start stage", () => {
    expect(stageLabel("loading-pool")).toBe("Searching OpenAlex...");
    expect(stageLabel("choosing-seeds")).toBe("Choosing starting works...");
    expect(stageLabel("saving")).toBe("Saving your review...");
  });
});

describe("startNotices", () => {
  it("warns when the pool was cut at the cap", () => {
    const notices = startNotices(
      noticesInput({ poolCapped: true, queryResultCount: 1000 }),
      true,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("1,000");
    expect(notices[0]).toContain("most relevant");
  });

  it("warns when the search matched no works but starting works exist", () => {
    const notices = startNotices(
      noticesInput({ queryResultCount: 0, missingSeeds: ["W9"] }),
      true,
    );
    expect(notices.some((notice) => notice.includes("matched no works"))).toBe(
      true,
    );
  });

  it("names starting works OpenAlex did not return", () => {
    const notices = startNotices(
      noticesInput({ missingSeeds: ["W9", "W8"] }),
      false,
    );
    expect(notices.some((notice) => notice.includes("W9, W8"))).toBe(true);
  });

  it("raises no notices for a clean start", () => {
    expect(startNotices(noticesInput(), true)).toEqual([]);
  });
});
