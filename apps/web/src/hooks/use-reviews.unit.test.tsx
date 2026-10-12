// @vitest-environment jsdom

/**
 * Unit tests for the reviews hook: it lists stored reviews, and starting a review runs the review service (zero-seeds or seed set), refreshes the list and hands back the created review. The service and the list query are injected fakes.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { StartedReview, StartReviewInput } from "@/lib/algorithms/review-service";
import type { LiteratureReview } from "@/stores/review-store";

import { type ReviewsDeps, useReviews } from "./use-reviews";

const review = (id: string): LiteratureReview => ({
	id,
	name: `Review ${id}`,
	query: "q",
	seeds: [],
	decisions: {},
	suggestedComposition: null,
	createdAt: new Date(0),
	updatedAt: new Date(0),
});

const makeDeps = () => {
	const stored: LiteratureReview[] = [review("a")];
	const start = vi.fn<(input: StartReviewInput) => Promise<StartedReview>>(async (input) => {
		await Promise.resolve();
		const created = review("b");
		stored.push(created);
		return { review: { ...created, name: input.name }, pool: [], composition: { exploration: null, ranking: null, seedSelection: null } };
	});
	const deps: ReviewsDeps = {
		listReviews: async () => {
			await Promise.resolve();
			return [...stored];
		},
		startReview: start,
	};
	return { deps, start };
};

const wrapper = ({ children }: { readonly children: ReactNode }) => {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useReviews", () => {
	it("lists the stored reviews", async () => {
		const { deps } = makeDeps();
		const { result } = renderHook(() => useReviews(deps), { wrapper });
		await waitFor(() => {
			expect(result.current.reviews.map((r) => r.id)).toEqual(["a"]);
		});
	});

	it("starts a review through the service and refreshes the list", async () => {
		const { deps, start } = makeDeps();
		const { result } = renderHook(() => useReviews(deps), { wrapper });
		await waitFor(() => {
			expect(result.current.reviews).toHaveLength(1);
		});
		let created: LiteratureReview | undefined;
		await act(async () => {
			created = await result.current.start({ name: "New", query: "q", seeds: [] });
		});
		expect(created?.id).toBe("b");
		expect(start).toHaveBeenCalledWith(expect.objectContaining({ name: "New", query: "q", seeds: [] }));
		await waitFor(() => {
			expect(result.current.reviews.map((r) => r.id)).toEqual(["a", "b"]);
		});
	});
});
