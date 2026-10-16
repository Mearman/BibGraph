/**
 * Unit tests for the Background Sync registration guard: the page-side branch (navigator.serviceWorker.ready) and the feature-detection branch used by the Settings copy. jsdom ships no service worker container, so the absent-API branch is the environment's real shape; the present branch stubs it.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { BACKGROUND_SYNC_TAG } from "./queue-schema";
import {
  isBackgroundSyncSupported,
  registerSyncTag,
  requestBackgroundSyncDrain,
} from "./register-sync";

interface SyncManagerStub {
  register: (tag: string) => Promise<void>;
}

/**
 * Every async fake awaits one microtask: the repo's require-await and promise-function-async rules demand it.
 */
const tick = async (): Promise<void> => {
  await Promise.resolve();
};

const stubReadyRegistration = (registration: unknown): void => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  });
};

describe("requestBackgroundSyncDrain", () => {
  afterEach(() => {
    // jsdom has no serviceWorker container by default; restore that shape.
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  it("registers the shared sync tag when the API is present", async () => {
    const register = vi.fn(async (): Promise<void> => {
      await Promise.resolve();
    });
    stubReadyRegistration({ sync: { register } });

    const requested = await requestBackgroundSyncDrain();

    expect(requested).toBe(true);
    expect(register).toHaveBeenCalledWith(BACKGROUND_SYNC_TAG);
  });

  it("returns false without throwing when the browser has no service worker container", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    await expect(requestBackgroundSyncDrain()).resolves.toBe(false);
  });

  it("returns false when the registration has no sync manager (Safari shape)", async () => {
    stubReadyRegistration({});

    await expect(requestBackgroundSyncDrain()).resolves.toBe(false);
  });

  it("returns false when sync.register itself rejects", async () => {
    const register = vi.fn(async (): Promise<void> => {
      await tick();
      throw new Error("sync storage full");
    });
    stubReadyRegistration({ sync: { register } });

    await expect(requestBackgroundSyncDrain()).resolves.toBe(false);
  });
});

describe("registerSyncTag", () => {
  it("registers through a directly-held registration object (the service worker's own)", async () => {
    const register = vi.fn(async (): Promise<void> => {
      await Promise.resolve();
    });

    const requested = await registerSyncTag({ sync: { register } } as unknown as ServiceWorkerRegistration);

    expect(requested).toBe(true);
    expect(register).toHaveBeenCalledWith(BACKGROUND_SYNC_TAG);
  });

  it("returns false for a registration without a sync manager", async () => {
    await expect(registerSyncTag({} as unknown as ServiceWorkerRegistration)).resolves.toBe(false);
  });
});

describe("isBackgroundSyncSupported", () => {
  it("reports support only when ServiceWorkerRegistration.prototype carries sync", () => {
    // jsdom defines no ServiceWorkerRegistration at all: unsupported by default.
    expect(isBackgroundSyncSupported()).toBe(false);

    // Plain objects standing in for the constructor: feature detection reads .prototype, where the real SyncManager lives.
    const withoutSync = { prototype: {} };
    vi.stubGlobal("ServiceWorkerRegistration", withoutSync);
    expect(isBackgroundSyncSupported()).toBe(false);

    const withSync = {
      prototype: {
        get sync(): SyncManagerStub {
          return {
            register: async (): Promise<void> => {
              await Promise.resolve();
            },
          };
        },
      },
    };
    vi.stubGlobal("ServiceWorkerRegistration", withSync);
    expect(isBackgroundSyncSupported()).toBe(true);

    vi.unstubAllGlobals();
  });
});
