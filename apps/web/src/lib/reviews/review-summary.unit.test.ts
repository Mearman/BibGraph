/**
 * Unit tests for the review card summaries: inclusion progress over the decisions and a readable creation date.
 */

import { describe, expect, it } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import { progressLabel } from "./review-summary";

const review = (
  decisions: LiteratureReview["decisions"],
): LiteratureReview => ({
  id: "r1",
  name: "Review",
  query: "q",
  seeds: ["W1"],
  decisions,
  suggestedComposition: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("progressLabel", () => {
  it("counts included of screened", () => {
    expect(
      progressLabel(review({ W2: "include", W3: "exclude", W4: "include" })),
    ).toBe("2 included of 3 screened");
  });

  it("reads zero decisions as nothing screened", () => {
    expect(progressLabel(review({}))).toBe("0 included of 0 screened");
  });
});
