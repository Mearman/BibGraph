/**
 * Web Worker entry for the review compute: receives a request, runs the pure handler and posts the response, with progress messages ahead of it while a measurement run is under way. Everything of substance lives in compute-handler; this file only connects it to messages, so the measurement and screening never block the page.
 */

import { type ComputeRequest, handleCompute } from "./compute-handler";

addEventListener("message", (event: MessageEvent<ComputeRequest>) => {
	// A dedicated worker only ever receives messages from the page that created it, and their origin is the empty string.
	if (event.origin !== "") return;
	const response = handleCompute(event.data, (progress) => {
		postMessage(progress, {});
	});
	postMessage(response, {});
});
