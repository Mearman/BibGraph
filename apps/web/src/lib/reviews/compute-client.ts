/**
 * Worker-backed ReviewCompute: each request runs in its own short-lived Web Worker, so the heavy measurement and screening happen off the main thread and two can run side by side. Progress messages the worker posts mid-run reach the caller's onProgress; anything else is the final response. This is the only module that creates a Worker.
 */

import {
	type ComputeProgress,
	type ComputeRequest,
	type ComputeResponse,
	createReviewCompute,
	type ReviewCompute,
} from "./compute-handler";

const runInWorker = async (
	request: ComputeRequest,
	onProgress?: (progress: ComputeProgress) => void,
): Promise<ComputeResponse> =>
	new Promise((resolve, reject) => {
		const worker = new Worker(new URL("compute.worker.ts", import.meta.url), { type: "module" });
		worker.addEventListener("message", (event: MessageEvent<ComputeProgress | ComputeResponse>) => {
			if (event.data.kind === "progress") {
				onProgress?.(event.data);
				return;
			}
			worker.terminate();
			resolve(event.data);
		});
		worker.addEventListener("error", (event) => {
			worker.terminate();
			reject(new Error(event.message));
		});
		worker.postMessage(request);
	});

export const workerCompute: ReviewCompute = createReviewCompute(runInWorker);
