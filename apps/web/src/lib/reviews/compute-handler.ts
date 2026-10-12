/**
 * Compute handler: the heavy review work (measuring every algorithm on a pool, and screening a pool against a review's composition) as a pure request-to-response function. The worker entry only wires it to messages and the main thread reaches it through ReviewCompute, so the same code runs in a Web Worker in the app and directly in tests. A failure becomes an error response rather than a thrown error, because it has to cross a message boundary.
 */

import type { AlgorithmComparison } from "@/lib/algorithms/algorithm-comparison";
import { compareAlgorithms, toPoolGraph } from "@/lib/algorithms/algorithm-comparison";
import type { PoolWork } from "@/lib/algorithms/screening-engine";
import { selectSeeds } from "@/lib/algorithms/seed-engine";
import type { LiteratureReview } from "@/stores/review-store";

import { buildScreeningView, type ScreeningView } from "./screening-view";

export type ComputeRequest =
	| {
			readonly kind: "compare";
			readonly pool: readonly PoolWork[];
			readonly seeds: readonly string[];
			readonly selectionSize: number;
	  }
	| { readonly kind: "screen"; readonly review: LiteratureReview; readonly pool: readonly PoolWork[] }
	| { readonly kind: "select"; readonly pool: readonly PoolWork[]; readonly selectorId: string; readonly size: number };

export type ComputeResponse =
	| { readonly kind: "compare"; readonly comparison: AlgorithmComparison }
	| { readonly kind: "screen"; readonly view: ScreeningView }
	| { readonly kind: "select"; readonly seeds: readonly string[] }
	| { readonly kind: "error"; readonly message: string };

export const handleCompute = (request: ComputeRequest): ComputeResponse => {
	try {
		if (request.kind === "compare") {
			return {
				kind: "compare",
				comparison: compareAlgorithms(request.pool, request.seeds, { selectionSize: request.selectionSize }),
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
	readonly compare: (
		pool: readonly PoolWork[],
		seeds: readonly string[],
		selectionSize: number,
	) => Promise<AlgorithmComparison>;
	readonly screen: (review: LiteratureReview, pool: readonly PoolWork[]) => Promise<ScreeningView>;
	readonly select: (pool: readonly PoolWork[], selectorId: string, size: number) => Promise<readonly string[]>;
}

/**
 * A ReviewCompute that answers through a function from request to response: a worker round trip in the app, handleCompute in tests.
 */
export const createReviewCompute = (run: (request: ComputeRequest) => Promise<ComputeResponse>): ReviewCompute => ({
	compare: async (pool, seeds, selectionSize) => {
		const response = await run({ kind: "compare", pool, seeds, selectionSize });
		if (response.kind === "error") throw new Error(response.message);
		if (response.kind !== "compare") throw new Error("unexpected compute response");
		return response.comparison;
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
