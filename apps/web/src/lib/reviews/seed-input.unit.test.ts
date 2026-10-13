/**
 * Unit tests for seed input parsing: separators, URL normalisation, de-duplication and echoing invalid tokens as typed.
 */

import { describe, expect, it } from "vitest";

import { firstSeed, parseSeedTokens } from "./seed-input";

describe("parseSeedTokens", () => {
  it("normalises urls and lower case ids across all separators", () => {
    expect(parseSeedTokens("https://openalex.org/W1, w2\nW3;W4").valid).toEqual(
      ["W1", "W2", "W3", "W4"],
    );
  });

  it("lists each work once", () => {
    expect(parseSeedTokens("W1 w1 https://openalex.org/W1").valid).toEqual([
      "W1",
    ]);
  });

  it("keeps invalid tokens as typed", () => {
    const parsed = parseSeedTokens("W1 nonsense 10.1000/xyz");
    expect(parsed.valid).toEqual(["W1"]);
    expect(parsed.invalid).toEqual(["nonsense", "10.1000/xyz"]);
  });

  it("returns nothing for blank input", () => {
    expect(parseSeedTokens("  \n ")).toEqual({ valid: [], invalid: [] });
  });
});

describe("firstSeed", () => {
	it("returns the first valid seed, or null when there is none", () => {
		expect(firstSeed(parseSeedTokens("W2 W1"))).toBe("W2");
		expect(firstSeed(parseSeedTokens("nonsense"))).toBeNull();
	});
});
