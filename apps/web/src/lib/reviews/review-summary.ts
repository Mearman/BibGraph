/**
 * Review list summaries: the progress and date wording on a review's card.
 */

import type { LiteratureReview } from "@/stores/review-store";

export interface ReviewProgress {
	readonly included: number;
	readonly screened: number;
}

export const reviewProgress = (review: LiteratureReview): ReviewProgress => {
	const decisions = Object.values(review.decisions).filter((decision) => decision !== undefined);
	return { included: decisions.filter((decision) => decision === "include").length, screened: decisions.length };
};

export const progressLabel = (review: LiteratureReview): string => {
	const { included, screened } = reviewProgress(review);
	return `${String(included)} included of ${String(screened)} screened`;
};

export const createdLabel = (review: LiteratureReview): string =>
	`Created ${review.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
