/**
 * Transport-level request outcome events. The client knows the moment a server answers with an error status or a request fails at the network level, which can be tens of seconds before the query layer settles (the rate-limit retry budget alone sleeps through five attempts). Surfacing each attempt's outcome lets connectivity surfaces report the truth immediately instead of reading "synced" while every request is being throttled.
 */

export type ClientRequestOutcome =
	| { kind: "success" }
	| { kind: "network-error"; message: string }
	| { kind: "http-error"; status: number; message: string };

type OutcomeListener = (outcome: ClientRequestOutcome) => void;

const listeners = new Set<OutcomeListener>();

/**
 * Subscribe to transport outcome events. Returns an unsubscribe function.
 */
export const subscribeToRequestOutcomes = (listener: OutcomeListener): (() => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/**
 * Publish a transport outcome. Called by the client's request transport on every attempt's result.
 */
export const emitRequestOutcome = (outcome: ClientRequestOutcome): void => {
	for (const listener of listeners) {
		listener(outcome);
	}
};
