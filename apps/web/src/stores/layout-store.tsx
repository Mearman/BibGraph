/**
 * Group-based layout store for VSCode-style sidebar state management
 * React Context-based implementation replacing Zustand
 */

import type { ProviderType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import Dexie, { type Table } from "dexie";
import React, { createContext, type ReactNode, use, useEffect, useMemo, useReducer } from "react";

const PROVIDER_TYPES: readonly ProviderType[] = ["xyflow", "d3", "cytoscape"];
const PROVIDER_TYPE_SET = new Set<string>(PROVIDER_TYPES);
const isProviderType = (value: string): value is ProviderType => PROVIDER_TYPE_SET.has(value);

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Per-key converters for migrating loosely-typed legacy localStorage values into the properly typed LayoutPersistedState shape, keyed so each property gets its own concrete conversion (Boolean() coercion, or a validated ProviderType) without a generic function needing an unsound type assertion to satisfy its own signature.
type LayoutMigrators = {
  [K in keyof LayoutPersistedState]-?: (value: unknown) => LayoutPersistedState[K];
};

const layoutMigrators: LayoutMigrators = {
  leftSidebarOpen: Boolean,
  leftSidebarPinned: Boolean,
  rightSidebarOpen: Boolean,
  rightSidebarPinned: Boolean,
  graphProvider: (value) =>
    typeof value === "string" && isProviderType(value) ? value : undefined,
  autoPinOnLayoutStabilization: Boolean,
};

// Database schema for layout persistence
interface LayoutRecord {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

// Dexie database class for layout store
class LayoutDB extends Dexie {
  layout!: Table<LayoutRecord>;

  constructor() {
    super("bibgraph-layout");

    this.version(1).stores({
      layout: "++id, key, updatedAt",
    });
  }
}

// Singleton instance
let databaseInstance: LayoutDB | null = null;

const getDB = (): LayoutDB => {
  databaseInstance ??= new LayoutDB();
  return databaseInstance;
};

/**
 * Pure Dexie layout persistence service
 */
class LayoutPersistenceService {
  private readonly db: LayoutDB;
  private readonly logger = logger;

  constructor() {
    this.db = getDB();
  }

  /**
   * Get persisted layout state
   */
  async getLayoutState(): Promise<Partial<LayoutPersistedState>> {
    try {
      const records = await this.db.layout.toArray();
      const layoutState: Partial<LayoutPersistedState> = {};

      for (const record of records) {
        try {
          const parsedValue: unknown = JSON.parse(record.value);

          switch (record.key) {
            case "leftSidebarOpen":
              layoutState.leftSidebarOpen = Boolean(parsedValue);
              break;
            case "leftSidebarPinned":
              layoutState.leftSidebarPinned = Boolean(parsedValue);
              break;
            case "rightSidebarOpen":
              layoutState.rightSidebarOpen = Boolean(parsedValue);
              break;
            case "rightSidebarPinned":
              layoutState.rightSidebarPinned = Boolean(parsedValue);
              break;
            case "graphProvider":
              if (typeof parsedValue === "string" && isProviderType(parsedValue)) {
                layoutState.graphProvider = parsedValue;
              }
              break;
            case "autoPinOnLayoutStabilization":
              layoutState.autoPinOnLayoutStabilization = Boolean(parsedValue);
              break;
          }
        } catch (parseError) {
          this.logger.warn(
            "layout-persistence",
            `Failed to parse stored value for key: ${record.key}`,
            {
              error: parseError,
              value: record.value,
            },
          );
        }
      }

      return layoutState;
    } catch (error) {
      this.logger.error("layout-persistence", "Failed to load layout state", {
        error,
      });
      return {};
    }
  }

  /**
   * Persist a layout state property
   */
  async setLayoutProperty<K extends keyof LayoutPersistedState>(
    key: K,
    value: LayoutPersistedState[K],
  ): Promise<void> {
    try {
      await this.db.layout.put({
        key,
        value: JSON.stringify(value),
        updatedAt: new Date(),
      });

      this.logger.debug(
        "layout-persistence",
        `Persisted layout property: ${key}`,
      );
    } catch (error) {
      this.logger.error(
        "layout-persistence",
        `Failed to persist layout property: ${key}`,
        {
          error,
          value,
        },
      );
      throw error;
    }
  }

  /**
   * Clear all persisted layout state
   */
  async clearLayoutState(): Promise<void> {
    try {
      await this.db.layout.clear();
      this.logger.debug(
        "layout-persistence",
        "Cleared all persisted layout state",
      );
    } catch (error) {
      this.logger.error("layout-persistence", "Failed to clear layout state", {
        error,
      });
      throw error;
    }
  }

  /**
   * Migrate from old storage format if needed
   */
  async migrateFromOldStorage(): Promise<void> {
    try {
      // Check if migration already happened
      const migrationKey = "migration-completed";
      const existingMigration = await this.db.layout.get({
        key: migrationKey,
      });

      if (existingMigration) {
        this.logger.debug("layout-persistence", "Migration already completed");
        return;
      }

      // Try to load from old localStorage (if any existed)
      let isMigratedData = false;

      if (typeof localStorage !== "undefined") {
        try {
          // Look for any old layout state in localStorage
          const oldLayoutState = localStorage.getItem("layout-store");
          if (oldLayoutState !== null) {
            const parsed: unknown = JSON.parse(oldLayoutState);
            const parsedRecord = isRecordObject(parsed) ? parsed : undefined;
            const state = isRecordObject(parsedRecord?.state) ? parsedRecord.state : undefined;

            if (state !== undefined) {
              // Migrate individual properties
              const persistableKeys: (keyof LayoutPersistedState)[] = [
                "leftSidebarOpen",
                "leftSidebarPinned",
                "rightSidebarOpen",
                "rightSidebarPinned",
                "graphProvider",
                "autoPinOnLayoutStabilization",
              ];

              for (const key of persistableKeys) {
                if (!(key in state)) {
                	continue;
                }

                await this.setLayoutProperty(key, layoutMigrators[key](state[key]));
                isMigratedData = true;
              }

              this.logger.debug(
                "layout-persistence",
                "Migrated layout state from localStorage",
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            "layout-persistence",
            "Failed to migrate from localStorage",
            {
              error,
            },
          );
        }
      }

      // Mark migration as completed
      await this.db.layout.put({
        key: migrationKey,
        value: "true",
        updatedAt: new Date(),
      });

      this.logger.debug("layout-persistence", "Migration completed", {
        migratedData: isMigratedData,
      });
    } catch (error) {
      this.logger.error("layout-persistence", "Migration failed", { error });
    }
  }
}

// Singleton instance
const persistenceService = new LayoutPersistenceService();

// Helper function to handle persistence operations safely in test environments
const safePersist = async (operation: Readonly<Promise<void>>): Promise<void> => {
  // Skip persistence entirely in test environments to avoid slowdowns
  if (typeof process !== "undefined" && process.env.VITEST !== undefined && process.env.VITEST !== "") {
    return;
  }

  try {
    await operation;
  } catch (error: unknown) {
    // In test environments, persistence may fail due to missing IndexedDB
    if (typeof process !== "undefined" && process.env.VITEST !== undefined && process.env.VITEST !== "") {
      logger.debug("layout-store", "Persistence failed in test environment", {
        error,
      });
    } else {
      throw error;
    }
  }
};

interface LayoutState {
  // Sidebar states
  leftSidebarOpen: boolean;
  leftSidebarPinned: boolean;
  rightSidebarOpen: boolean;
  rightSidebarPinned: boolean;

  // Autohide states
  leftSidebarAutoHidden: boolean;
  rightSidebarAutoHidden: boolean;

  // Hover states for autohide
  leftSidebarHovered: boolean;
  rightSidebarHovered: boolean;

  // Graph provider selection
  graphProvider: ProviderType;

  // Preview entity (for hover/selection)
  previewEntityId: string | null;

  // Graph behavior preferences
  autoPinOnLayoutStabilization: boolean;
}

type LayoutPersistedState = Partial<
  Pick<
    LayoutState,
    | "leftSidebarOpen"
    | "leftSidebarPinned"
    | "rightSidebarOpen"
    | "rightSidebarPinned"
    | "graphProvider"
    | "autoPinOnLayoutStabilization"
  >
>;

// Initial state
const getInitialState = (): LayoutState => ({
  leftSidebarOpen: true,
  leftSidebarPinned: false,
  rightSidebarOpen: true,
  rightSidebarPinned: false,
  leftSidebarAutoHidden: false,
  rightSidebarAutoHidden: false,
  leftSidebarHovered: false,
  rightSidebarHovered: false,
  graphProvider: "xyflow",
  previewEntityId: null,
  autoPinOnLayoutStabilization: false,
});

// Action types
type LayoutAction =
  | { type: "TOGGLE_LEFT_SIDEBAR" }
  | { type: "TOGGLE_RIGHT_SIDEBAR" }
  | { type: "SET_LEFT_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_OPEN"; payload: boolean }
  | { type: "PIN_LEFT_SIDEBAR"; payload: boolean }
  | { type: "PIN_RIGHT_SIDEBAR"; payload: boolean }
  | { type: "SET_LEFT_SIDEBAR_AUTO_HIDDEN"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_AUTO_HIDDEN"; payload: boolean }
  | { type: "SET_LEFT_SIDEBAR_HOVERED"; payload: boolean }
  | { type: "SET_RIGHT_SIDEBAR_HOVERED"; payload: boolean }
  | { type: "SET_GRAPH_PROVIDER"; payload: ProviderType }
  | { type: "SET_PREVIEW_ENTITY"; payload: string | null }
  | { type: "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION"; payload: boolean }
  | { type: "LOAD_PERSISTED_STATE"; payload: Partial<LayoutState> };

// Reducer
const layoutReducer = (state: Readonly<LayoutState>, action: LayoutAction): LayoutState => {
  switch (action.type) {
    case "TOGGLE_LEFT_SIDEBAR":
      return { ...state, leftSidebarOpen: !state.leftSidebarOpen };
    case "TOGGLE_RIGHT_SIDEBAR":
      return { ...state, rightSidebarOpen: !state.rightSidebarOpen };
    case "SET_LEFT_SIDEBAR_OPEN":
      return { ...state, leftSidebarOpen: action.payload };
    case "SET_RIGHT_SIDEBAR_OPEN":
      return { ...state, rightSidebarOpen: action.payload };
    case "PIN_LEFT_SIDEBAR":
      return { ...state, leftSidebarPinned: action.payload };
    case "PIN_RIGHT_SIDEBAR":
      return { ...state, rightSidebarPinned: action.payload };
    case "SET_LEFT_SIDEBAR_AUTO_HIDDEN":
      return { ...state, leftSidebarAutoHidden: action.payload };
    case "SET_RIGHT_SIDEBAR_AUTO_HIDDEN":
      return { ...state, rightSidebarAutoHidden: action.payload };
    case "SET_LEFT_SIDEBAR_HOVERED":
      return { ...state, leftSidebarHovered: action.payload };
    case "SET_RIGHT_SIDEBAR_HOVERED":
      return { ...state, rightSidebarHovered: action.payload };
    case "SET_GRAPH_PROVIDER":
      return { ...state, graphProvider: action.payload };
    case "SET_PREVIEW_ENTITY":
      return { ...state, previewEntityId: action.payload };
    case "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION":
      return { ...state, autoPinOnLayoutStabilization: action.payload };
    case "LOAD_PERSISTED_STATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

// Context
const LayoutContext = createContext<{
  state: LayoutState;
  dispatch: React.Dispatch<LayoutAction>;
} | null>(null);

// Provider component
export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(layoutReducer, getInitialState());

  // Initialize persisted state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip in test environments
    if (typeof process !== "undefined" && process.env.VITEST !== undefined && process.env.VITEST !== "") return;

    const initializeState = async () => {
      try {
        // Run migration first
        await persistenceService.migrateFromOldStorage();

        // Load persisted state
        const persistedState = await persistenceService.getLayoutState();
        if (Object.keys(persistedState).length > 0) {
          dispatch({ type: "LOAD_PERSISTED_STATE", payload: persistedState });
        }
      } catch (error) {
        logger.error("layout-store", "Failed to initialize persisted state", {
          error,
        });
      }
    };

    void initializeState();
  }, []);

  // Persist state changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Skip in test environments
    if (typeof process !== "undefined" && process.env.VITEST !== undefined && process.env.VITEST !== "") return;

    const persistChanges = async () => {
      const persistableKeys: (keyof LayoutPersistedState)[] = [
        "leftSidebarOpen",
        "leftSidebarPinned",
        "rightSidebarOpen",
        "rightSidebarPinned",
        "graphProvider",
        "autoPinOnLayoutStabilization",
      ];

      for (const key of persistableKeys) {
        if (key in state) {
          await safePersist(
            persistenceService.setLayoutProperty(key, state[key]),
          );
        }
      }
    };

    void persistChanges();
  }, [state]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <LayoutContext value={contextValue}>
      {children}
    </LayoutContext>
  );
};

// Hook for using layout state
export const useLayoutState = () => {
  const context = use(LayoutContext);
  if (!context) {
    // Log warning in development but return safe defaults to prevent hook ordering violations
    if (import.meta.env.DEV) {
      logger.warn("layout", "useLayoutState called outside LayoutProvider - returning defaults");
    }
    // Return initial state as fallback to maintain hook consistency
    return getInitialState();
  }
  return context.state;
};

// Stable no-op function for fallback
const createNoOpFunction = () => () => {
  logger.warn("layout", "Attempted to call layout action outside LayoutProvider");
};

// Create stable fallback objects once to maintain consistency
const createFallbackActions = () => {
  const noOp = createNoOpFunction();
  return {
    toggleLeftSidebar: noOp,
    toggleRightSidebar: noOp,
    setLeftSidebarOpen: noOp,
    setRightSidebarOpen: noOp,
    pinLeftSidebar: noOp,
    pinRightSidebar: noOp,
    setLeftSidebarAutoHidden: noOp,
    setRightSidebarAutoHidden: noOp,
    setLeftSidebarHovered: noOp,
    setRightSidebarHovered: noOp,
    setGraphProvider: noOp,
    setPreviewEntity: noOp,
    setAutoPinOnLayoutStabilization: noOp,
  };
};

// Create stable fallback once
const fallbackActions = createFallbackActions();

// Hook for using layout actions
export const useLayoutActions = () => {
  const context = use(LayoutContext);
  if (!context) {
    // Log warning in development but return safe no-op actions to prevent hook ordering violations
    if (import.meta.env.DEV) {
      logger.warn("layout", "useLayoutActions called outside LayoutProvider - returning no-op actions");
    }
    // Return stable fallback object to maintain hook consistency
    return fallbackActions;
  }

  return {
    toggleLeftSidebar: () => { context.dispatch({ type: "TOGGLE_LEFT_SIDEBAR" }); },
    toggleRightSidebar: () => { context.dispatch({ type: "TOGGLE_RIGHT_SIDEBAR" }); },
    setLeftSidebarOpen: (open: boolean) => {
      context.dispatch({ type: "SET_LEFT_SIDEBAR_OPEN", payload: open });
    },
    setRightSidebarOpen: (open: boolean) => {
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_OPEN", payload: open });
    },
    pinLeftSidebar: (pinned: boolean) => {
      context.dispatch({ type: "PIN_LEFT_SIDEBAR", payload: pinned });
    },
    pinRightSidebar: (pinned: boolean) => {
      context.dispatch({ type: "PIN_RIGHT_SIDEBAR", payload: pinned });
    },
    setLeftSidebarAutoHidden: (autoHidden: boolean) => {
      context.dispatch({ type: "SET_LEFT_SIDEBAR_AUTO_HIDDEN", payload: autoHidden });
    },
    setRightSidebarAutoHidden: (autoHidden: boolean) => {
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_AUTO_HIDDEN", payload: autoHidden });
    },
    setLeftSidebarHovered: (hovered: boolean) => {
      context.dispatch({ type: "SET_LEFT_SIDEBAR_HOVERED", payload: hovered });
    },
    setRightSidebarHovered: (hovered: boolean) => {
      context.dispatch({ type: "SET_RIGHT_SIDEBAR_HOVERED", payload: hovered });
    },
    setGraphProvider: (provider: ProviderType) => {
      context.dispatch({ type: "SET_GRAPH_PROVIDER", payload: provider });
    },
    setPreviewEntity: (entityId: string | null) => {
      context.dispatch({ type: "SET_PREVIEW_ENTITY", payload: entityId });
    },
    setAutoPinOnLayoutStabilization: (enabled: boolean) => {
      context.dispatch({ type: "SET_AUTO_PIN_ON_LAYOUT_STABILIZATION", payload: enabled });
    },
  };
};

// Combined hook for both state and actions
export const useLayoutStore = () => {
  const state = useLayoutState();
  const actions = useLayoutActions();

  return {
    ...state,
    ...actions,
  };
};

// Selector hook for optimized re-renders
export const useLayoutSelector = <T,>(selector: (state: Readonly<LayoutState>) => T): T => {
  const state = useLayoutState();
  return selector(state);
};