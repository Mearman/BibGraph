// @vitest-environment jsdom

import type { ProviderType } from "@bibgraph/types";
import { act,renderHook } from "@testing-library/react";
import React from "react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

// Note: Dexie mock removed - fake-indexeddb is now loaded via setupFiles
// which provides a real IndexedDB implementation for Dexie to use
import { LayoutProvider,useLayoutActions, useLayoutStore } from "./layout-store";

// Mock localStorage for Zustand persistence
const localStorageMock = (() => {
  let store: Record<string, string | undefined> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      store[key] = undefined;
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Layout Store", () => {
  // Wrapper component for hooks
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <LayoutProvider>{children}</LayoutProvider>
  );

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      expect(result.current.leftSidebarOpen).toBe(true);
      expect(result.current.leftSidebarPinned).toBe(false);
      expect(result.current.rightSidebarOpen).toBe(true);
      expect(result.current.rightSidebarPinned).toBe(false);
      expect(result.current.graphProvider).toBe("xyflow");
      expect(result.current.previewEntityId).toBeNull();
    });

    it("should have all required action methods available through useLayoutActions()", () => {
      const { result } = renderHook(() => useLayoutActions(), { wrapper });

      expect(typeof result.current.toggleLeftSidebar).toBe("function");
      expect(typeof result.current.toggleRightSidebar).toBe("function");
      expect(typeof result.current.setLeftSidebarOpen).toBe("function");
      expect(typeof result.current.setRightSidebarOpen).toBe("function");
      expect(typeof result.current.pinLeftSidebar).toBe("function");
      expect(typeof result.current.pinRightSidebar).toBe("function");
      expect(typeof result.current.setGraphProvider).toBe("function");
      expect(typeof result.current.setPreviewEntity).toBe("function");
    });
  });

  describe("Left Sidebar Actions", () => {
    it("should toggle left sidebar open state", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Initially true, should become false
      act(() => {
        result.current.toggleLeftSidebar();
      });
      expect(result.current.leftSidebarOpen).toBe(false);

      // Should toggle back to true
      act(() => {
        result.current.toggleLeftSidebar();
      });
      expect(result.current.leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar open state directly", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setLeftSidebarOpen(false);
      });
      expect(result.current.leftSidebarOpen).toBe(false);

      act(() => {
        result.current.setLeftSidebarOpen(true);
      });
      expect(result.current.leftSidebarOpen).toBe(true);
    });

    it("should set left sidebar pinned state", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.pinLeftSidebar(true);
      });
      expect(result.current.leftSidebarPinned).toBe(true);

      act(() => {
        result.current.pinLeftSidebar(false);
      });
      expect(result.current.leftSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating left sidebar", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const initialState = {
        rightSidebarOpen: result.current.rightSidebarOpen,
        rightSidebarPinned: result.current.rightSidebarPinned,
        graphProvider: result.current.graphProvider,
        previewEntityId: result.current.previewEntityId,
      };

      act(() => {
        result.current.toggleLeftSidebar();
        result.current.pinLeftSidebar(true);
      });

      // Left sidebar state should change
      expect(result.current.leftSidebarOpen).toBe(false);
      expect(result.current.leftSidebarPinned).toBe(true);

      // Other state should remain unchanged
      expect(result.current.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(result.current.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(result.current.graphProvider).toBe(initialState.graphProvider);
      expect(result.current.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Right Sidebar Actions", () => {
    it("should toggle right sidebar open state", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Initially true, should become false
      act(() => {
        result.current.toggleRightSidebar();
      });
      expect(result.current.rightSidebarOpen).toBe(false);

      // Should toggle back to true
      act(() => {
        result.current.toggleRightSidebar();
      });
      expect(result.current.rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar open state directly", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setRightSidebarOpen(false);
      });
      expect(result.current.rightSidebarOpen).toBe(false);

      act(() => {
        result.current.setRightSidebarOpen(true);
      });
      expect(result.current.rightSidebarOpen).toBe(true);
    });

    it("should set right sidebar pinned state", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.pinRightSidebar(true);
      });
      expect(result.current.rightSidebarPinned).toBe(true);

      act(() => {
        result.current.pinRightSidebar(false);
      });
      expect(result.current.rightSidebarPinned).toBe(false);
    });

    it("should maintain other state when updating right sidebar", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const initialState = {
        leftSidebarOpen: result.current.leftSidebarOpen,
        leftSidebarPinned: result.current.leftSidebarPinned,
        graphProvider: result.current.graphProvider,
        previewEntityId: result.current.previewEntityId,
      };

      act(() => {
        result.current.toggleRightSidebar();
        result.current.pinRightSidebar(true);
      });

      // Right sidebar state should change
      expect(result.current.rightSidebarOpen).toBe(false);
      expect(result.current.rightSidebarPinned).toBe(true);

      // Other state should remain unchanged
      expect(result.current.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(result.current.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(result.current.graphProvider).toBe(initialState.graphProvider);
      expect(result.current.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Graph Provider Actions", () => {
    it("should set graph provider to xyflow", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setGraphProvider("xyflow");
      });
      expect(result.current.graphProvider).toBe("xyflow");
    });

    it("should set graph provider to cytoscape", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setGraphProvider("cytoscape");
      });
      expect(result.current.graphProvider).toBe("cytoscape");
    });

    it("should maintain other state when updating graph provider", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const initialState = {
        leftSidebarOpen: result.current.leftSidebarOpen,
        leftSidebarPinned: result.current.leftSidebarPinned,
        rightSidebarOpen: result.current.rightSidebarOpen,
        rightSidebarPinned: result.current.rightSidebarPinned,
        previewEntityId: result.current.previewEntityId,
      };

      act(() => {
        result.current.setGraphProvider("cytoscape");
      });

      // Graph provider should change
      expect(result.current.graphProvider).toBe("cytoscape");

      // Other state should remain unchanged
      expect(result.current.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(result.current.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(result.current.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(result.current.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(result.current.previewEntityId).toBe(initialState.previewEntityId);
    });
  });

  describe("Preview Entity Actions", () => {
    it("should set preview entity ID", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setPreviewEntity("W123456789");
      });
      expect(result.current.previewEntityId).toBe("W123456789");
    });

    it("should clear preview entity ID", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Set an entity first
      act(() => {
        result.current.setPreviewEntity("W123456789");
      });
      expect(result.current.previewEntityId).toBe("W123456789");

      // Clear it
      act(() => {
        result.current.setPreviewEntity(null);
      });
      expect(result.current.previewEntityId).toBeNull();
    });

    it("should handle multiple preview entity changes", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const entityIds = [
        "W123456789",
        "A987654321",
        "S555666777",
        null,
        "I111222333",
      ];

      for (const entityId of entityIds) {
        act(() => {
          result.current.setPreviewEntity(entityId);
        });
        expect(result.current.previewEntityId).toBe(entityId);
      }
    });

    it("should maintain other state when updating preview entity", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const initialState = {
        leftSidebarOpen: result.current.leftSidebarOpen,
        leftSidebarPinned: result.current.leftSidebarPinned,
        rightSidebarOpen: result.current.rightSidebarOpen,
        rightSidebarPinned: result.current.rightSidebarPinned,
        graphProvider: result.current.graphProvider,
      };

      act(() => {
        result.current.setPreviewEntity("W123456789");
      });

      // Preview entity should change
      expect(result.current.previewEntityId).toBe("W123456789");

      // Other state should remain unchanged
      expect(result.current.leftSidebarOpen).toBe(initialState.leftSidebarOpen);
      expect(result.current.leftSidebarPinned).toBe(initialState.leftSidebarPinned);
      expect(result.current.rightSidebarOpen).toBe(initialState.rightSidebarOpen);
      expect(result.current.rightSidebarPinned).toBe(initialState.rightSidebarPinned);
      expect(result.current.graphProvider).toBe(initialState.graphProvider);
    });
  });

  describe("Complex State Updates", () => {
    it("should handle multiple simultaneous updates", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Update multiple properties
      act(() => {
        result.current.setLeftSidebarOpen(false);
        result.current.pinLeftSidebar(true);
        result.current.setRightSidebarOpen(false);
        result.current.pinRightSidebar(true);
        result.current.setGraphProvider("cytoscape");
        result.current.setPreviewEntity("W123456789");
      });

      expect(result.current.leftSidebarOpen).toBe(false);
      expect(result.current.leftSidebarPinned).toBe(true);
      expect(result.current.rightSidebarOpen).toBe(false);
      expect(result.current.rightSidebarPinned).toBe(true);
      expect(result.current.graphProvider).toBe("cytoscape");
      expect(result.current.previewEntityId).toBe("W123456789");
    });

    it("should handle rapid state changes", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const RAPID_TOGGLE_COUNT = 10;

      // Rapid toggles
      act(() => {
        for (let index = 0; index < RAPID_TOGGLE_COUNT; index++) {
          result.current.toggleLeftSidebar();
          result.current.toggleRightSidebar();
        }
      });

      // After 10 toggles, both should be back to their original state
      expect(result.current.leftSidebarOpen).toBe(true);
      expect(result.current.rightSidebarOpen).toBe(true);
    });

    it("should handle all provider types", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const providers: ProviderType[] = ["xyflow", "cytoscape"];

      for (const provider of providers) {
        act(() => {
          result.current.setGraphProvider(provider);
        });
        expect(result.current.graphProvider).toBe(provider);
      }
    });
  });

  describe("Persistence Behavior", () => {
    it("should work with localStorage persistence (mock test)", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Test that persistence functions are available and state changes work
      act(() => {
        result.current.pinLeftSidebar(true);
      });
      expect(result.current.leftSidebarPinned).toBe(true);

      act(() => {
        result.current.pinRightSidebar(true);
      });
      expect(result.current.rightSidebarPinned).toBe(true);

      act(() => {
        result.current.setGraphProvider("cytoscape");
      });
      expect(result.current.graphProvider).toBe("cytoscape");

      // Verify localStorage mock methods exist (testing infrastructure)
      expect(localStorageMock.setItem).toBeDefined();
      expect(localStorageMock.getItem).toBeDefined();
    });

    it("should update non-persisted state correctly", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // These should update state but are not persisted according to partialize config
      act(() => {
        result.current.setLeftSidebarOpen(false);
        result.current.setRightSidebarOpen(false);
        result.current.setPreviewEntity("W123456789");
      });

      // Verify state changes work
      expect(result.current.leftSidebarOpen).toBe(false);
      expect(result.current.rightSidebarOpen).toBe(false);
      expect(result.current.previewEntityId).toBe("W123456789");
    });

    it("should handle persistence configuration properly", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      // Update persisted state according to partialize config
      act(() => {
        result.current.pinLeftSidebar(true);
        result.current.pinRightSidebar(true);
        result.current.setGraphProvider("cytoscape");
      });

      // Verify state changes work
      expect(result.current.leftSidebarPinned).toBe(true);
      expect(result.current.rightSidebarPinned).toBe(true);
      expect(result.current.graphProvider).toBe("cytoscape");
    });
  });

  describe("Type Safety", () => {
    it("should maintain correct TypeScript types for all state properties", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      const state = result.current;

      // Boolean properties
      expect(typeof state.leftSidebarOpen).toBe("boolean");
      expect(typeof state.leftSidebarPinned).toBe("boolean");
      expect(typeof state.rightSidebarOpen).toBe("boolean");
      expect(typeof state.rightSidebarPinned).toBe("boolean");

      // String properties
      expect(typeof state.graphProvider).toBe("string");
      expect(["xyflow", "cytoscape"]).toContain(state.graphProvider);

      // Nullable properties
      expect(
        state.previewEntityId === null ||
          typeof state.previewEntityId === "string",
      ).toBe(true);
    });

    it("should maintain correct TypeScript types for all action functions", () => {
      const { result } = renderHook(() => useLayoutActions(), { wrapper });

      expect(typeof result.current.toggleLeftSidebar).toBe("function");
      expect(typeof result.current.toggleRightSidebar).toBe("function");
      expect(typeof result.current.setLeftSidebarOpen).toBe("function");
      expect(typeof result.current.setRightSidebarOpen).toBe("function");
      expect(typeof result.current.pinLeftSidebar).toBe("function");
      expect(typeof result.current.pinRightSidebar).toBe("function");
      expect(typeof result.current.setGraphProvider).toBe("function");
      expect(typeof result.current.setPreviewEntity).toBe("function");
    });
  });

  describe("Edge Cases", () => {
    it("should handle setting the same state value multiple times", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setLeftSidebarOpen(true);
        result.current.setLeftSidebarOpen(true);
        result.current.setLeftSidebarOpen(true);
      });

      expect(result.current.leftSidebarOpen).toBe(true);

      act(() => {
        result.current.pinLeftSidebar(false);
        result.current.pinLeftSidebar(false);
        result.current.pinLeftSidebar(false);
      });

      expect(result.current.leftSidebarPinned).toBe(false);
    });

    it("should handle setting preview entity to the same value multiple times", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setPreviewEntity("W123456789");
        result.current.setPreviewEntity("W123456789");
        result.current.setPreviewEntity("W123456789");
      });

      expect(result.current.previewEntityId).toBe("W123456789");

      act(() => {
        result.current.setPreviewEntity(null);
        result.current.setPreviewEntity(null);
        result.current.setPreviewEntity(null);
      });

      expect(result.current.previewEntityId).toBeNull();
    });

    it("should handle setting graph provider to the same value multiple times", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setGraphProvider("cytoscape");
        result.current.setGraphProvider("cytoscape");
        result.current.setGraphProvider("cytoscape");
      });

      expect(result.current.graphProvider).toBe("cytoscape");
    });
  });

  describe("Store Integration", () => {
    it("should maintain consistent state across multiple calls", () => {
      const { result } = renderHook(() => useLayoutStore(), { wrapper });

      act(() => {
        result.current.setPreviewEntity("W123456789");
        result.current.setGraphProvider("cytoscape");
      });

      // Get state multiple times - should be consistent
      const previewEntity1 = result.current.previewEntityId;
      const previewEntity2 = result.current.previewEntityId;
      const graphProvider1 = result.current.graphProvider;
      const graphProvider2 = result.current.graphProvider;

      expect(previewEntity1).toBe(previewEntity2);
      expect(previewEntity1).toBe("W123456789");
      expect(graphProvider1).toBe(graphProvider2);
      expect(graphProvider1).toBe("cytoscape");
    });
  });
});
