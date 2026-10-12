/**
 * Web Worker entry for the review compute: receives a request, runs the pure handler and posts the response. Everything of substance lives in compute-handler; this file only connects it to messages, so the measurement and screening never block the page.
 */

import { type ComputeRequest, handleCompute } from "./compute-handler";

addEventListener("message", (event: MessageEvent<ComputeRequest>) => {
	// A dedicated worker only ever receives messages from the page that created it, and their origin is the empty string.
	if (event.origin !== "") return;
	postMessage(handleCompute(event.data), {});
});
