/**
 * Screening view-model: everything the screening screen shows, derived purely from a review and its pool. The semantic path is the association ranking with the reviewer's inclusions folded in as seeds and decided works hidden; the standard path is the Boolean query's own order. Both paths list every remaining work: the visible window, sorting and filtering are presentation concerns applied later, once titles are known (withLabels), because the engines rank on citation structure alone and only the screen needs display data.
 */

import type { LiteratureReview, ScreeningDecision } from "@/stores/review-store";

import { refineReview, screenStandard } from "../algorithms/review-service";
import type { PoolWork } from "../algorithms/screening-engine";
import type { WorkLabel } from "../algorithms/work-labels";

/**
 * How many decimals the association score is shown with.
 */
export const SCORE_DECIMALS = 3;

/**
 * How many rows a screening list shows before "Load more": the first screenful.
 */
export const VISIBLE_ROWS = 50;

/**
 * How many further rows each "Load more" press reveals.
 */
export const LOAD_MORE_STEP = 50;

/**
 * One semantic candidate with its ranking evidence: the best-scoring path from a starting work, the works that path passes through, and how many starting works reach the candidate at all.
 */
export interface SemanticCandidate {
	readonly workId: string;
	readonly score: number;
	readonly fromSeed: string;
	readonly via: readonly string[];
	readonly seedsReaching: number;
}

/**
 * One standard-path candidate: its position in the order the search returned.
 */
export interface StandardCandidate {
	readonly workId: string;
	readonly rank: number;
}

export interface DecidedWork {
	readonly workId: string;
	readonly decision: ScreeningDecision;
}

export interface ScreeningView {
	/**
	 * The review's seeds plus its inclusions, the set the semantic ranking runs from.
	 */
	readonly seeds: readonly string[];
	readonly semantic: readonly SemanticCandidate[];
	readonly standard: readonly StandardCandidate[];
	readonly decided: readonly DecidedWork[];
	readonly includedCount: number;
	readonly excludedCount: number;
}

const countDecisions = (review: LiteratureReview, decision: "include" | "exclude"): number =>
	Object.values(review.decisions).filter((value) => value === decision).length;

const decidedWorks = (review: LiteratureReview): readonly DecidedWork[] =>
	Object.entries(review.decisions)
		.flatMap(([workId, decision]) => (decision === undefined ? [] : [{ workId, decision }]))
		.sort((a, b) => a.workId.localeCompare(b.workId));

export const buildScreeningView = (review: LiteratureReview, pool: readonly PoolWork[]): ScreeningView => {
	const refined = refineReview(review, pool);
	return {
		seeds: refined.seeds,
		semantic: refined.candidates.map((candidate) => ({
			workId: candidate.workId,
			score: candidate.score,
			fromSeed: candidate.evidence.fromSeed,
			via: candidate.evidence.via,
			seedsReaching: candidate.pathsConnected,
		})),
		standard: screenStandard(review, pool),
		decided: decidedWorks(review),
		includedCount: countDecisions(review, "include"),
		excludedCount: countDecisions(review, "exclude"),
	};
};

/**
 * A work referred to by a seed list or an evidence path: its title when a label was fetched, or the id standing in for it (known false) so the screen can mark the id as not being a title.
 */
export interface LabelledRef {
	readonly id: string;
	readonly title: string;
	readonly known: boolean;
}

/**
 * Labelled evidence for one semantic row: the best path from a starting work with every title resolved, the association score, and how many starting works reach the work.
 */
export interface EvidenceView {
	readonly score: number;
	readonly fromSeed: LabelledRef;
	readonly via: readonly LabelledRef[];
	readonly seedsReaching: number;
	readonly seedCount: number;
}

/**
 * A screening row ready to display: the work with its title, year and the evidence for its position on whichever path it came from.
 */
export interface ScreeningRow {
	readonly workId: string;
	readonly title: string;
	readonly year: number | null;
	/**
	 * False when no title was fetched, so the id stands in for the title and must be marked.
	 */
	readonly titleKnown: boolean;
	/**
	 * Present on semantic rows: the association evidence with titles resolved.
	 */
	readonly evidence: EvidenceView | null;
	/**
	 * Present on standard rows: the work's position in the search's own order.
	 */
	readonly searchRank: number | null;
	/**
	 * The work's position in the other screening list, when it appears in both.
	 */
	readonly otherPosition: number | null;
	/**
	 * The work's association score as shown in the other list, when it appears in both.
	 */
	readonly otherScore: number | null;
}

/**
 * A decided work ready to display in the Decided list.
 */
export interface DecidedRow {
	readonly workId: string;
	readonly title: string;
	readonly year: number | null;
	readonly titleKnown: boolean;
	readonly decision: ScreeningDecision;
}

export interface LabelledScreening {
	readonly seeds: readonly LabelledRef[];
	readonly semantic: readonly ScreeningRow[];
	readonly standard: readonly ScreeningRow[];
	readonly decided: readonly DecidedRow[];
}

const refFor = (id: string, labels: ReadonlyMap<string, WorkLabel>): LabelledRef => {
	const label = labels.get(id);
	return { id, title: label?.title ?? id, known: label?.title != null };
};

const rowFor = (
	workId: string,
	labels: ReadonlyMap<string, WorkLabel>,
	fields: Readonly<{
		evidence: EvidenceView | null;
		searchRank: number | null;
		otherPosition: number | null;
		otherScore: number | null;
	}>,
): ScreeningRow => {
	const label = labels.get(workId);
	return {
		workId,
		title: label?.title ?? workId,
		year: label?.year ?? null,
		titleKnown: label?.title != null,
		evidence: fields.evidence,
		searchRank: fields.searchRank,
		otherPosition: fields.otherPosition,
		otherScore: fields.otherScore,
	};
};

