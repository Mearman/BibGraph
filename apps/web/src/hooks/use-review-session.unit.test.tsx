// @vitest-environment jsdom

/**
 * Unit tests for the review session hook: it loads the review and its pool, derives labelled rows (both paths, the decided works, the seeds) and the algorithm comparison, persists a decision and refreshes, undoes one, surfaces and retries a label failure, and records a reviewer's algorithm override on the stored composition. The pool fetcher, label fetcher and review store are in-memory fakes, so no network or database is touched.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { defaultComposition, suggestComposition } from "@/lib/algorithms/composition-engine";
import type { PoolFetcher } from "@/lib/algorithms/pool-loader";
import type { WorkLabel } from "@/lib/algorithms/work-labels";
import { createReviewCompute, handleCompute } from "@/lib/reviews/compute-handler";
import type { MeasurementRecord } from "@/lib/reviews/measurement-cache";
import type { LiteratureReview, ScreeningDecision } from "@/stores/review-store";

import { type ReviewSessionDeps, useReviewSession } from "./use-review-session";

const SELECTION_SIZE = 5;

const work = (id: string, references: readonly string[]) => ({ id, referenced_works: references });

const fetcher: PoolFetcher = {
	search: async () => {
		await Promise.resolve();
		return [work("W1", []), work("W2", ["W1", "W3"]), work("W3", []), work("W4", ["W2"])];
	},
	byIds: async () => {
		await Promise.resolve();
		return [];
	},
};

/**
 * Counts of measure requests per stage, so tests can assert which stages re-measured.
 */
interface MeasureCounts {
	exploration: number;
	"seed-selection": number;
	ranking: number;
}

const makeDeps = (
	savedPool?: readonly { id: string; references: readonly string[] }[],
	fetchLabelsOverride?: ReviewSessionDeps["fetchLabels"],
	savedMeasurements?: { current: readonly MeasurementRecord[] },
	byIdsOverride?: PoolFetcher["byIds"],
): {
	deps: ReviewSessionDeps;
	stored: { current: LiteratureReview };
	searches: { count: number };
	pool: { current: readonly { id: string; references: readonly string[] }[] | undefined };
	measurements: { current: readonly MeasurementRecord[] };
	measured: { current: MeasureCounts };
} => {
	const searches = { count: 0 };
	const pool: { current: readonly { id: string; references: readonly string[] }[] | undefined } = { current: savedPool };
	const measurements = savedMeasurements ?? { current: [] as readonly MeasurementRecord[] };
	const measured: { current: MeasureCounts } = { current: { exploration: 0, "seed-selection": 0, ranking: 0 } };
	const poolForComposition = [
		{ id: "W1", references: [] },
		{ id: "W2", references: ["W1", "W3"] },
		{ id: "W3", references: [] },
		{ id: "W4", references: ["W2"] },
	];
	const stored = {
		current: {
			id: "r1",
			name: "r",
			query: "q",
			seeds: ["W1", "W3"],
			decisions: {} as Record<string, ScreeningDecision | undefined>,
			suggestedComposition: suggestComposition(poolForComposition, ["W1", "W3"], { selectionSize: SELECTION_SIZE }),
			createdAt: new Date(0),
			updatedAt: new Date(0),
		} satisfies LiteratureReview,
	};
	const labels = new Map<string, WorkLabel>([["W2", { title: "Bridge paper", year: 2021 }]]);
	const deps: ReviewSessionDeps = {
		compute: createReviewCompute(async (request) => {
			await Promise.resolve();
			if (request.kind === "measure-exploration") measured.current.exploration++;
			if (request.kind === "measure-selection") measured.current["seed-selection"]++;
			if (request.kind === "measure-ranking") measured.current.ranking++;
			return handleCompute(request);
		}),
		fetcher: {
			search: async (query) => {
				searches.count++;
				return fetcher.search(query);
			},
			byIds: async (ids) => (byIdsOverride ?? fetcher.byIds)(ids),
		},
		fetchLabels:
			fetchLabelsOverride ??
			(async () => {
				await Promise.resolve();
				return labels;
			}),
		store: {
			getPool: async () => {
				await Promise.resolve();
				return pool.current;
			},
			savePool: async (_id, saved) => {
				await Promise.resolve();
				pool.current = saved;
			},
			getMeasurements: async () => {
				await Promise.resolve();
				return measurements.current;
			},
			saveMeasurements: async (_id, cells) => {
				await Promise.resolve();
				const byKey = new Map(measurements.current.map((cell) => [cell.key, cell]));
				for (const cell of cells) byKey.set(cell.key, cell);
				measurements.current = [...byKey.values()];
			},
			getReview: async () => {
				await Promise.resolve();
				return stored.current;
			},
			setDecision: async (_id, workId, decision) => {
				await Promise.resolve();
				stored.current = { ...stored.current, decisions: { ...stored.current.decisions, [workId]: decision } };
			},
			clearDecision: async (_id, workId) => {
				await Promise.resolve();
				const decisions = Object.fromEntries(
					Object.entries(stored.current.decisions).filter(([key]) => key !== workId),
				);
				stored.current = { ...stored.current, decisions };
			},
			updateReview: async (_id, patch) => {
				await Promise.resolve();
				stored.current = { ...stored.current, ...patch };
			},
		},
	};
	return { deps, stored, searches, pool, measurements, measured };
};

