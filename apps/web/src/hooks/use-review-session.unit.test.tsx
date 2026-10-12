// @vitest-environment jsdom

/**
 * Unit tests for the review session hook: it loads the review and its pool, derives labelled semantic and standard rows and the algorithm comparison, persists a decision and refreshes, and records a reviewer's algorithm override on the stored composition. The pool fetcher, label fetcher and review store are in-memory fakes, so no network or database is touched.
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

const makeDeps = (savedPool?: readonly { id: string; references: readonly string[] }[]): { deps: ReviewSessionDeps; stored: { current: LiteratureReview }; searches: { count: number }; pool: { current: readonly { id: string; references: readonly string[] }[] | undefined } } => {
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
		fetchLabels: async () => {
			await Promise.resolve();
			return labels;
		},
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
});
