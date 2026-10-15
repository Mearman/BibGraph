/**
 * Compute handler: the heavy review work (measuring a stage's algorithms on a pool, and screening a pool against a review's composition) as a pure request-to-response function. The worker entry only wires it to messages and the main thread reaches it through ReviewCompute, so the same code runs in a Web Worker in the app and directly in tests. A failure becomes an error response rather than a thrown error, because it has to cross a message boundary. Measurement requests name the algorithms they want measured, so the session can measure only a stage's cache-missing cells, and they report progress as each algorithm starts, so the interface can say what is running.
 */

import {
	measureExplorationStage,
	type MeasureProgress,
	measureRankingStage,
	measureSeedSelectionStage,
	type StageMeasurements,
	toPoolGraph,
} from "@/lib/algorithms/algorithm-comparison";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import { selectSeeds } from "@/lib/algorithms/seed-engine";
import type { LiteratureReview } from "@/stores/review-store";

import { buildScreeningView, type ScreeningView } from "./screening-view";

export type ComputeRequest =
	| {
			readonly kind: "measure-exploration";
			readonly pool: readonly PoolWork[];
			readonly seeds: readonly string[];
			readonly algorithmIds: readonly string[];
	  }
	| {
			readonly kind: "measure-selection";
			readonly pool: readonly PoolWork[];
			readonly selectionSize: number;
			readonly algorithmIds: readonly string[];
	  }
	| {
			readonly kind: "measure-ranking";
			readonly pool: readonly PoolWork[];
			readonly seeds: readonly string[];
			readonly explorationId: string;
	  }
	| { readonly kind: "screen"; readonly review: LiteratureReview; readonly pool: readonly PoolWork[] }
	| { readonly kind: "select"; readonly pool: readonly PoolWork[]; readonly selectorId: string; readonly size: number };

export type ComputeResponse =
	| { readonly kind: "measure-exploration"; readonly measurements: StageMeasurements }
	| { readonly kind: "measure-selection"; readonly measurements: StageMeasurements }
	| { readonly kind: "measure-ranking"; readonly measurements: StageMeasurements }
	| { readonly kind: "screen"; readonly view: ScreeningView }
	| { readonly kind: "select"; readonly seeds: readonly string[] }
	| { readonly kind: "error"; readonly message: string };

/**
 * A message the worker posts while a measurement run is under way, ahead of the final response. The kind discriminates it from every response kind.
 */
export type ComputeProgress = MeasureProgress & { readonly kind: "progress" };

export const handleCompute = (request: ComputeRequest, onProgress?: (progress: ComputeProgress) => void): ComputeResponse => {
	const report =
		onProgress === undefined
			? undefined
			: (progress: MeasureProgress): void => {
					onProgress({ kind: "progress", ...progress });
				};
	try {
		if (request.kind === "measure-exploration") {
			return {
				kind: "measure-exploration",
				measurements: measureExplorationStage(request.pool, request.seeds, request.algorithmIds, report),
			};
		}
		if (request.kind === "measure-selection") {
			return {
				kind: "measure-selection",
				measurements: measureSeedSelectionStage(request.pool, request.selectionSize, request.algorithmIds, report),
			};
		}
		if (request.kind === "measure-ranking") {
			return {
				kind: "measure-ranking",
				measurements: measureRankingStage(request.pool, request.seeds, request.explorationId, report),
			};
		}
		if (request.kind === "select") {
			return { kind: "select", seeds: selectSeeds(request.selectorId, toPoolGraph(request.pool), request.size) };
		}
		return { kind: "screen", view: buildScreeningView(request.review, request.pool) };
	} catch (error) {
		return { kind: "error", message: error instanceof Error ? error.message : "unknown error" };
	}
};

/**
 * What the screens call to run the heavy work. The app backs it with a Web Worker; tests back it with handleCompute directly.
 */
export interface ReviewCompute {
	readonly measureExploration: (
		pool: readonly PoolWork[],
		seeds: readonly string[],
		algorithmIds: readonly string[],
		onProgress?: (progress: ComputeProgress) => void,
	) => Promise<StageMeasurements>;
	readonly measureSelection: (
		pool: readonly PoolWork[],
		selectionSize: number,
		algorithmIds: readonly string[],
		onProgress?: (progress: ComputeProgress) => void,
	) => Promise<StageMeasurements>;
	readonly measureRanking: (
		pool: readonly PoolWork[],
		seeds: readonly string[],
		explorationId: string,
		onProgress?: (progress: ComputeProgress) => void,
	) => Promise<StageMeasurements>;
	readonly screen: (review: LiteratureReview, pool: readonly PoolWork[]) => Promise<ScreeningView>;
	readonly select: (pool: readonly PoolWork[], selectorId: string, size: number) => Promise<readonly string[]>;
}

const measurementsOf = (
	response: ComputeResponse,
	expected: "measure-exploration" | "measure-selection" | "measure-ranking",
): StageMeasurements => {
	if (response.kind === "error") throw new Error(response.message);
	if (response.kind !== expected) throw new Error("unexpected compute response");
	return response.measurements;
};

/**
 * A ReviewCompute that answers through a function from request to response: a worker round trip in the app, handleCompute in tests.
 */
export const createReviewCompute = (
	run: (request: ComputeRequest, onProgress?: (progress: ComputeProgress) => void) => Promise<ComputeResponse>,
): ReviewCompute => ({
	measureExploration: async (pool, seeds, algorithmIds, onProgress) => {
		const response = await run({ kind: "measure-exploration", pool, seeds, algorithmIds }, onProgress);
		return measurementsOf(response, "measure-exploration");
	},
	measureSelection: async (pool, selectionSize, algorithmIds, onProgress) => {
		const response = await run({ kind: "measure-selection", pool, selectionSize, algorithmIds }, onProgress);
		return measurementsOf(response, "measure-selection");
	},
	measureRanking: async (pool, seeds, explorationId, onProgress) => {
		const response = await run({ kind: "measure-ranking", pool, seeds, explorationId }, onProgress);
		return measurementsOf(response, "measure-ranking");
	},
	screen: async (review, pool) => {
		const response = await run({ kind: "screen", review, pool });
		if (response.kind === "error") throw new Error(response.message);
		if (response.kind !== "screen") throw new Error("unexpected compute response");
		return response.view;
	},
	select: async (pool, selectorId, size) => {
		const response = await run({ kind: "select", pool, selectorId, size });
		if (response.kind === "error") throw new Error(response.message);
		if (response.kind !== "select") throw new Error("unexpected compute response");
		return response.seeds;
	},
});
