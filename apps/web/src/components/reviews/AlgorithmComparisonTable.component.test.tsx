// @vitest-environment jsdom

/**
 * Component tests for the algorithm comparison table: every stage lists every algorithm with its family, the suggested algorithm is marked, measured values and their evidence show, and the reviewer can override a stage's pick.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AlgorithmComparison, ComparisonRow } from "@/lib/algorithms/algorithm-comparison";
import type { AlgorithmStage } from "@/lib/algorithms/registry";

import { AlgorithmComparisonTable } from "./AlgorithmComparisonTable";

const row = (overrides: Partial<ComparisonRow> & Pick<ComparisonRow, "algorithmId" | "stage">): ComparisonRow => ({
	label: overrides.algorithmId,
	family: "baseline",
	description: "does a thing",
	value: null,
	evidence: "no measurement",
	chosen: false,
	...overrides,
});

const RECOVERED_ALL = 2;

const comparison: AlgorithmComparison = {
	exploration: [
		row({ algorithmId: "standard-bfs", stage: "exploration", family: "baseline", value: 1, evidence: "recovered 1 of 2 held-out seeds on this pool" }),
		row({ algorithmId: "dome", stage: "exploration", label: "DOME", family: "novel", value: RECOVERED_ALL, evidence: "recovered 2 of 2 held-out seeds on this pool", chosen: true }),
	],
	"seed-selection": [row({ algorithmId: "random", stage: "seed-selection" })],
	ranking: [row({ algorithmId: "association", stage: "ranking", label: "association (PARSE)", family: "novel", chosen: true })],
};

const renderTable = () => {
	const onChoose = vi.fn<(stage: AlgorithmStage, algorithmId: string) => void>();
	render(
		<MantineProvider>
			<AlgorithmComparisonTable comparison={comparison} onChoose={onChoose} />
		</MantineProvider>,
	);
	return onChoose;
};

describe("AlgorithmComparisonTable", () => {
	it("lists each stage's algorithms with family badges side by side", () => {
		renderTable();
		const exploration = screen.getByRole("region", { name: "Exploration" });
		expect(within(exploration).getByText("standard-bfs")).toBeInTheDocument();
		expect(within(exploration).getByText("DOME")).toBeInTheDocument();
		expect(within(exploration).getByText("baseline")).toBeInTheDocument();
		expect(within(exploration).getByText("novel")).toBeInTheDocument();
	});

	it("shows measured evidence and marks the suggested algorithm", () => {
		renderTable();
		const exploration = screen.getByRole("region", { name: "Exploration" });
		expect(within(exploration).getByText("recovered 2 of 2 held-out seeds on this pool")).toBeInTheDocument();
		expect(within(exploration).getAllByText("suggested")).toHaveLength(1);
	});

	it("lets the reviewer override a stage's pick", () => {
		const onChoose = renderTable();
		const exploration = screen.getByRole("region", { name: "Exploration" });
		fireEvent.click(within(exploration).getByRole("button", { name: "Use standard-bfs" }));
		expect(onChoose).toHaveBeenCalledWith("exploration", "standard-bfs");
	});
});
