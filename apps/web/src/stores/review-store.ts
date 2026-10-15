/**
 * Literature-review store: Dexie persistence for systematic reviews created, refined and screened in the app. A review holds its seed works, its Boolean query, per-work screening decisions, and the app's suggested composition of algorithms (each stage's pick with the evidence that earned it). Follows the repository-store singleton pattern.
 */

import { logger } from "@bibgraph/utils/logger";
import Dexie, { type Table } from "dexie";

import type { PoolWork } from "@/lib/algorithms/screening-engine";
import type { MeasurementRecord } from "@/lib/reviews/measurement-cache";

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

/**
 * Schema version that adds the measurements table, keyed by measurement key with the review id indexed for deletion.
 */
const MEASUREMENTS_SCHEMA_VERSION = 3;

class ReviewDB extends Dexie {
	reviews!: Table<ReviewRecord, string>;
	pools!: Table<PoolSnapshot, string>;
	measurements!: Table<MeasurementRecord, string>;

	constructor() {
		super("bibgraph-reviews");
		this.version(1).stores({
			reviews: "id, name, createdAt",
		});
		this.version(2).stores({
			reviews: "id, name, createdAt",
			pools: "reviewId",
		});
		this.version(MEASUREMENTS_SCHEMA_VERSION).stores({
			reviews: "id, name, createdAt",
			pools: "reviewId",
			measurements: "key, reviewId",
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
	await db.transaction("rw", db.reviews, db.pools, db.measurements, async () => {
		await db.reviews.delete(id);
		await db.pools.delete(id);
		await db.measurements.where("reviewId").equals(id).delete();
	});
};

export const savePool = async (reviewId: string, pool: readonly PoolWork[]): Promise<void> => {
	await getDB().pools.put({ reviewId, works: [...pool] });
};

export const getPool = async (reviewId: string): Promise<PoolWork[] | undefined> => {
	const snapshot = await getDB().pools.get(reviewId);
	return snapshot?.works;
};

/**
 * Every stored algorithm measurement of a review. Each record's key names the inputs it was measured under, so the caller keeps a cell only while those inputs still hold.
 */
export const getMeasurements = async (reviewId: string): Promise<MeasurementRecord[]> =>
	getDB().measurements.where("reviewId").equals(reviewId).toArray();

/**
 * Stores measurements by key: re-measuring a cell overwrites its record, and the cells of stages whose inputs have not changed are left alone.
 */
export const saveMeasurements = async (reviewId: string, cells: readonly MeasurementRecord[]): Promise<void> => {
	await getDB().measurements.bulkPut(cells.map((cell) => ({ ...cell, reviewId })));
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
 * Removes a work's screening decision so it returns to the screening lists. The key is deleted, not set to undefined, because the screening engines treat every key of the decisions record as decided.
 */
export const clearDecision = async (id: string, workId: string): Promise<void> => {
	const review = await getDB().reviews.get(id);
	if (!review) {
		throw new Error(`review not found: ${id}`);
	}
	const decisions = Object.fromEntries(Object.entries(review.decisions).filter(([key]) => key !== workId));
	await getDB().reviews.update(id, { decisions, updatedAt: new Date() });
};

/**
Test-only helper: wipes the table so each unit test starts empty.
 */
export const clearAllReviewsForTests = async (): Promise<void> => {
	const db = getDB();
	await db.transaction("rw", db.reviews, db.pools, db.measurements, async () => {
		await db.reviews.clear();
		await db.pools.clear();
		await db.measurements.clear();
	});
};
