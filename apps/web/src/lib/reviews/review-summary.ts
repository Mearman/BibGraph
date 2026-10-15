/**
 * Review list summaries: the progress and date wording on a review's card, and the starting-works count and wording shared by the card and the review page so the two always agree.
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

/**
 * The review's seeds plus its inclusions (the set the screening ranking runs from), so every page counts the same thing. An inclusion that is already a seed is not counted twice.
 */
export const startingWorksCount = (review: LiteratureReview): number => {
	const seeds = new Set(review.seeds);
	const foldedIn = Object.entries(review.decisions).filter(
		([workId, decision]) => decision === "include" && !seeds.has(workId),
	).length;
	return review.seeds.length + foldedIn;
};

/**
 * The count in the create form's own words, singular or plural.
 */
export const startingWorksLabel = (count: number): string =>
	`${String(count)} starting ${count === 1 ? "work" : "works"}`;

export const progressLabel = (review: LiteratureReview): string => {
	const { included, screened } = reviewProgress(review);
	return `${String(included)} included of ${String(screened)} screened`;
};

export const createdLabel = (review: LiteratureReview): string =>
	`Created ${review.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
