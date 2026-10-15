/**
 * Unit tests for the publication timeline's year-label stride: how many years to skip between shown x-axis labels so rotated labels never crowd at any width.
 */

import { describe, expect, it } from "vitest";

import { MIN_YEAR_LABEL_SPACING_PX, yearLabelStride } from "./year-label-stride";

// A quarter-century of yearly data, the crowded default the stride must thin.
const QUARTER_CENTURY_OF_YEARS = 26;
// A width that fits ten minimum-spaced labels: 26 years there need every third year labelled.
const SPACING_MULTIPLE_FITTING_TEN_LABELS = 10;
const EXPECTED_STRIDE_FOR_TEN_LABELS = 3;
const FIVE_YEARS = 5;
// A width so generous even a century of years would fit at the minimum spacing.
const CENTURY_OF_YEARS = 100;
const OVERLY_GENEROUS_WIDTH_PX = MIN_YEAR_LABEL_SPACING_PX * CENTURY_OF_YEARS;
// Headroom so every one of the quarter-century years clears the minimum spacing.
const WIDE_WIDTH_HEADROOM_MULTIPLE = 4;

describe("yearLabelStride", () => {
  it("shows every year when the width gives each more than the minimum spacing", () => {
    const wideWidthPx = MIN_YEAR_LABEL_SPACING_PX * (QUARTER_CENTURY_OF_YEARS + WIDE_WIDTH_HEADROOM_MULTIPLE);
    expect(yearLabelStride(QUARTER_CENTURY_OF_YEARS, wideWidthPx)).toBe(1);
  });

  it("thins to every Nth year derived from width and the minimum spacing", () => {
    const widthPx = MIN_YEAR_LABEL_SPACING_PX * SPACING_MULTIPLE_FITTING_TEN_LABELS;
    expect(yearLabelStride(QUARTER_CENTURY_OF_YEARS, widthPx)).toBe(EXPECTED_STRIDE_FOR_TEN_LABELS);
  });

  it("never returns a stride below one", () => {
    expect(yearLabelStride(FIVE_YEARS, OVERLY_GENEROUS_WIDTH_PX)).toBe(1);
  });

  it("falls back to every year when no width has been measured yet", () => {
    expect(yearLabelStride(QUARTER_CENTURY_OF_YEARS, null)).toBe(1);
  });
});