/**
 * Attaches titles and years to a view, resolves every evidence path's ids to titles and cross-links each list's positions into the other. Ids whose label never arrived keep the id as the title with known false, so the screen marks them.
 */
export const withLabels = (view: ScreeningView, labels: ReadonlyMap<string, WorkLabel>): LabelledScreening => {
	const semanticPosition = new Map(view.semantic.map((candidate, index) => [candidate.workId, index + 1]));
	const semanticScore = new Map(view.semantic.map((candidate) => [candidate.workId, candidate.score]));
	const standardRank = new Map(view.standard.map((candidate) => [candidate.workId, candidate.rank]));
	const seedCount = view.seeds.length;
	return {
		seeds: view.seeds.map((seed) => refFor(seed, labels)),
		semantic: view.semantic.map((candidate) =>
			rowFor(candidate.workId, labels, {
				evidence: {
					score: candidate.score,
					fromSeed: refFor(candidate.fromSeed, labels),
					via: candidate.via.map((id) => refFor(id, labels)),
					seedsReaching: candidate.seedsReaching,
					seedCount,
				},
				searchRank: null,
				otherPosition: standardRank.get(candidate.workId) ?? null,
				otherScore: null,
			}),
		),
		standard: view.standard.map((candidate) =>
			rowFor(candidate.workId, labels, {
				evidence: null,
				searchRank: candidate.rank,
				otherPosition: semanticPosition.get(candidate.workId) ?? null,
				otherScore: semanticScore.get(candidate.workId) ?? null,
			}),
		),
		decided: view.decided.map((work) => ({
			...rowFor(work.workId, labels, { evidence: null, searchRank: null, otherPosition: null, otherScore: null }),
			decision: work.decision,
		})),
	};
};

/**
 * The title shown for a referred work, marking one whose title never arrived.
 */
const refTitle = (ref: LabelledRef): string => (ref.known ? ref.title : `Unknown work (${ref.id})`);

/**
 * One line of plain evidence for a semantic row: the chain from the starting work to this work, in titles.
 */
export const describeEvidence = (evidence: EvidenceView): string =>
	evidence.via.length === 0
		? `Cited directly by ${refTitle(evidence.fromSeed)}`
		: [refTitle(evidence.fromSeed), ...evidence.via.map(refTitle), "this work"].join(" -> ");

/**
 * How a screening list can be sorted.
 */
export type RowSort = "score" | "year" | "title";

/**
 * The score a row without an association evidence gets in a score sort, so it sorts below every real score (scores are never negative).
 */
const MISSING_SCORE = -1;

const tieBreak = (a: ScreeningRow, b: ScreeningRow): number => a.workId.localeCompare(b.workId);

/**
 * Sorts a screening list. "score" orders by association evidence, strongest first; rows without one (the search-order list) keep their current order. "year" is newest first; "title" is A to Z. Ties break on the work id, so the order is deterministic.
 */
export const sortRows = (rows: readonly ScreeningRow[], sort: RowSort): readonly ScreeningRow[] => {
	if (sort === "title") {
		return [...rows].sort((a, b) => a.title.localeCompare(b.title) || tieBreak(a, b));
	}
	if (sort === "year") {
		return [...rows].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || tieBreak(a, b));
	}
	return [...rows].sort((a, b) => {
		const left = a.evidence?.score ?? MISSING_SCORE;
		const right = b.evidence?.score ?? MISSING_SCORE;
		// Two rows without a score (the search-order list) keep the order they arrived in; a real score, even zero, sorts above a missing one.
		if (left === MISSING_SCORE && right === MISSING_SCORE) return 0;
		return right - left || tieBreak(a, b);
	});
};

/**
 * Keeps the rows whose title or id contains the query (case-insensitive).
 */
export const filterRows = (rows: readonly ScreeningRow[], query: string): readonly ScreeningRow[] => {
	const needle = query.trim().toLowerCase();
	if (needle === "") return rows;
	return rows.filter((row) => row.title.toLowerCase().includes(needle) || row.workId.toLowerCase().includes(needle));
};

/**
 * English ordinal suffixes switch by last digit, except the teens (eleven through thirteen) which all take "th".
 */
const TEEN_RANGE_START = 11;
const TEEN_RANGE_END = 13;
const LAST_DIGIT_DIVISOR = 10;
const TWO_DIGIT_DIVISOR = 100;

/**
 * The suffixes that switch on the last digit; every other last digit takes "th".
 */
const ORDINAL_SUFFIX_BY_LAST_DIGIT: Readonly<Record<number, string | undefined>> = { 1: "st", 2: "nd", 3: "rd" };

/**
 * Writes a position as its ordinal word (first, second, third, eleventh, twenty-first), used in cross-list notes.
 */
export const ordinal = (position: number): string => {
	const tail = position % TWO_DIGIT_DIVISOR;
	if (tail >= TEEN_RANGE_START && tail <= TEEN_RANGE_END) return `${String(position)}th`;
	return `${String(position)}${ORDINAL_SUFFIX_BY_LAST_DIGIT[position % LAST_DIGIT_DIVISOR] ?? "th"}`;
};

/**
 * Every id the screen needs a label for: the seeds, both lists' works, each semantic row's evidence path and the decided works. Sorted so the list is a stable query key.
 */
export const labelIdsFor = (view: ScreeningView): readonly string[] =>
	[
		...new Set([
			...view.seeds,
			...view.semantic.flatMap((candidate) => [candidate.workId, candidate.fromSeed, ...candidate.via]),
			...view.standard.map((candidate) => candidate.workId),
			...view.decided.map((work) => work.workId),
		]),
	].sort();
