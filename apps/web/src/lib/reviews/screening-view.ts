/**
 * Screening view-model: everything the screening screen shows, derived purely from a review and its pool. The semantic path is the association ranking with the reviewer's inclusions folded in as seeds and decided works hidden; the standard path is the Boolean query's own order. Titles arrive later from fetched labels (withLabels), because the engines rank on citation structure alone and only the visible rows need display data.
 */

import type { LiteratureReview } from "@/stores/review-store";

import { refineReview, screenStandard } from "../algorithms/review-service";
import type { PoolWork } from "../algorithms/screening-engine";
import type { WorkLabel } from "../algorithms/work-labels";

/**
 * A screening row ready to display: the work with its title, year and one line of evidence for its position.
 */
export interface ScreeningRow {
	readonly workId: string;
	readonly title: string;
	readonly year: number | null;
	readonly detail: string;
}

/**
 * How many rows each screening path shows; the engines rank the whole pool, the screen shows the head of the list.
 */
export const VISIBLE_ROWS = 50;

const SCORE_DECIMALS = 3;

/**
 * A screening row before its title is known.
 */
export interface UnlabelledRow {
	readonly workId: string;
	readonly detail: string;
}

export interface ScreeningView {
	/**
	 * The review's seeds plus its inclusions, the set the semantic ranking runs from.
	 */
	readonly seeds: readonly string[];
	readonly semantic: readonly UnlabelledRow[];
	readonly standard: readonly UnlabelledRow[];
	readonly includedCount: number;
	readonly excludedCount: number;
}

const countDecisions = (review: LiteratureReview, decision: "include" | "exclude"): number =>
	Object.values(review.decisions).filter((value) => value === decision).length;

export const buildScreeningView = (review: LiteratureReview, pool: readonly PoolWork[]): ScreeningView => {
	const refined = refineReview(review, pool);
	const semantic = refined.candidates.slice(0, VISIBLE_ROWS).map((candidate) => ({
		workId: candidate.workId,
		detail: `Association ${candidate.score.toFixed(SCORE_DECIMALS)}, ${
			candidate.evidence.via.length > 1 ? `via ${candidate.evidence.via.filter((id) => id !== candidate.workId).join(", ")}` : "direct"
		}`,
	}));
	const standard = screenStandard(review, pool)
		.slice(0, VISIBLE_ROWS)
		.map((candidate) => ({ workId: candidate.workId, detail: `Query rank ${String(candidate.rank)}` }));
	return {
		seeds: refined.seeds,
		semantic,
		standard,
		includedCount: countDecisions(review, "include"),
		excludedCount: countDecisions(review, "exclude"),
	};
};

export const withLabels = (
	rows: readonly UnlabelledRow[],
	labels: ReadonlyMap<string, WorkLabel>,
): readonly ScreeningRow[] =>
	rows.map((row) => {
		const label = labels.get(row.workId);
		return {
			workId: row.workId,
			title: label?.title ?? row.workId,
			year: label?.year ?? null,
			detail: row.detail,
		};
	});
