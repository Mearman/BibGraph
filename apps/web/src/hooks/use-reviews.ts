/**
 * Reviews hook: the list of stored reviews and the start action behind the reviews screen. Starting a review runs the review service (which loads the pool, measures the composition and, for a zero-seeds start, picks the seeds), then refreshes the list. I/O arrives through the injected deps.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { StartedReview, StartReviewInput } from "@/lib/algorithms/review-service";
import { ZERO_SEEDS_SELECTION_SIZE } from "@/lib/reviews/review-constants";
import type { LiteratureReview } from "@/stores/review-store";

export interface ReviewsDeps {
	readonly listReviews: () => Promise<LiteratureReview[]>;
	readonly startReview: (input: StartReviewInput) => Promise<StartedReview>;
}

export interface StartReviewValues {
	readonly name: string;
	readonly query: string;
	readonly seeds: readonly string[];
}

export interface UseReviewsResult {
	readonly reviews: readonly LiteratureReview[];
	readonly loading: boolean;
	readonly error: string | null;
	readonly starting: boolean;
	readonly startError: string | null;
	readonly start: (values: StartReviewValues) => Promise<LiteratureReview>;
}

const REVIEWS_KEY = ["reviews"];

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : "unknown error");

export const useReviews = (deps: ReviewsDeps): UseReviewsResult => {
	const queryClient = useQueryClient();
	const list = useQuery({ queryKey: [...REVIEWS_KEY, deps.listReviews], queryFn: deps.listReviews });
	const starter = useMutation({
		mutationFn: async (values: StartReviewValues) =>
			deps.startReview({ ...values, selectionSize: ZERO_SEEDS_SELECTION_SIZE }),
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: REVIEWS_KEY }),
	});
	return {
		reviews: list.data ?? [],
		loading: list.isPending,
		error: list.error === null ? null : errorMessage(list.error),
		starting: starter.isPending,
		startError: starter.error === null ? null : errorMessage(starter.error),
		start: async (values) => {
			const started = await starter.mutateAsync(values);
			return started.review;
		},
	};
};
