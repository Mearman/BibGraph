/**
 * Unit tests for the service worker's sync/activate event wiring: the thin adapter that maps Background Sync events onto the drain and re-registers the tag on activation when work is still queued. Driven against a fake worker scope; the drain itself is covered by drain-queue.unit.test.ts.
 */

import { describe, expect, it, vi } from "vitest";

import { BACKGROUND_SYNC_TAG } from "./queue-schema";
import {
	type ExtendableEventLike,
	registerBackgroundSyncHandlers,
	type ServiceWorkerGlobalLike,
	type SyncEventLike,
} from "./sw-sync-handler";

/**
 * Every async fake awaits one microtask: the repo's require-await and promise-function-async rules demand it.
 */
const tick = async (): Promise<void> => {
	await Promise.resolve();
};

/**
 * Hand-rolled waitUntil recorder: a plain void callback collecting the promises the handler hands over, so the assertions read them without mock typing.
 */
interface WaitUntilRecorder {
	readonly promises: readonly Promise<unknown>[];
	readonly event: { readonly waitUntil: (promise: Readonly<Promise<unknown>>) => void };
}

const recorder = (): WaitUntilRecorder => {
	const promises: Promise<unknown>[] = [];
	const waitUntil = (promise: Readonly<Promise<unknown>>): void => {
		promises.push(promise);
	};
	return { promises, event: { waitUntil } };
};

const captureScope = (): {
	scope: ServiceWorkerGlobalLike;
	dispatchSync: (tag: string, waitUntil: (promise: Readonly<Promise<unknown>>) => void) => void;
	dispatchActivate: (waitUntil: (promise: Readonly<Promise<unknown>>) => void) => void;
} => {
	// Listeners per event type, so dispatching a sync event cannot reach the activation path. Readonly event params satisfy the repo's prefer-readonly-object-param rule.
	const syncListeners: ((event: Readonly<SyncEventLike>) => void)[] = [];
	const activateListeners: ((event: Readonly<ExtendableEventLike>) => void)[] = [];
	const scope: ServiceWorkerGlobalLike = {
		// Partial platform stub; test files may coerce (constitution Principle I).
		registration: {} as ServiceWorkerRegistration,
		addEventListener: (type, listener) => {
			// The interface's per-type overloads arrive here as one callback; coerce to the matching listener shape (allowed in tests).
			if (type === "sync") {
				syncListeners.push(listener as (event: Readonly<SyncEventLike>) => void);
			} else {
				activateListeners.push(listener as (event: Readonly<ExtendableEventLike>) => void);
			}
		},
	};
	return {
		scope,
		dispatchSync: (tag, waitUntil) => {
			for (const listener of syncListeners) {
				listener({ tag, waitUntil });
			}
		},
		dispatchActivate: (waitUntil) => {
			for (const listener of activateListeners) {
				listener({ waitUntil });
			}
		},
	};
};

describe("registerBackgroundSyncHandlers", () => {
	it("drains the queue inside waitUntil for the shared sync tag", async () => {
		const captured = captureScope();
		const drain = vi.fn(async (): Promise<void> => {
			await tick();
		});
		const queueDepth = vi.fn(async (): Promise<number> => {
			await tick();
			return 0;
		});
		const reregister = vi.fn(async (): Promise<boolean> => {
			await tick();
			return true;
		});
		registerBackgroundSyncHandlers(captured.scope, { drain, queueDepth, reregister });

		const sync = recorder();
		captured.dispatchSync(BACKGROUND_SYNC_TAG, sync.event.waitUntil);

		expect(sync.promises).toHaveLength(1);
		await sync.promises[0];
		expect(drain).toHaveBeenCalledTimes(1);
		// The activate path alone re-registers; a wake's own re-registration is the drain's job.
		expect(reregister).not.toHaveBeenCalled();
	});

	it("ignores sync events carrying a foreign tag", () => {
		const captured = captureScope();
		const drain = vi.fn(async (): Promise<void> => {
			await tick();
		});
		registerBackgroundSyncHandlers(captured.scope, {
			drain,
			queueDepth: vi.fn(async () => {
				await tick();
				return 0;
			}),
			reregister: vi.fn(async () => {
				await tick();
				return true;
			}),
		});

		const sync = recorder();
		captured.dispatchSync("some-other-tag", sync.event.waitUntil);

		expect(drain).not.toHaveBeenCalled();
		expect(sync.promises).toHaveLength(0);
	});

	it("re-registers the tag on activation when the queue is non-empty", async () => {
		const captured = captureScope();
		const reregister = vi.fn(async (): Promise<boolean> => {
			await tick();
			return true;
		});
		registerBackgroundSyncHandlers(captured.scope, {
			drain: vi.fn(async () => {
				await tick();
			}),
			queueDepth: vi.fn(async () => {
				await tick();
				return 2;
			}),
			reregister,
		});

		const activate = recorder();
		captured.dispatchActivate(activate.event.waitUntil);

		expect(activate.promises).toHaveLength(1);
		await activate.promises[0];
		expect(reregister).toHaveBeenCalledTimes(1);
	});

	it("does not re-register on activation when the queue is empty", async () => {
		const captured = captureScope();
		const reregister = vi.fn(async (): Promise<boolean> => {
			await tick();
			return true;
		});
		registerBackgroundSyncHandlers(captured.scope, {
			drain: vi.fn(async () => {
				await tick();
			}),
			queueDepth: vi.fn(async () => {
				await tick();
				return 0;
			}),
			reregister,
		});

		const activate = recorder();
		captured.dispatchActivate(activate.event.waitUntil);

		expect(activate.promises).toHaveLength(1);
		await activate.promises[0];
		expect(reregister).not.toHaveBeenCalled();
	});
});
