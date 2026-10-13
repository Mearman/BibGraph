// @vitest-environment jsdom

/**
 * Component tests for the family badge: the family name is spelled out in text and an icon differs between the families, so the marking never rests on colour alone.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlgorithmFamilyBadge } from "./AlgorithmFamilyBadge";

describe("AlgorithmFamilyBadge", () => {
	it("spells out each family in text, which survives greyscale", () => {
		render(
			<MantineProvider>
				<AlgorithmFamilyBadge family="novel" />
				<AlgorithmFamilyBadge family="baseline" />
			</MantineProvider>,
		);
		expect(screen.getByText("novel")).toBeInTheDocument();
		expect(screen.getByText("baseline")).toBeInTheDocument();
	});

	it("gives the two families different icons", () => {
		const novel = render(
			<MantineProvider>
				<AlgorithmFamilyBadge family="novel" />
			</MantineProvider>,
		);
		const baseline = render(
			<MantineProvider>
				<AlgorithmFamilyBadge family="baseline" />
			</MantineProvider>,
		);
		const novelIcon = novel.container.querySelector("svg");
		const baselineIcon = baseline.container.querySelector("svg");
		expect(novelIcon).not.toBeNull();
		expect(baselineIcon).not.toBeNull();
		expect(novelIcon?.outerHTML).not.toBe(baselineIcon?.outerHTML);
	});
});