const wrapperFor = (client: QueryClient) =>
	({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const setup = (mutate?: (review: LiteratureReview) => LiteratureReview) => {
	const { deps, stored, searches, pool, measurements, measured } = makeDeps();
	if (mutate) stored.current = mutate(stored.current);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const hook = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
	return { hook, stored, searches, pool, measurements, measured };
};

describe("useReviewSession", () => {
	it("loads labelled semantic and standard rows and the comparison", async () => {
		const { hook } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		await waitFor(() => {
			expect(session.semanticRows.length).toBeGreaterThan(0);
		});
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.comparisonError.exploration).toBeNull();
			expect(current.comparison.exploration).not.toBeNull();
			expect(current.semanticRows.find((row) => row.workId === "W2")?.title).toBe("Bridge paper");
		});
	});

	it("persists a decision and removes the work from the screening lists", async () => {
		const { hook, stored } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		await act(async () => {
			await session.decide("W2", "exclude");
		});
		expect(stored.current.decisions.W2).toBe("exclude");
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.standardRows.map((row) => row.workId)).not.toContain("W2");
		});
	});

	it("records a reviewer override on the stored composition", async () => {
		const { hook, stored } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		await act(async () => {
			await session.chooseAlgorithm("exploration", "dome");
		});
		expect(stored.current.suggestedComposition?.exploration?.algorithmId).toBe("dome");
		expect(stored.current.suggestedComposition?.exploration?.evidence).toContain("chosen by reviewer");
	});

	it("replaces the starting defaults with the measured best once the comparison arrives", async () => {
		const { hook, stored } = setup((review) => ({ ...review, suggestedComposition: defaultComposition(null) }));
		await waitFor(() => {
			expect(stored.current.suggestedComposition?.exploration?.evidence).not.toContain("default");
		});
		expect(stored.current.suggestedComposition?.exploration?.chosenBy).toBe("app");
		expect(hook.result.current.phase).toBe("ready");
	});

	it("keeps a reviewer override when the comparison arrives", async () => {
		const override = { algorithmId: "dome", evidence: "chosen by reviewer", chosenBy: "reviewer" as const };
		const { hook, stored } = setup((review) => ({
			...review,
			suggestedComposition: { ...defaultComposition(null), exploration: override },
		}));
		await waitFor(() => {
			expect(stored.current.suggestedComposition?.ranking?.evidence).toContain("three or more seeds");
		});
		expect(stored.current.suggestedComposition?.exploration).toEqual(override);
		expect(hook.result.current.phase).toBe("ready");
	});

	it("fetches the pool once, then reads the saved snapshot", async () => {
		const first = setup();
		await waitFor(() => {
			expect(first.hook.result.current.phase).toBe("ready");
		});
		expect(first.searches.count).toBe(1);
		expect(first.pool.current).toBeDefined();
		first.hook.unmount();
		const reopened = makeDeps(first.pool.current);
		const second = renderHook(() => useReviewSession("r1", reopened.deps), {
			wrapper: wrapperFor(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
		});
		await waitFor(() => {
			expect(second.result.current.phase).toBe("ready");
		});
		expect(reopened.searches.count).toBe(0);
	});

	it("re-picks the seeds when the reviewer switches the selector of a zero-seeds review", async () => {
		const selection = { algorithmId: "grasp", evidence: "picked at start", chosenBy: "app" as const };
		const { hook, stored } = setup((review) => ({
			...review,
			suggestedComposition: defaultComposition(selection),
		}));
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		expect(session.seedSelectionEditable).toBe(true);
		await act(async () => {
			await session.chooseAlgorithm("seed-selection", "high-degree");
		});
		expect(stored.current.suggestedComposition?.seedSelection?.algorithmId).toBe("high-degree");
		expect(stored.current.suggestedComposition?.seedSelection?.chosenBy).toBe("reviewer");
		// high-degree picks the most connected works, W2 first in this pool, so the seeds change.
		expect(stored.current.seeds[0]).toBe("W2");
	});

	it("reuses stored measurements when the review is reopened, without measuring again", async () => {
		const first = setup();
		await waitFor(() => {
			expect(first.hook.result.current.phase).toBe("ready");
		});
		await waitFor(() => {
			const current = first.hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.comparison["seed-selection"]).not.toBeNull();
		});
		expect(first.measured.current).toEqual({ exploration: 1, "seed-selection": 1, ranking: 1 });
		expect(first.measurements.current.length).toBeGreaterThan(0);
		first.hook.unmount();
		// A reopen shares the persisted measurements but starts with an empty in-memory query cache, like a reload.
		const reopened = makeDeps(first.pool.current, undefined, first.measurements);
		const second = renderHook(() => useReviewSession("r1", reopened.deps), {
			wrapper: wrapperFor(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
		});
		await waitFor(() => {
			const current = second.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.comparison.exploration).not.toBeNull();
			expect(current.comparison["seed-selection"]).not.toBeNull();
			expect(current.comparison.ranking).not.toBeNull();
		});
		expect(reopened.measured.current).toEqual({ exploration: 0, "seed-selection": 0, ranking: 0 });
	});

	it("re-measures only the seed-dependent stages when the selector switch re-picks the seeds", async () => {
		const selection = { algorithmId: "grasp", evidence: "picked at start", chosenBy: "app" as const };
		const { hook, measured } = setup((review) => ({
			...review,
			suggestedComposition: defaultComposition(selection),
		}));
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.comparison.exploration).not.toBeNull();
			expect(current.comparison["seed-selection"]).not.toBeNull();
			expect(current.comparison.ranking).not.toBeNull();
		});
		expect(measured.current).toEqual({ exploration: 1, "seed-selection": 1, ranking: 1 });
		await act(async () => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			await current.chooseAlgorithm("seed-selection", "high-degree");
		});
		// The new seeds re-measure exploration and ranking; seed selection is measured on the pool alone, so it neither re-measures nor blanks.
		await waitFor(() => {
			expect(measured.current).toEqual({ exploration: 2, "seed-selection": 1, ranking: 2 });
		});
		const current = hook.result.current;
		if (current.phase !== "ready") throw new Error("not ready");
		expect(current.comparison.exploration).not.toBeNull();
		expect(current.comparison["seed-selection"]).not.toBeNull();
		expect(current.comparison.ranking).not.toBeNull();
	});

	it("undoes a decision so the work returns to the screening lists", async () => {
		const { hook, stored } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		await act(async () => {
			await session.decide("W2", "exclude");
		});
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.decidedRows.map((row) => row.workId)).toEqual(["W2"]);
		});
		await act(async () => {
			await session.undo("W2");
		});
		expect(stored.current.decisions.W2).toBeUndefined();
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			expect(current.standardRows.map((row) => row.workId)).toContain("W2");
			expect(current.decidedRows).toEqual([]);
		});
	});

	it("exposes a label failure with a retry that recovers", async () => {
		let failures = 0;
		const labels = new Map<string, WorkLabel>([["W2", { title: "Bridge paper", year: 2021 }]]);
		const fetchLabels = async (): Promise<ReadonlyMap<string, WorkLabel>> => {
			await Promise.resolve();
			failures++;
			if (failures === 1) throw new Error("titles unavailable");
			return labels;
		};
		const { deps } = makeDeps(undefined, fetchLabels);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
		await waitFor(() => {
			expect(result.current.phase).toBe("ready");
		});
		await waitFor(() => {
			if (result.current.phase !== "ready") throw new Error("not ready");
			expect(result.current.labelsError).toBe("titles unavailable");
			expect(result.current.semanticRows.find((row) => row.workId === "W2")?.title).toBe("W2");
		});
		act(() => {
			if (result.current.phase === "ready") result.current.retryLabels();
		});
		await waitFor(() => {
			if (result.current.phase !== "ready") throw new Error("not ready");
			expect(result.current.labelsError).toBeNull();
			expect(result.current.semanticRows.find((row) => row.workId === "W2")?.title).toBe("Bridge paper");
		});
	});

	it("lists the seeds and the decided works with titles", async () => {
		const { hook, stored } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		await act(async () => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			await current.decide("W4", "include");
		});
		expect(stored.current.decisions.W4).toBe("include");
		await waitFor(() => {
			const current = hook.result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			// Including W4 folds it into the seeds the ranking runs from.
			expect(current.seedRefs.map((seed) => seed.id)).toEqual(["W1", "W3", "W4"]);
			const decided = current.decidedRows.find((row) => row.workId === "W4");
			expect(decided?.decision).toBe("include");
			expect(decided?.titleKnown).toBe(false);
		});
	});

	it("does not offer a selector switch for a review whose seeds were supplied", async () => {
		const { hook } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		expect(session.seedSelectionEditable).toBe(false);
		await expect(act(async () => session.chooseAlgorithm("seed-selection", "grasp"))).rejects.toThrow("seeds were supplied");
	});

	it("adds a starting work mid-review, fetching it into the pool when the pool missed it", async () => {
		const known = async (ids: readonly string[]) => {
			await Promise.resolve();
			return ids.map((id) => work(id, ["W2"]));
		};
		const { deps, stored, pool } = makeDeps(undefined, undefined, undefined, known);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
		await waitFor(() => {
			expect(result.current.phase).toBe("ready");
		});
		await act(async () => {
			const current = result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			await current.addSeed("W9");
		});
		expect(stored.current.seeds).toContain("W9");
		expect(pool.current?.map((saved) => saved.id)).toContain("W9");
		await waitFor(() => {
			const current = result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			// The added work joins the set the ranking runs from, like an inclusion does.
			expect(current.seedRefs.map((seed) => seed.id)).toContain("W9");
		});
	});

	it("adds a starting work that already sits in the pool without fetching it", async () => {
		const byIds = vi.fn(async () => {
			await Promise.resolve();
			return [] as readonly { id: string; referenced_works: readonly string[] }[];
		});
		const { deps, stored } = makeDeps(undefined, undefined, undefined, byIds);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
		await waitFor(() => {
			expect(result.current.phase).toBe("ready");
		});
		await act(async () => {
			const current = result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			// W2 is in the pool already (a query result), so no lookup is needed.
			await current.addSeed("W2");
		});
		expect(stored.current.seeds).toContain("W2");
		expect(byIds).not.toHaveBeenCalled();
	});

	it("accepts an OpenAlex link as the added work's token", async () => {
		const known = async (ids: readonly string[]) => {
			await Promise.resolve();
			return ids.map((id) => work(id, ["W2"]));
		};
		const { deps, stored } = makeDeps(undefined, undefined, undefined, known);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
		await waitFor(() => {
			expect(result.current.phase).toBe("ready");
		});
		await act(async () => {
			const current = result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			await current.addSeed("https://openalex.org/W9");
		});
		expect(stored.current.seeds).toContain("W9");
	});

	it("rejects a token that is not an OpenAlex work id and stores nothing", async () => {
		const { hook, stored } = setup();
		await waitFor(() => {
			expect(hook.result.current.phase).toBe("ready");
		});
		const session = hook.result.current;
		if (session.phase !== "ready") throw new Error("not ready");
		await expect(session.addSeed("nonsense")).rejects.toThrow(/is not an OpenAlex work id/);
		expect(stored.current.seeds).toEqual(["W1", "W3"]);
	});

	it("rejects a work OpenAlex does not know", async () => {
		const { deps } = makeDeps();
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const { result } = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
		await waitFor(() => {
			expect(result.current.phase).toBe("ready");
		});
		await act(async () => {
			const current = result.current;
			if (current.phase !== "ready") throw new Error("not ready");
			await expect(current.addSeed("W9")).rejects.toThrow(/OpenAlex has no work with the id W9/);
		});
	});
});
