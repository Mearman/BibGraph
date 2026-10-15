// @vitest-environment jsdom

/**
 * Component tests for the review screen: the header summarises the review and lists the titled starting works, the plainly named tabs each screen their works, a decision confirms with an Undo that clears it and a failure is announced, the Decided view lists decided works, empty states are separated, evidence shows titles, load more reveals further rows, the measurement loads with its banner, codenames wait for the technical toggle and the comparison override notifies what re-ranks, and label failures offer a retry.
 */

import "@testing-library/jest-dom";

import { MantineProvider } from "@mantine/core";
import { Notifications,notifications } from "@mantine/notifications";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ReadyReviewSession } from "@/hooks/use-review-session";
import type { ScreeningPaging } from "@/hooks/use-screening-arrangement";
import type { ComparisonRow } from "@/lib/algorithms/algorithm-comparison";
import type { AlgorithmStage } from "@/lib/algorithms/registry";
import type { ScreeningRow } from "@/lib/reviews/screening-view";

import { ReviewScreen } from "./ReviewScreen";

/**
 * Keeps the generated ids of a long list clear of the fixture's W1 to W7.
 */
const EXTRA_WORK_ID_OFFSET = 10;

const explorationRows: readonly ComparisonRow[] = [
	{
		algorithmId: "dome",
		label: "DOME",
		family: "novel",
		stage: "exploration",
		description: "Expands the highest-degree candidate next.",
		value: 2,
		evidence: "recovered 2 of 2 held-out seeds within a budget of 32 works",
		chosen: true,
	},
	{
		algorithmId: "frontier-balanced",
		label: "frontier-balanced",
		family: "baseline",
		stage: "exploration",
		description: "Always expands the smallest frontier, keeping seeds' coverage even.",
		value: 1,
		evidence: "recovered 1 of 2 held-out seeds within a budget of 32 works",
		chosen: false,
	},
];

const selectionRows: readonly ComparisonRow[] = [
	{
		algorithmId: "grasp",
		label: "GRASP",
		family: "novel",
		stage: "seed-selection",
		description: "Clusters pool works on structural features and picks per cluster.",
		value: 0.5,
		evidence: "picks cover 2 of 4 pool works within one hop",
		chosen: true,
	},
];

const comparison = (overrides: Partial<Record<AlgorithmStage, readonly ComparisonRow[] | null>> = {}): Record<AlgorithmStage, readonly ComparisonRow[] | null> => ({
	exploration: explorationRows,
	"seed-selection": selectionRows,
	ranking: [],
	...overrides,
});

const semanticRow = (workId: string, title: string): ScreeningRow => ({
	workId,
	title,
	year: 2021,
	titleKnown: true,
	evidence: {
		score: 0.5,
		fromSeed: { id: "W1", title: "Seed one", known: true },
		via: [],
		seedsReaching: 2,
		seedCount: 2,
	},
	searchRank: null,
	otherPosition: 1,
	otherScore: null,
});

const standardRow = (workId: string, title: string): ScreeningRow => ({
	workId,
	title,
	year: 2020,
	titleKnown: true,
	evidence: null,
	searchRank: 1,
	otherPosition: 1,
	otherScore: 0.5,
});

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
	view: { seeds: ["W1", "W3"], semantic: [], standard: [], decided: [], includedCount: 1, excludedCount: 2 },
	semanticRows: [semanticRow("W2", "Bridge paper")],
	standardRows: [standardRow("W4", "Query paper")],
	decidedRows: [
		{ workId: "W7", title: "Decided paper", year: 2019, titleKnown: true, decision: "include" },
	],
	seedRefs: [
		{ id: "W1", title: "Seed one", known: true },
		{ id: "W3", title: "Seed three", known: true },
	],
	labelsPending: false,
	labelsError: null,
	retryLabels: () => undefined,
	comparison: comparison(),
	comparisonError: { exploration: null, "seed-selection": null, ranking: null },
	comparisonProgress: { exploration: null, "seed-selection": null, ranking: null },
	inUse: { exploration: "dome", "seed-selection": null, ranking: null },
	seedSelectionEditable: false,
	decide: vi.fn<ReadyReviewSession["decide"]>(async () => {
		await Promise.resolve();
	}),
	undo: vi.fn<ReadyReviewSession["undo"]>(async () => {
		await Promise.resolve();
	}),
	addSeed: vi.fn<ReadyReviewSession["addSeed"]>(async () => {
		await Promise.resolve();
	}),
	chooseAlgorithm: vi.fn<ReadyReviewSession["chooseAlgorithm"]>(async () => {
		await Promise.resolve();
	}),
	...overrides,
});

