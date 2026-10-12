// @vitest-environment jsdom

/**
 * Component tests for the family badge: a novel algorithm and a baseline each announce their family in words, not colour alone.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlgorithmFamilyBadge } from "./AlgorithmFamilyBadge";

describe("AlgorithmFamilyBadge", () => {
	it("labels a novel algorithm as novel", () => {
		render(
			<MantineProvider>
				<AlgorithmFamilyBadge family="novel" />
			</MantineProvider>,
		);
		expect(screen.getByText("novel")).toBeInTheDocument();
	});

	it("labels a baseline algorithm as baseline", () => {
		render(
			<MantineProvider>
				<AlgorithmFamilyBadge family="baseline" />
			</MantineProvider>,
		);
		expect(screen.getByText("baseline")).toBeInTheDocument();
	});
});
