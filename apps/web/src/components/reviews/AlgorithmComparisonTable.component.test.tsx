// @vitest-environment jsdom

/**
 * Component tests for the algorithm comparison table: each stage table is titled and labelled, measured values render with a bar and plain evidence, rows sort by value or name, the family filter narrows the roster, the in-use row is marked with aria-current, read-only stages are explained, the status column has a hidden header, names are row headers, and codenames wait for the technical toggle.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AlgorithmComparison } from "@/lib/algorithms/algorithm-comparison";
import type { AlgorithmStage } from "@/lib/algorithms/registry";

import { AlgorithmComparisonTable } from "./AlgorithmComparisonTable";

const EXPLORATION_EVIDENCE = "recovered 2 of 3 held-out seeds within a budget of 32 works";
const RANKING_EVIDENCE = "recovered 3 of 3 held-out seeds in the top 8 candidates";

const comparison: AlgorithmComparison = {
	exploration: [
		{
			algorithmId: "dome",
			label: "DOME",
			family: "novel",
			stage: "exploration",
			description: "Expands the highest-degree candidate next.",
			value: 2,
			evidence: EXPLORATION_EVIDENCE,
			chosen: true,
		},
		{
			algorithmId: "standard-bfs",
			label: "standard-bfs",
			family: "baseline",
			stage: "exploration",
			description: "Expands evenly outward from every seed in turn.",
			value: 3,
			evidence: EXPLORATION_EVIDENCE,
			chosen: false,
		},
	],
	"seed-selection": [],
	ranking: [
		{
			algorithmId: "association",
			label: "association",
			family: "novel",
			stage: "ranking",
			description: "Scores paths by structural association.",
			value: 3,
			evidence: RANKING_EVIDENCE,
			chosen: true,
		},
	],
};

const renderTable = (props: Partial<Parameters<typeof AlgorithmComparisonTable>[0]> = {}) => {
	const onChoose = vi.fn<(stage: AlgorithmStage, algorithmId: string) => void>();
	render(
		<MantineProvider>
			<AlgorithmComparisonTable
				comparison={comparison}
				inUse={{ exploration: "dome", "seed-selection": null, ranking: null }}
				onChoose={onChoose}
				readOnlyStages={["seed-selection"]}
				showTechnical={false}
				{...props}
			/>
		</MantineProvider>,
	);
	return { onChoose };
};

const explorationRegion = () => screen.getByRole("region", { name: "Exploration" });

describe("AlgorithmComparisonTable", () => {
	it("ties each table to its stage title and shows the plain description first, the codename only on the technical toggle", () => {
		const { onChoose } = renderTable();
		const exploration = explorationRegion();
		expect(exploration.querySelector("table")).toHaveAttribute("aria-labelledby", "algorithm-stage-exploration");
		expect(within(exploration).getByText("Expands the highest-degree candidate next.")).toBeInTheDocument();
		expect(within(exploration).queryByText("DOME")).not.toBeInTheDocument();
		renderTable({ onChoose, showTechnical: true });
		expect(screen.getByText("DOME")).toBeInTheDocument();
	});

	it("shows measured values with a bar and the evidence in reviewer words", () => {
		renderTable();
		const exploration = explorationRegion();
		expect(within(exploration).getAllByText("3")).not.toHaveLength(0);
		expect(within(exploration).getByText("2")).toBeInTheDocument();
		expect(exploration.querySelectorAll(".mantine-Progress-root")).not.toHaveLength(0);
		expect(
			within(exploration).getAllByText("Found 2 of 3 works we hid from it, exploring up to 32 works"),
		).not.toHaveLength(0);
		const ranking = screen.getByRole("region", { name: "Ranking" });
		expect(within(ranking).getAllByText("Found 3 of 3 works we hid from it in the first 8 results")).not.toHaveLength(0);
	});

	it("sorts by measured value when the header is pressed", () => {
		renderTable();
		const exploration = explorationRegion();
		const valueHeader = within(exploration).getByText("Measured on this review");
		const firstBefore = within(exploration).getAllByRole("row")[1];
		expect(within(firstBefore).getByText("Expands evenly outward from every seed in turn.")).toBeInTheDocument();
		fireEvent.click(valueHeader);
		const firstAfter = within(exploration).getAllByRole("row")[1];
		expect(within(firstAfter).getByText("Expands the highest-degree candidate next.")).toBeInTheDocument();
	});

	it("filters by family", () => {
		renderTable();
		fireEvent.click(screen.getByRole("radio", { name: "Baseline" }));
		const exploration = explorationRegion();
		expect(within(exploration).getByText("baseline")).toBeInTheDocument();
		expect(within(exploration).queryByText("novel")).not.toBeInTheDocument();
	});

	it("marks the in-use row and wires the override", () => {
		const { onChoose } = renderTable();
		const exploration = explorationRegion();
		const inUseRow = within(exploration).getByText("in use").closest("tr");
		expect(inUseRow).toHaveAttribute("aria-current", "true");
		fireEvent.click(within(exploration).getByRole("button", { name: "Use standard-bfs" }));
		expect(onChoose).toHaveBeenCalledWith("exploration", "standard-bfs");
	});

	it("explains a read-only stage and offers no switch there", () => {
		renderTable();
		const seedSelection = screen.getByRole("region", { name: "Seed selection" });
		expect(
			within(seedSelection).getByText("You supplied your own seeds, so this is for comparison only."),
		).toBeInTheDocument();
		expect(within(seedSelection).queryByRole("button", { name: /^Use / })).not.toBeInTheDocument();
	});

	it("gives the status column a hidden header and names row headers", () => {
		renderTable();
		const exploration = explorationRegion();
		expect(within(exploration).getByText("Status and action")).toBeInTheDocument();
		const domeName = within(exploration).getAllByText("Expands the highest-degree candidate next.")[0];
		expect(domeName.closest("th")).toHaveAttribute("scope", "row");
	});
});
