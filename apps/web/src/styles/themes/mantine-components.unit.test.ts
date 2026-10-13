/**
 * Mantine's `styles` prop on a theme component applies plain inline style objects, so a nested selector key such as `&:hover`, `&:focus-visible` or `[data-open]` is not a CSS rule: React rejects it as an unsupported style property and the declaration never applies. State styling belongs in CSS (the global focus ring, Mantine's own variables), not in these objects.
 *
 * An inline `padding` shorthand on an input also overrides Mantine's `--input-padding-inline-start`, which is what makes room for a left section (icon), so the icon renders over the text.
 */

import { describe, expect, it } from "vitest";

import { mantineComponents } from "./mantine-components";
import { radixComponents } from "./radix-components";
import { shadcnComponents } from "./shadcn-components";

const SELECTOR_KEY = /^[&[:.>]/;

const nestedSelectorPaths = (value: unknown, path: string): string[] => {
	if (typeof value !== "object" || value === null) return [];
	return Object.entries(value).flatMap(([key, child]) => {
		const here = `${path}.${key}`;
		return SELECTOR_KEY.test(key) ? [here] : nestedSelectorPaths(child, here);
	});
};

const componentSets = {
	mantineComponents,
	radixComponents,
	shadcnComponents,
};

const inputStyleKeys = ["Input", "Select"] as const;

const inputSlotStyles = (components: object, name: string): unknown => {
	const component: unknown = Object.entries(components).find(([key]) => key === name)?.[1];
	if (typeof component !== "object" || component === null || !("styles" in component)) return undefined;
	const { styles } = component;
	return typeof styles === "object" && styles !== null && "input" in styles ? styles.input : undefined;
};

describe.each(Object.entries(componentSets))("%s", (setName, components) => {
	it("declares no nested selector keys in its inline style objects", () => {
		expect(nestedSelectorPaths(components, setName)).toEqual([]);
	});

	it.each(inputStyleKeys)("leaves %s padding to Mantine so left sections get room", (name) => {
		const slot = inputSlotStyles(components, name);
		expect(slot).toBeTypeOf("object");
		expect(slot).not.toHaveProperty("padding");
		expect(slot).not.toHaveProperty("paddingLeft");
		expect(slot).not.toHaveProperty("paddingInlineStart");
	});

	it("does not override the AppShell header height or padding", () => {
		const appShell: unknown = Object.entries(components).find(([key]) => key === "AppShell")?.[1];
		expect(nestedSelectorPaths(appShell, "AppShell")).toEqual([]);
		const serialised = JSON.stringify(appShell);
		expect(serialised).not.toContain("--header-height");
		expect(serialised).not.toContain("--header-padding");
	});
});
