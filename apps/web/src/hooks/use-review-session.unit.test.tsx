// @vitest-environment jsdom

/**
 * Unit tests for the review session hook: it loads the review and its pool, derives labelled semantic and standard rows and the algorithm comparison, persists a decision and refreshes, and records a reviewer's algorithm override on the stored composition. The pool fetcher, label fetcher and review store are in-memory fakes, so no network or database is touched.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { suggestComposition } from "@/lib/algorithms/composition-engine";
import type { PoolFetcher } from "@/lib/algorithms/pool-loader";
import type { WorkLabel } from "@/lib/algorithms/work-labels";
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

const makeDeps = (): { deps: ReviewSessionDeps; stored: { current: LiteratureReview } } => {
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
		fetcher,
		fetchLabels: async () => {
			await Promise.resolve();
			return labels;
		},
		store: {
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
	return { deps, stored };
};

const wrapperFor = (client: QueryClient) =>
	({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const setup = () => {
	const { deps, stored } = makeDeps();
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const hook = renderHook(() => useReviewSession("r1", deps), { wrapper: wrapperFor(client) });
	return { hook, stored };
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
});