const renderScreen = (ready: ReadyReviewSession, paging?: ScreeningPaging) => {
	// The notification store is module-global: earlier tests' still-live notifications would fill its slot limit and leave this test's notification queued instead of shown.
	notifications.clean();
	const view = (next: ReadyReviewSession) => (
		<MantineProvider>
			<Notifications />
			<ReviewScreen session={next} paging={paging} />
		</MantineProvider>
	);
	const rendered = render(view(ready));
	return {
		rerender: (next: ReadyReviewSession): void => {
			rendered.rerender(view(next));
		},
	};
};

describe("ReviewScreen", () => {
	it("summarises the review and lists the titled starting works", () => {
		renderScreen(session());
		expect(screen.getByRole("heading", { name: "Malaria gut" })).toBeInTheDocument();
		expect(screen.getByText("malaria AND gut")).toBeInTheDocument();
		expect(screen.getByText("2 starting works, 1 included, 2 excluded")).toBeInTheDocument();
		expect(screen.getByText("Seed one")).toBeInTheDocument();
		expect(screen.getByText("Seed three")).toBeInTheDocument();
	});

	it("counts the starting works with inclusions folded in, matching the screening set", () => {
		renderScreen(
			session({
				review: {
					...session().review,
					seeds: ["W1", "W3"],
					decisions: { W7: "include" },
				},
				view: { ...session().view, seeds: ["W1", "W3", "W7"] },
				seedRefs: [
					{ id: "W1", title: "Seed one", known: true },
					{ id: "W3", title: "Seed three", known: true },
					{ id: "W7", title: "Decided paper", known: true },
				],
			}),
		);
		expect(screen.getByText("3 starting works, 1 included, 2 excluded")).toBeInTheDocument();
	});

	it("screens under plain tab names with a description each", () => {
		renderScreen(session());
		expect(screen.getByRole("tab", { name: /Related to my starting works/ })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /In search order/ })).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /Decided/ })).toBeInTheDocument();
		expect(screen.getByText("Works connected to your starting works, strongest first")).toBeInTheDocument();
	});

	it("shows titled evidence on the related list and records a decision with an undo that clears it", async () => {
		const ready = session();
		renderScreen(ready);
		expect(screen.getByText("Cited directly by Seed one")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Include Bridge paper" }));
		await waitFor(() => {
			expect(ready.decide).toHaveBeenCalledWith("W2", "include");
		});
		fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		await waitFor(() => {
			expect(ready.undo).toHaveBeenCalledWith("W2");
		});
	});

	it("announces a failed decision instead of dropping it", async () => {
		const ready = session({
			decide: vi.fn<ReadyReviewSession["decide"]>(async () => {
				await Promise.reject(new Error("storage offline"));
			}),
		});
		renderScreen(ready);
		fireEvent.click(screen.getByRole("button", { name: "Include Bridge paper" }));
		expect(await screen.findByText(/That decision was not saved: storage offline/)).toBeInTheDocument();
	});

	it("lists decided works under the Decided tab and changes a decision there", async () => {
		const ready = session();
		renderScreen(ready);
		fireEvent.click(screen.getByRole("tab", { name: /Decided/ }));
		expect(await screen.findByText("Decided paper")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Change decision for Decided paper" }));
		fireEvent.click(screen.getByRole("button", { name: "Exclude Decided paper" }));
		await waitFor(() => {
			expect(ready.decide).toHaveBeenCalledWith("W7", "exclude");
		});
	});

	it("offers the decided view when everything has been decided", () => {
		const ready = session({ semanticRows: [], standardRows: [] });
		renderScreen(ready);
		const openDecided = screen.getByRole("button", { name: "See decided works" });
		fireEvent.click(openDecided);
		expect(screen.getByRole("tab", { name: /Decided/ })).toHaveAttribute("aria-selected", "true");
	});

	it("loads more rows from a long list", () => {
		const paging: ScreeningPaging = { initial: 2, step: 2 };
		const many = Array.from({ length: 3 }, (_, index) => semanticRow(`W${String(index + EXTRA_WORK_ID_OFFSET)}`, `Paper ${String(index + 1)}`));
		renderScreen(session({ semanticRows: many }), paging);
		expect(screen.getByText("Showing 2 of 3")).toBeInTheDocument();
		expect(screen.queryByText("Paper 3")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Load more" }));
		expect(screen.getByText("Paper 3")).toBeInTheDocument();
		expect(screen.getByText("Showing 3 of 3")).toBeInTheDocument();
	});

	it("filters the list over titles", () => {
		const many = [
			semanticRow("W10", "Alpha paper"),
			semanticRow("W11", "Beta paper"),
		];
		renderScreen(session({ semanticRows: many }));
		fireEvent.change(screen.getByRole("textbox", { name: "Filter by title" }), { target: { value: "Beta" } });
		expect(screen.getByText("Beta paper")).toBeInTheDocument();
		expect(screen.queryByText("Alpha paper")).not.toBeInTheDocument();
	});

	it("shows the measurement loading per stage with role status and the re-rank banner", () => {
		renderScreen(session({ comparison: comparison({ exploration: null }) }));
		fireEvent.click(screen.getByRole("tab", { name: /Algorithms/ }));
		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByText(/Measuring the exploration algorithms/)).toBeInTheDocument();
		expect(screen.getByText(/may be re-ranked when the measurement finishes/)).toBeInTheDocument();
		// A stage whose measurement already exists keeps its table while another stage measures.
		expect(screen.getByRole("region", { name: "Seed selection" }).querySelector("table")).toBeInTheDocument();
	});

	it("keeps an unchanged stage's table on a stage switch instead of blanking it into a re-measure", () => {
		const ready = session();
		const { rerender } = renderScreen(ready);
		fireEvent.click(screen.getByRole("tab", { name: /Algorithms/ }));
		expect(screen.getByRole("region", { name: "Seed selection" }).querySelector("table")).toBeInTheDocument();
		// Switching the selector re-picks the seeds, so exploration and ranking re-measure; seed selection keeps its measured table.
		const switched = session({
			comparison: comparison({ exploration: null, ranking: null }),
			comparisonProgress: { exploration: { stage: "exploration",  algorithmId: "dome", done: 0, total: 9 }, "seed-selection": null, ranking: null },
		});
		rerender(switched);
		const selection = screen.getByRole("region", { name: "Seed selection" });
		expect(selection.querySelector("table")).toBeInTheDocument();
		expect(within(selection).queryByRole("status")).not.toBeInTheDocument();
		expect(within(selection).getByText("Clusters pool works on structural features and picks per cluster.")).toBeInTheDocument();
		const exploration = screen.getByRole("region", { name: "Exploration" });
		expect(within(exploration).getByRole("status")).toBeInTheDocument();
		// The technical toggle is off, so the progress counts without naming a codename.
		expect(within(exploration).getByText("1 of 9")).toBeInTheDocument();
		expect(within(exploration).queryByText(/DOME/)).not.toBeInTheDocument();
	});

	it("hides codenames behind the technical toggle and notifies what re-ranks on a switch", async () => {
		const ready = session();
		renderScreen(ready);
		fireEvent.click(screen.getByRole("tab", { name: /Algorithms/ }));
		const exploration = screen.getByRole("region", { name: "Exploration" });
		expect(within(exploration).queryByText("DOME")).not.toBeInTheDocument();
		// Plain mode: the override button names the algorithm by its description, and the notification carries no codename.
		fireEvent.click(
			within(exploration).getByRole("button", { name: "Use Always expands the smallest frontier, keeping seeds' coverage even." }),
		);
		await waitFor(() => {
			expect(ready.chooseAlgorithm).toHaveBeenCalledWith("exploration", "frontier-balanced");
		});
		expect(await screen.findByText(/Exploration algorithm switched\. Works related to your starting works will be re-ranked/)).toBeInTheDocument();
		expect(screen.queryByText(/now runs/)).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("switch", { name: /Technical details/ }));
		expect(within(exploration).getByText("DOME")).toBeInTheDocument();
		fireEvent.click(within(exploration).getByRole("button", { name: "Use frontier-balanced" }));
		await waitFor(() => {
			expect(ready.chooseAlgorithm).toHaveBeenCalledWith("exploration", "frontier-balanced");
		});
		expect(await screen.findByText(/Exploration now runs frontier-balanced/)).toBeInTheDocument();
	});

	it("offers a retry when titles fail to load", () => {
		const retryLabels = vi.fn<() => void>();
		renderScreen(session({ labelsError: "titles unavailable", retryLabels }));
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(retryLabels).toHaveBeenCalled();
	});

	it("shows a loading placeholder per starting work while the titles are still being fetched", () => {
		// Before the first label fetch lands, every seed is untitled; the ids must not be presented as works OpenAlex has no title for.
		renderScreen(
			session({
				labelsPending: true,
				seedRefs: [
					{ id: "W1", title: "W1", known: false },
					{ id: "W3", title: "W3", known: false },
				],
			}),
		);
		expect(screen.getAllByText("Loading...")).toHaveLength(2);
		expect(screen.queryByText(/no title from OpenAlex/)).not.toBeInTheDocument();
		expect(screen.queryByText("W1")).not.toBeInTheDocument();
	});

	it("keeps already fetched titles while a later label fetch is pending", () => {
		// A work added mid-review starts a further label fetch; the titles already held must stay on screen.
		renderScreen(
			session({
				labelsPending: true,
				seedRefs: [
					{ id: "W1", title: "Seed one", known: true },
					{ id: "W9", title: "W9", known: false },
				],
			}),
		);
		expect(screen.getByText("Seed one")).toBeInTheDocument();
		expect(screen.getByText("Loading...")).toBeInTheDocument();
		expect(screen.queryByText(/no title from OpenAlex/)).not.toBeInTheDocument();
	});

	it("keeps an add-a-work-by-id affordance beside the starting works after screening has started", async () => {
		// Decisions exist, so screening is under way: the transient check panel is long gone.
		const ready = session({
			review: { ...session().review, decisions: { W7: "include" } },
		});
		renderScreen(ready);
		const input = screen.getByRole("textbox", { name: "Add a starting work by OpenAlex id or link" });
		fireEvent.change(input, { target: { value: "https://openalex.org/W9" } });
		fireEvent.click(screen.getByRole("button", { name: "Add" }));
		await waitFor(() => {
			expect(ready.addSeed).toHaveBeenCalledWith("https://openalex.org/W9");
		});
	});

	it("announces a failed add instead of dropping it", async () => {
		const ready = session({
			addSeed: vi.fn<ReadyReviewSession["addSeed"]>(async () => {
				await Promise.reject(new Error("OpenAlex has no work with the id W9"));
			}),
		});
		renderScreen(ready);
		fireEvent.change(screen.getByRole("textbox", { name: "Add a starting work by OpenAlex id or link" }), {
			target: { value: "W9" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Add" }));
		await waitFor(() => {
			expect(ready.addSeed).toHaveBeenCalledWith("W9");
		});
		expect(await screen.findByText(/That work was not added: OpenAlex has no work with the id W9/)).toBeInTheDocument();
	});
});
