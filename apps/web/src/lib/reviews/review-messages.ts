/**
 * Reviewer-facing wording for the reviews screens: plain messages for failures, progress labels for the start stages, and the notices shown after a start. Kept apart from the components so the wording is testable and the screens stay presentational.
 */

import { ReviewUserError, type StartedReview, type StartStage } from "@/lib/algorithms/review-service";

import { MAX_REVIEW_POOL_SIZE } from "./review-constants";

export interface DescribedError {
	/**
	 * Plain language, with a next step.
	 */
	readonly message: string;
	/**
	 * Whether trying the same action again can help; false when the thing asked for does not exist.
	 */
	readonly retryable: boolean;
}

const NOT_FOUND_PATTERN = /^review not found\b/;
const POOL_NOT_LOADED_PATTERN = /^pool for review .* is not loaded/;
const NETWORK_PATTERN = /failed to fetch|network|timed? ?out|\b429\b|rate limit|\b5\d\d\b/i;

const GENERIC: DescribedError = {
	message: "Something went wrong. Try again, and if it keeps happening reload the page.",
	retryable: true,
};

/**
 * Maps any failure (an exception, or the message string a session hook holds) to wording a non-technical reviewer can act on.
 */
export const describeError = (error: unknown): DescribedError => {
	if (error instanceof ReviewUserError) {
		return { message: error.message, retryable: false };
	}
	const text = typeof error === "string" ? error : error instanceof Error ? error.message : "";
	if (NOT_FOUND_PATTERN.test(text)) {
		return {
			message: "This review could not be found. It may have been deleted. Go back to your reviews and choose another.",
			retryable: false,
		};
	}
	if (POOL_NOT_LOADED_PATTERN.test(text)) {
		return {
			message: "The works for this review have not finished loading. Try again in a moment.",
			retryable: true,
		};
	}
	if (NETWORK_PATTERN.test(text)) {
		return {
			message: "We could not reach OpenAlex. Check your internet connection and try again.",
			retryable: true,
		};
	}
	return GENERIC;
};

const STAGE_LABELS: Readonly<Record<StartStage, string>> = {
	"loading-pool": "Searching OpenAlex...",
	"choosing-seeds": "Choosing starting works...",
	saving: "Saving your review...",
};

export const stageLabel = (stage: StartStage): string => STAGE_LABELS[stage];

/**
 * Warnings a reviewer must see before screening: truncated results, a search that found nothing, and starting works OpenAlex did not return.
 */
export const startNotices = (started: Pick<StartedReview, "poolCapped" | "queryResultCount" | "missingSeeds">, hasQuery: boolean): readonly string[] => {
	const notices: string[] = [];
	if (started.poolCapped) {
		notices.push(
			`Your search returned the most works we can load at once, so only the first ${MAX_REVIEW_POOL_SIZE.toLocaleString("en-GB")} (the most relevant) are included. Narrow your search terms to reach the rest.`,
		);
	}
	if (hasQuery && started.queryResultCount === 0) {
		notices.push("Your search terms matched no works, so only your starting works are used. Try fewer or broader terms.");
	}
	if (started.missingSeeds.length > 0) {
		notices.push(`OpenAlex did not return these starting works: ${started.missingSeeds.join(", ")}. Check the ids.`);
	}
	return notices;
};
