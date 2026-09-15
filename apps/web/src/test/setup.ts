// Ensure fake-indexeddb is loaded first before any Dexie usage This must be imported synchronously at the top of the file
import "fake-indexeddb/auto";

// Ensure TextEncoder/TextDecoder are available synchronously before any other code This is critical for esbuild to work properly in test environments
import { Buffer } from "node:buffer";
import { TextDecoder as NodeTextDecoder,TextEncoder as NodeTextEncoder } from "node:util";

import type { QueryClient } from "@tanstack/react-query";
import type * as ReactRouterModule from "@tanstack/react-router";

declare global {
  var __DEV__: boolean | undefined;
  var testQueryClient: QueryClient | undefined;
}

const MAX_TEST_LISTENERS = 50;
const GC_TRIGGER_PROBABILITY = 0.1;

try {
  global.TextEncoder = NodeTextEncoder;
  global.TextDecoder = NodeTextDecoder;
  globalThis.TextEncoder = NodeTextEncoder;
  globalThis.TextDecoder = NodeTextDecoder;
} catch {
  // If util import fails, create minimal implementations
  global.TextEncoder = class {
    encoding = "utf-8";
    encode(input = ""): Uint8Array<ArrayBuffer> {
      // Uint8Array.from allocates a fresh ArrayBuffer-backed copy, unlike viewing Buffer.buffer directly (typed as ArrayBufferLike, which admits SharedArrayBuffer).
      return Uint8Array.from(Buffer.from(input, "utf-8"));
    }
    encodeInto(input: string, destination: Uint8Array): { read: number; written: number } {
      const encoded = this.encode(input);
      const copied = Math.min(encoded.length, destination.length);
      destination.set(encoded.subarray(0, copied));
      return { read: input.length, written: copied };
    }
  };

  global.TextDecoder = class {
    encoding = "utf-8";
    fatal = false;
    ignoreBOM = false;
    decode(input) {
      return Buffer.from(input).toString("utf-8");
    }
  };

  globalThis.TextEncoder = global.TextEncoder;
  globalThis.TextDecoder = global.TextDecoder;
}

/**
 * Vitest setup file This file runs before each test file
 */

// Make this a module to allow top-level await


// Only load Vitest in actual test environments, not during dev server startup
if (typeof process !== "undefined" && process.env.VITEST !== undefined && process.env.VITEST !== "") {
  const { vi } = await import("vitest");

  // Import jest-dom for Vitest - extends expect with DOM matchers The vitest environment should be set to jsdom for component tests
  await import("@testing-library/jest-dom/vitest");

  await import("vitest-axe/extend-expect");
  const { resetMockServer, startMockServer, stopMockServer } = await import(
    "./msw/server"
  );

  // Configure test environment globals
  globalThis.__DEV__ = true;

  // Increase process event listener limits to prevent MaxListenersExceededWarning This is common in test environments with multiple parallel operations
  if (typeof process !== "undefined") {
    process.setMaxListeners(MAX_TEST_LISTENERS);
  }

  // Immer enableMapSet() removed - not needed since we're not using Zustand/Immer anymore

  // Environment-aware DOM mocking (only for jsdom environment)
  if (typeof window === "undefined") {
    // Mock localStorage for node environment (integration/e2e tests) This prevents Zustand persist middleware warnings
    const mockStorage = {
      getItem: () => null,
      setItem: () => { /* Intentional no-op: test double */ },
      removeItem: () => { /* Intentional no-op: test double */ },
      clear: () => { /* Intentional no-op: test double */ },
      length: 0,
      key: () => null,
    };

    global.localStorage = mockStorage;
    global.sessionStorage = mockStorage;
  } else {
    // Mock matchMedia for component tests that use responsive hooks
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  // TextEncoder/TextDecoder setup is handled above synchronously

  // Mock ResizeObserver for components that measure elements
  global.ResizeObserver = class ResizeObserver {
    observe() { /* Intentional no-op: test double */ }
    unobserve() { /* Intentional no-op: test double */ }
    disconnect() { /* Intentional no-op: test double */ }
  };

  // Mock IntersectionObserver for components that use visibility detection
  globalThis.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "";
    scrollMargin = "";
    thresholds: readonly number[] = [];
    observe(): void { /* Intentional no-op: test double */ }
    unobserve(): void { /* Intentional no-op: test double */ }
    disconnect(): void { /* Intentional no-op: test double */ }
    takeRecords(): IntersectionObserverEntry[] { return []; }
  };

  // Setup MSW server for API mocking Only in test environments with proper globals
  if (
    typeof beforeAll === "function" &&
    typeof afterAll === "function" &&
    typeof afterEach === "function"
  ) {
    beforeAll(() => {
      startMockServer();
    });

    afterAll(() => {
      stopMockServer();
    });

    afterEach(async () => {
      // Reset MSW handlers between tests
      resetMockServer();

      // Simplified IndexedDB cleanup for faster test execution Only perform full cleanup in integration tests to save time
      const currentState = expect.getState();
      const isIntegrationTest = currentState.currentTestName?.includes('integration') === true;

      if (isIntegrationTest && typeof indexedDB !== "undefined") {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(async (database) => {
              if (database.name?.startsWith('test-') === true) {
                return new Promise<void>((resolve) => {
                  const request = indexedDB.deleteDatabase(database.name!);
                  request.onsuccess = () => { resolve(); };
                  request.onerror = () => { resolve(); }; // Ignore errors for speed
                  request.onblocked = () => { resolve(); };
                });
              }
              return undefined;
            })
          );
        } catch {
          // Ignore errors during cleanup
        }
      }

      // Less aggressive garbage collection for performance
      if (global.gc && Math.random() < GC_TRIGGER_PROBABILITY) { // Only 10% of the time
        global.gc();
      }
    });
  }

  // React Query setup for component tests
  if (typeof window !== "undefined") {
    // Only set up React Query in DOM environment (component tests)
    const { QueryClient: RuntimeQueryClient } = await import("@tanstack/react-query");

    // Create a new QueryClient for each test
    const createTestQueryClient = () =>
      new RuntimeQueryClient({
        defaultOptions: {
          queries: {
            // Turn off retries for tests
            retry: false,
            // Turn off refetch on window focus for tests
            refetchOnWindowFocus: false,
          },
          mutations: {
            // Turn off retries for tests
            retry: false,
          },
        },
      });

    // Make QueryClient available globally for tests
    globalThis.testQueryClient = createTestQueryClient();
  }

  // Partial module mocks to protect integration tests that expect certain exports from framework libraries. These mocks are safe fallbacks that preserve original behavior when available. Partially mock @tanstack/react-router to ensure createFileRoute exists Tests often import createFileRoute and expect it to return a route factory. If the real module is present, we preserve it via importOriginal.
  try {
    vi.mock("@tanstack/react-router", async (importOriginal) => {
      const actual = await importOriginal<typeof ReactRouterModule>();
      return {
        ...actual,
        createFileRoute: actual.createFileRoute,
      };
    });
  } catch {
    // If mocking fails (for e.g. running in an environment without vi), ignore
  }

  // Simple stub for 'history' package if imports fail in test transforms
  try {
    vi.mock("history", () => ({
      createBrowserHistory: () => ({
        listen: () => { /* Intentional no-op: test double */ },
        push: () => { /* Intentional no-op: test double */ },
      }),
      createMemoryHistory: () => ({
        listen: () => { /* Intentional no-op: test double */ },
        push: () => { /* Intentional no-op: test double */ },
      }),
    }));
  } catch {
    // ignore
  }
}
