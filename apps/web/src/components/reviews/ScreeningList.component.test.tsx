// @vitest-environment jsdom

/**
 * Component tests for the screening list: rows render as a list with position and set size, evidence is spelled out in titles (with unknown works marked), the seed-reach badge and score tooltip text appear, a decision reports out and moves focus to the next row with a polite announcement, i and x decide the focused row, unknown titles are marked, titles skeleton while loading, the count and Load more show, and each empty kind explains itself.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type EvidenceView, type LabelledRef, SCORE_DECIMALS, type ScreeningRow } from "@/lib/reviews/screening-view";

import { ScreeningList } from "./ScreeningList";

const DIRECT_SCORE = 0.412;
const BRIDGED_SCORE = 0.3;

const evidence = (score: number, seedsReaching: number, via: readonly LabelledRef[] = []): EvidenceView => ({
	score,
	fromSeed: { id: "W1", title: "Seed one", known: true },
	via,
	seedsReaching,
	seedCount: 2,
});

const rows: readonly ScreeningRow[] = [
	{
		workId: "W2",
		title: "Gut barrier in malaria",
		year: 2019,
		titleKnown: true,
		evidence: evidence(DIRECT_SCORE, 1),
		searchRank: null,
		otherPosition: 3,
		otherScore: null,
	},
	{
		workId: "W5",
		title: "Untitled survey",
		year: null,
		titleKnown: false,
		evidence: null,
		searchRank: 2,
		otherPosition: 1,
		otherScore: DIRECT_SCORE,
	},
	{
		workId: "W6",
		title: "Bridged paper",
		year: 2022,
		titleKnown: true,
		evidence: evidence(BRIDGED_SCORE, 2, [{ id: "W9", title: "Bridge paper", known: true }]),
		searchRank: null,
		otherPosition: null,
		otherScore: null,
	},
];

const renderList = (overrides: Partial<Parameters<typeof ScreeningList>[0]> = {}) => {
	const onDecide = vi.fn<(workId: string, decision: "include" | "exclude") => void>();
	const base: Parameters<typeof ScreeningList>[0] = {
		rows,
		total: rows.length,
		showing: rows.length,
		hasMore: false,
		onLoadMore: () => undefined,
		sort: "score",
		onSortChange: () => undefined,
		filter: "",
		onFilterChange: () => undefined,
		onDecide,
		otherTabName: "Related to my seeds",
		emptyState: { kind: "nothing-found", message: "Nothing left to screen." },
		titlesPending: false,
	};
	render(
		<MantineProvider>
			<ScreeningList {...base} {...overrides} />
		</MantineProvider>,
	);
	return { onDecide, base };
};

describe("ScreeningList", () => {
	it("renders rows as list items with position and set size, title, year and titled evidence", () => {
		renderList();
		const first = screen.getAllByRole("listitem")[0];
		expect(first).toHaveAttribute("aria-posinset", "1");
		expect(first).toHaveAttribute("aria-setsize", "3");
		expect(screen.getByText("2019")).toBeInTheDocument();
		expect(screen.getByText("Cited directly by Seed one")).toBeInTheDocument();
		expect(screen.getByText("Seed one -> Bridge paper -> this work")).toBeInTheDocument();
	});

	it("shows the match score and the seed-reach badge", () => {
		renderList();
		expect(screen.getByText(`Match ${DIRECT_SCORE.toFixed(SCORE_DECIMALS)}`)).toBeInTheDocument();
		expect(screen.getByText("1 of 2 seeds reach this")).toBeInTheDocument();
	});

	it("marks a work whose title never arrived instead of showing a bare id as a title", () => {
		renderList();
		expect(screen.getByText(/no title from OpenAlex/)).toBeInTheDocument();
	});

	it("skeletons titles while they load", () => {
		renderList({ titlesPending: true });
		expect(screen.queryByText("Gut barrier in malaria")).not.toBeInTheDocument();
	});

	it("reports a decision, moves focus to the next row and announces it politely", () => {
		const { onDecide } = renderList();
		const include = screen.getByRole("button", { name: "Include Gut barrier in malaria" });
		fireEvent.click(include);
		expect(onDecide).toHaveBeenCalledWith("W2", "include");
		const second = screen.getAllByRole("listitem")[1];
		expect(second).toHaveFocus();
		expect(screen.getByText("Included Gut barrier in malaria")).toBeInTheDocument();
	});

	it("decides the focused row with i and x", () => {
		const { onDecide } = renderList();
		const first = screen.getAllByRole("listitem")[0];
		first.focus();
		fireEvent.keyDown(document.body, { key: "i", code: "KeyI" });
		expect(onDecide).toHaveBeenCalledWith("W2", "include");
		fireEvent.keyDown(document.body, { key: "x", code: "KeyX" });
		expect(onDecide).toHaveBeenCalledWith("W2", "exclude");
	});

	it("shows the cross-list note on works that appear in both", () => {
		renderList();
		expect(screen.getByText("Also result 3 from your search")).toBeInTheDocument();
		expect(
			screen.getByText(`Also 1st in Related to my seeds (Match ${DIRECT_SCORE.toFixed(SCORE_DECIMALS)})`),
		).toBeInTheDocument();
	});

	it("expands the evidence panel with the seed-reach sentence", () => {
		renderList();
		fireEvent.click(screen.getAllByRole("button", { name: /Show evidence/ })[0]);
		expect(screen.getByText("1 of 2 starting works reach this work.")).toBeInTheDocument();
		expect(screen.getByText(/average strength of the best path/)).toBeInTheDocument();
	});

	it("shows how many rows are visible and loads more", () => {
		const onLoadMore = vi.fn<() => void>();
		renderList({ total: 12, showing: 2, hasMore: true, onLoadMore });
		expect(screen.getByText("Showing 2 of 12")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Load more" }));
		expect(onLoadMore).toHaveBeenCalled();
	});

	it("explains an empty list per kind and offers the decided view when all is decided", () => {
		renderList({ rows: [], total: 0, showing: 0, hasMore: false });
		expect(screen.getByText("Nothing left to screen.")).toBeInTheDocument();
		const onOpenDecided = vi.fn<() => void>();
		renderList({
			rows: [],
			total: 0,
			showing: 0,
			hasMore: false,
			emptyState: { kind: "all-decided", onOpenDecided },
		});
		fireEvent.click(screen.getByRole("button", { name: "See decided works" }));
		expect(onOpenDecided).toHaveBeenCalled();
		renderList({
			rows: [],
			total: 5,
			showing: 0,
			hasMore: false,
			emptyState: { kind: "filtered" },
		});
		expect(screen.getByText("No works match your filter.")).toBeInTheDocument();
	});
});
