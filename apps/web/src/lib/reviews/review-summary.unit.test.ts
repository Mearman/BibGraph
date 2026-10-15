/**
 * Unit tests for the review card summaries: inclusion progress over the decisions, the starting-works count (inclusions folded in, matching the screening set) and a readable creation date.
 */

import { describe, expect, it } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import { progressLabel, startingWorksCount, startingWorksLabel } from "./review-summary";

const TWO_SEEDS_PLUS_ONE_INCLUSION = 3;

const review = (
  decisions: LiteratureReview["decisions"],
  seeds: readonly string[] = ["W1"],
): LiteratureReview => ({
  id: "r1",
  name: "Review",
  query: "q",
  seeds: [...seeds],
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

describe("startingWorksCount", () => {
  it("counts the stored seeds when nothing is included", () => {
    expect(startingWorksCount(review({}, ["W1", "W2"]))).toBe(2);
  });

  it("folds inclusions into the count, as the screening ranking does", () => {
    expect(
      startingWorksCount(review({ W5: "include", W6: "exclude" }, ["W1", "W2"])),
    ).toBe(TWO_SEEDS_PLUS_ONE_INCLUSION);
  });

  it("does not double count an inclusion that is already a seed", () => {
    expect(
      startingWorksCount(review({ W1: "include" }, ["W1", "W2"])),
    ).toBe(2);
  });
});

describe("startingWorksLabel", () => {
  it("writes one starting work and several starting works", () => {
    expect(startingWorksLabel(1)).toBe("1 starting work");
    expect(startingWorksLabel(TWO_SEEDS_PLUS_ONE_INCLUSION)).toBe("3 starting works");
  });
});
