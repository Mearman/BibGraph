/**
 * Literature-review store: Dexie persistence for systematic reviews created, refined and screened in the app. A review holds its seed works, its Boolean query, per-work screening decisions, and the app's suggested composition of algorithms (each stage's pick with the evidence that earned it). Follows the repository-store singleton pattern.
 */

import { logger } from "@bibgraph/utils/logger";
import Dexie, { type Table } from "dexie";

import type { PoolWork } from "@/lib/algorithms/screening-engine";

/**
A per-work screening decision the refine loop feeds back as signal.
 */
export type ScreeningDecision = "include" | "exclude";

/**
One stage's suggested algorithm and the measurement that earned the pick.
 */
export interface CompositionPick {
	algorithmId: string;
	evidence: string;
	/**
	 * Who made the pick: the app (a default or a measured suggestion, which later measurement may replace) or the reviewer (an override that measurement never replaces).
	 */
	chosenBy: "app" | "reviewer";
}

/**
The suggested pipeline for a review; null stages have no suggestion yet.
 */
export interface SuggestedComposition {
	exploration: CompositionPick | null;
	ranking: CompositionPick | null;
	seedSelection: CompositionPick | null;
}

export interface LiteratureReview {
	id: string;
	name: string;
	query: string;
	/**
	OpenAlex work ids the review started from; empty for a zero-seeds start.
	 */
	seeds: string[];
	decisions: Record<string, ScreeningDecision | undefined>;
	suggestedComposition: SuggestedComposition | null;
	createdAt: Date;
	updatedAt: Date;
}

interface ReviewRecord extends LiteratureReview {
	/**
	Dexie indexes need a primary key; id is the string uuid.
	 */
	id: string;
}

/**
 * The pool a review was started with, kept as a snapshot: screening a review must give the same answer every time it is opened, and OpenAlex results drift, so the pool is fetched once, not on every open.
 */
interface PoolSnapshot {
	reviewId: string;
	works: PoolWork[];
}

class ReviewDB extends Dexie {
	reviews!: Table<ReviewRecord, string>;
	pools!: Table<PoolSnapshot, string>;

	constructor() {
		super("bibgraph-reviews");
		this.version(1).stores({
			reviews: "id, name, createdAt",
		});
		this.version(2).stores({
			reviews: "id, name, createdAt",
			pools: "reviewId",
		});
	}
}

let databaseInstance: ReviewDB | null = null;

const getDB = (): ReviewDB => {
	databaseInstance ??= new ReviewDB();
	return databaseInstance;
};

const REVIEW_ID_RADIX = 36;
const REVIEW_ID_LENGTH = 12;

const newReviewId = (): string => {
	const bytes = new Uint8Array(REVIEW_ID_LENGTH);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(REVIEW_ID_RADIX).padStart(2, "0")).join("").slice(0, REVIEW_ID_LENGTH * 2);
};

export interface CreateReviewInput {
	name: string;
	query?: string;
	seeds?: string[];
}

let lastCreatedAtMs = 0;

/**
 * The creation time for a new review, strictly later than the previous one in this process. Reviews are listed by creation time, and two created within the same millisecond would otherwise tie and fall back to their random ids.
 */
const nextCreationTime = (): Date => {
	lastCreatedAtMs = Math.max(Date.now(), lastCreatedAtMs + 1);
	return new Date(lastCreatedAtMs);
};

export const createReview = async (input: CreateReviewInput): Promise<LiteratureReview> => {
	const now = nextCreationTime();
	const review: LiteratureReview = {
		id: newReviewId(),
		name: input.name,
		query: input.query ?? "",
		seeds: input.seeds ?? [],
		decisions: {},
		suggestedComposition: null,
		createdAt: now,
		updatedAt: now,
	};
	await getDB().reviews.add(review);
	logger.debug("storage", "review created", { id: review.id, name: review.name });
	return review;
};

export const getReview = async (id: string): Promise<LiteratureReview | undefined> =>
	getDB().reviews.get(id);

export const listReviews = async (): Promise<LiteratureReview[]> =>
	getDB().reviews.orderBy("createdAt").toArray();

export const deleteReview = async (id: string): Promise<void> => {
	const db = getDB();
	await db.transaction("rw", db.reviews, db.pools, async () => {
		await db.reviews.delete(id);
		await db.pools.delete(id);
	});
};

export const savePool = async (reviewId: string, pool: readonly PoolWork[]): Promise<void> => {
	await getDB().pools.put({ reviewId, works: [...pool] });
};

export const getPool = async (reviewId: string): Promise<PoolWork[] | undefined> => {
	const snapshot = await getDB().pools.get(reviewId);
	return snapshot?.works;
};

export interface UpdateReviewInput {
	name?: string;
	query?: string;
	seeds?: string[];
	suggestedComposition?: SuggestedComposition;
}

export const updateReview = async (id: string, patch: UpdateReviewInput): Promise<void> => {
	await getDB().reviews.update(id, { ...patch, updatedAt: new Date() });
};

export const setDecision = async (
	id: string,
	workId: string,
	decision: ScreeningDecision,
): Promise<void> => {
	const review = await getDB().reviews.get(id);
	if (!review) {
		throw new Error(`review not found: ${id}`);
	}
	const decisions = { ...review.decisions, [workId]: decision };
	await getDB().reviews.update(id, { decisions, updatedAt: new Date() });
};

/**
Test-only helper: wipes the table so each unit test starts empty.
 */
export const clearAllReviewsForTests = async (): Promise<void> => {
	const db = getDB();
	await db.transaction("rw", db.reviews, db.pools, async () => {
		await db.reviews.clear();
		await db.pools.clear();
	});
};
