/**
 * Dimmed text must meet WCAG AA (4.5:1) for normal text on the body and card surfaces in both colour schemes.
 */

import { DEFAULT_THEME } from "@mantine/core";
import { describe, expect, it } from "vitest";

import { bibgraphCssVariablesResolver, DIMMED_COLOR_DARK, DIMMED_COLOR_LIGHT } from "./css-variables-resolver";

const WCAG_AA_NORMAL_TEXT_RATIO = 4.5;
const HEX_RADIX = 16;
const SRGB_LINEAR_THRESHOLD = 0.03928;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_DIVISOR = 1.055;
const SRGB_GAMMA_EXPONENT = 2.4;
const CONTRAST_FLARE = 0.05;
const CHANNEL_MAX = 255;

// WCAG relative-luminance coefficients (red, green, blue); an enum because the coefficient literals are self-describing only as a named set.
enum LuminanceWeight {
	Red = 0.2126,
	Green = 0.7152,
	Blue = 0.0722,
}

const LUMINANCE_CHANNEL_WEIGHTS = [LuminanceWeight.Red, LuminanceWeight.Green, LuminanceWeight.Blue] as const;

const luminance = (hex: string): number => {
	const redStart = 1;
	const greenStart = 3;
	const blueStart = 5;
	const channels = [redStart, greenStart, blueStart].map((start) => {
		const value = Number.parseInt(hex.slice(start, start + 2), HEX_RADIX) / CHANNEL_MAX;
		return value <= SRGB_LINEAR_THRESHOLD
			? value / SRGB_LINEAR_DIVISOR
			: ((value + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_EXPONENT;
	});
	return channels.reduce((sum, channel, index) => sum + channel * LUMINANCE_CHANNEL_WEIGHTS[index], 0);
};

const contrastRatio = (first: string, second: string): number => {
	const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
	return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE);
};

const { gray, dark } = DEFAULT_THEME.colors;

/**
 * Resolves a `var(--mantine-color-<name>-<index>)` reference against the default palettes.
 */
const resolve = (reference: string): string => {
	const match = /^var\(--mantine-color-(gray|dark)-(\d+)\)$/.exec(reference);
	if (match === null) throw new Error(`Unexpected colour reference: ${reference}`);
	const palette = match[1] === "gray" ? gray : dark;
	return palette[Number(match[2])];
};

describe("bibgraphCssVariablesResolver", () => {
	const resolved = bibgraphCssVariablesResolver(DEFAULT_THEME);

	it("sets the dimmed colour for both schemes", () => {
		expect(resolved.light["--mantine-color-dimmed"]).toBe(DIMMED_COLOR_LIGHT);
		expect(resolved.dark["--mantine-color-dimmed"]).toBe(DIMMED_COLOR_DARK);
	});

	it("keeps dimmed text at or above AA contrast on light surfaces", () => {
		for (const surface of ["#ffffff", gray[0], gray[1]]) {
			expect(contrastRatio(resolve(DIMMED_COLOR_LIGHT), surface)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
		}
	});

	it("keeps dimmed text at or above AA contrast on dark surfaces", () => {
		for (const surface of [dark[7], dark[6]]) {
			expect(contrastRatio(resolve(DIMMED_COLOR_DARK), surface)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_RATIO);
		}
	});
});
