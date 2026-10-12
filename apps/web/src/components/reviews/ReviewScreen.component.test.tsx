// @vitest-environment jsdom

/**
 * Component tests for the review screen: the header summarises the review, both screening paths list their rows and record decisions, and the algorithms tab shows the family-marked comparison (or its measuring and failure states) with the reviewer override wired through.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReadyReviewSession } from "@/hooks/use-review-session";
import type { AlgorithmComparison } from "@/lib/algorithms/algorithm-comparison";

import { ReviewScreen } from "./ReviewScreen";

const comparison: AlgorithmComparison = {
	exploration: [
		{ algorithmId: "dome", label: "DOME", family: "novel", stage: "exploration", description: "d", value: 2, evidence: "recovered 2 of 2", chosen: true },
	],
	"seed-selection": [],
	ranking: [],
};

const session = (overrides: Partial<ReadyReviewSession> = {}): ReadyReviewSession => ({
	phase: "ready",
	review: {
		id: "r1",
		name: "Malaria gut",
		query: "malaria AND gut",
		seeds: ["W1", "W3"],
		decisions: {},
		suggestedComposition: null,
		createdAt: new Date(0),
		updatedAt: new Date(0),
	},
	view: { seeds: ["W1", "W3"], semantic: [], standard: [], includedCount: 1, excludedCount: 2 },
	semanticRows: [{ workId: "W2", title: "Bridge paper", year: 2021, detail: "Association 0.500, direct" }],
	standardRows: [{ workId: "W4", title: "Query paper", year: 2020, detail: "Query rank 1" }],
	comparison,
	comparisonError: null,
	inUse: { exploration: "dome", "seed-selection": null, ranking: null },
	seedSelectionEditable: false,
	decide: vi.fn<ReadyReviewSession["decide"]>(async () => {
		await Promise.resolve();
	}),
	chooseAlgorithm: vi.fn<ReadyReviewSession["chooseAlgorithm"]>(async () => {
		await Promise.resolve();
	}),
	...overrides,
});

const renderScreen = (ready: ReadyReviewSession) => {
	render(
		<MantineProvider>
			<ReviewScreen session={ready} />
		</MantineProvider>,
	);
};

describe("ReviewScreen", () => {
	it("summarises the review and its decisions", () => {
		renderScreen(session());
		expect(screen.getByRole("heading", { name: "Malaria gut" })).toBeInTheDocument();
		expect(screen.getByText("malaria AND gut")).toBeInTheDocument();
		expect(screen.getByText("2 seeds, 1 included, 2 excluded")).toBeInTheDocument();
	});

	it("lists the semantic rows and records a decision", () => {
		const ready = session();
		renderScreen(ready);
		expect(screen.getByText("Bridge paper")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Include Bridge paper" }));
		expect(ready.decide).toHaveBeenCalledWith("W2", "include");
	});

	it("lists the standard rows under their own tab", () => {
		renderScreen(session());
		fireEvent.click(screen.getByRole("tab", { name: "Standard screening" }));
		expect(screen.getByText("Query paper")).toBeInTheDocument();
	});

	it("shows the family-marked comparison and wires the override", () => {
		const ready = session();
		renderScreen(ready);
		fireEvent.click(screen.getByRole("tab", { name: "Algorithms" }));
		const exploration = screen.getByRole("region", { name: "Exploration" });
		expect(within(exploration).getByText("novel")).toBeInTheDocument();
		expect(within(exploration).getByText("recovered 2 of 2")).toBeInTheDocument();
	});

	it("says the comparison is being measured while it is null", () => {
		renderScreen(session({ comparison: null }));
		fireEvent.click(screen.getByRole("tab", { name: "Algorithms" }));
		expect(screen.getByText("Measuring every algorithm on this review's works...")).toBeInTheDocument();
	});

	it("shows why the comparison failed", () => {
		renderScreen(session({ comparison: null, comparisonError: "pool for review r1 is not loaded" }));
		fireEvent.click(screen.getByRole("tab", { name: "Algorithms" }));
		expect(screen.getByText("pool for review r1 is not loaded")).toBeInTheDocument();
	});
});
