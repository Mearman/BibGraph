/**
 * Mantine's `styles` prop on a theme component applies plain inline style objects, so a nested selector key such as `&:hover` or `&:focus-visible` is not a CSS rule: React rejects it as an unsupported style property and the declaration never applies. State styling belongs in CSS (the global focus ring, Mantine's own variables), not in these objects.
 */

import { describe, expect, it } from "vitest";

import { mantineComponents } from "./mantine-components";

const nestedSelectorPaths = (value: unknown, path: string): string[] => {
	if (typeof value !== "object" || value === null) return [];
	return Object.entries(value).flatMap(([key, child]) => {
		const here = `${path}.${key}`;
		return key.startsWith("&") ? [here] : nestedSelectorPaths(child, here);
	});
};

describe("mantineComponents", () => {
	it("declares no nested selector keys in its inline style objects", () => {
		expect(nestedSelectorPaths(mantineComponents, "mantineComponents")).toEqual([]);
	});
});
