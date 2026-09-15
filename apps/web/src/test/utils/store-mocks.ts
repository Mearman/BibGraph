/**
 * Shared store mocking utilities for testing Provides consistent mocking patterns for React Context stores
 */

import React from "react";
import { vi } from "vitest";

/**
 * Hidden reset/update helpers attached to every mock store
 */
interface MockStoreHelpers {
  __mockReset: () => void;
  __mockUpdate: (update: Readonly<Record<string, unknown>>) => void;
}

/**
 * Replace an object's own properties with those from a readonly source, mutating it in place (so existing references to it observe the update) without the untyped bulk assignment `Object.assign` performs
 * @param target - Object to mutate
 * @param source - Properties to copy onto the target
 */
const assignInPlace = (target: Record<string, unknown>, source: Readonly<Record<string, unknown>>): void => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = value;
  }
};

/**
 * Creates a mock Zustand store for testing Provides a consistent way to mock store state and actions
 *
 * `__mockReset`/`__mockUpdate` are real, enumerable properties of the returned object so its type can honestly include them without a type assertion.
 */
export const createMockStore = <T extends Record<string, unknown>>(
  initialState: Partial<T> = {},
): Partial<T> & MockStoreHelpers => {
  const store: Partial<T> & MockStoreHelpers = {
    ...initialState,
    __mockReset: () => {
      for (const key of Object.keys(store)) {
        if (key !== "__mockReset" && key !== "__mockUpdate") {
          Reflect.deleteProperty(store, key);
        }
      }
      assignInPlace(store, initialState);
    },
    __mockUpdate: (update) => {
      assignInPlace(store, update);
    },
  };

  return store;
};

/**
 * Mock layout store with common test state
 */
export const createMockLayoutStore = () =>
  createMockStore({
    animationEnabled: true,
    autoLayout: false,
    layoutType: "d3-force" as const,
    isRunning: false,
    iterations: 0,
    maxIterations: 100,
    toggleAnimation: vi.fn(),
    setAutoLayout: vi.fn(),
    setLayoutType: vi.fn(),
    startLayout: vi.fn(),
    stopLayout: vi.fn(),
    resetLayout: vi.fn(),
  });

/**
 * Mock settings store with common test state
 */
export const createMockSettingsStore = () =>
  createMockStore({
    theme: "light" as const,
    language: "en",
    autoSave: true,
    enableNotifications: true,
    setTheme: vi.fn(),
    setLanguage: vi.fn(),
    setAutoSave: vi.fn(),
    setEnableNotifications: vi.fn(),
    resetSettings: vi.fn(),
  });

/**
 * Mock expansion settings store with common test state
 */
export const createMockExpansionSettingsStore = () =>
  createMockStore({
    maxDepth: 2,
    maxNodes: 100,
    enableAutoExpansion: false,
    expansionDelay: 1000,
    setMaxDepth: vi.fn(),
    setMaxNodes: vi.fn(),
    setEnableAutoExpansion: vi.fn(),
    setExpansionDelay: vi.fn(),
    resetToDefaults: vi.fn(),
  });

/**
 * Utility to mock a store module completely Use this to replace entire store modules in tests
 */
export const mockStoreModule = (storeName: string, mockStore: unknown): void => {
  vi.doMock(`@/stores/${storeName}`, () => ({
    [`use${storeName.charAt(0).toUpperCase() + storeName.slice(1)}`]: () =>
      mockStore,
  }));
};

/**
 * Higher-order function to create store test wrapper Provides consistent store mocking setup for component tests
 */
export const withMockStores = <P extends Record<string, unknown>>(Component: React.ComponentType<P>, stores?: Readonly<{
    layoutStore?: ReturnType<typeof createMockLayoutStore>;
    settingsStore?: ReturnType<typeof createMockSettingsStore>;
    expansionSettingsStore?: ReturnType<
      typeof createMockExpansionSettingsStore
    >;
  }>) => (properties: P) => {
    // Mock stores before rendering
    if (stores?.layoutStore !== undefined) {
      vi.doMock("@/stores/layout-store", () => ({
        useLayoutStore: () => stores.layoutStore,
      }));
    }

    if (stores?.settingsStore !== undefined) {
      vi.doMock("@/stores/settings-store", () => ({
        useSettingsStore: () => stores.settingsStore,
      }));
    }

    if (stores?.expansionSettingsStore !== undefined) {
      vi.doMock("@/stores/expansion-settings-store", () => ({
        useExpansionSettingsStore: () => stores.expansionSettingsStore,
      }));
    }

    return React.createElement(Component, properties);
  };

/**
 * Reset all mocked stores to their initial state Call this in beforeEach to ensure clean test state
 */
export const resetMockStores = (...stores: readonly Pick<MockStoreHelpers, "__mockReset">[]) => {
  for (const store of stores) store.__mockReset();
};
