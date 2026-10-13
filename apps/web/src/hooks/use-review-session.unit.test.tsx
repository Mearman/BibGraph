// @vitest-environment jsdom

/**
 * Unit tests for the review session hook: it loads the review and its pool, derives labelled rows (both paths, the decided works, the seeds) and the algorithm comparison, persists a decision and refreshes, undoes one, surfaces and retries a label failure, and records a reviewer's algorithm override on the stored composition. The pool fetcher, label fetcher and review store are in-memory fakes, so no network or database is touched.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { defaultComposition, suggestComposition } from "@/lib/algorithms/composition-engine";
import type { PoolFetcher } from "@/lib/algorithms/pool-loader";
import type { WorkLabel } from "@/lib/algorithms/work-labels";
import { createReviewCompute, handleCompute } from "@/lib/reviews/compute-handler";
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

const makeDeps = (savedPool?: readonly { id: string; references: readonly string[] }[], fetchLabelsOverride?: ReviewSessionDeps["fetchLabels"]): { deps: ReviewSessionDeps; stored: { current: LiteratureReview }; searches: { count: number }; pool: { current: readonly { id: string; references: readonly string[] }[] | undefined } } => {
	const searches = { count: 0 };
	const pool: { current: readonly { id: string; references: readonly string[] }[] | undefined } = { current: savedPool };
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
			return handleCompute(request);
		}),
		fetcher: {
			search: async (query) => {
				searches.count++;
				return fetcher.search(query);
			},
			byIds: async (ids) => fetcher.byIds(ids),
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
	return { deps, stored, searches, pool };
};

const wrapperFor = (client: QueryClient) =>
	({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const setup = (mutate?: (review: LiteratureReview) => LiteratureReview) => {
	const { deps, stored, searches, pool } = makeDeps();
	if (mutate) stored.current = mutate(stored.current);
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const hook = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
	return { hook, stored, searches, pool };
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
			expect(current.comparisonError).toBeNull();
			expect(current.comparison).not.toBeNull();
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
});
