/**
 * React context provider and hooks for app activity store
 */

import { logger } from "@bibgraph/utils/logger";
import React, {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useReducer,
} from "react";

import { generateEventId } from "./computed";
import { loadEventsFromDB } from "./database";
import { appActivityReducer, initialState } from "./reducer";
import type {
  AppActivityContextType,
  AppActivityEvent,
  AppActivityState,
} from "./types";

const DB_LOAD_LIMIT = 1000;

const AppActivityContext = createContext<AppActivityContextType | null>(null);

interface AppActivityProviderProps {
  children: ReactNode;
}

export const AppActivityProvider: React.FC<AppActivityProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appActivityReducer, initialState);

  // Load persisted events on mount
  React.useEffect(() => {
    const loadEvents = async () => {
      const events = await loadEventsFromDB(DB_LOAD_LIMIT);
      dispatch({ type: "LOAD_EVENTS", payload: events });

      if (Object.keys(events).length > initialState.maxHistorySize) {
        dispatch({ type: "CLEAR_OLD_EVENTS" });
      }
    };

    void loadEvents();
  }, []);

  const addEvent = useCallback(
    (event: Omit<AppActivityEvent, "id" | "timestamp">): string => {
      const id = generateEventId();
      dispatch({ type: "ADD_EVENT", payload: event });

      const currentEventCount = Object.keys(state.events).length + 1;
      if (currentEventCount > state.maxHistorySize) {
        dispatch({ type: "CLEAR_OLD_EVENTS" });
      }

      return id;
    },
    [state.events, state.maxHistorySize],
  );

  const updateEvent = useCallback(
    (id: string, updates: Partial<AppActivityEvent>) => {
      dispatch({ type: "UPDATE_EVENT", payload: { id, updates } });
    },
    [],
  );

  const removeEvent = useCallback((id: string) => {
    dispatch({ type: "REMOVE_EVENT", payload: id });
  }, []);

  const clearOldEvents = useCallback(() => {
    dispatch({ type: "CLEAR_OLD_EVENTS" });
  }, []);

  const clearAllEvents = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_EVENTS" });
  }, []);

  const loadEvents = useCallback(async () => {
    const events = await loadEventsFromDB(DB_LOAD_LIMIT);
    dispatch({ type: "LOAD_EVENTS", payload: events });

    if (Object.keys(events).length > state.maxHistorySize) {
      dispatch({ type: "CLEAR_OLD_EVENTS" });
    }
  }, [state.maxHistorySize]);

  const logUserInteraction = useCallback(
    (
      action: string,
      component?: string,
      metadata?: Record<string, unknown>,
    ) => {
      addEvent({
        type: "user",
        category: "interaction",
        event: action,
        description: `User ${action}${component ? ` in ${component}` : ""}`,
        severity: "info",
        metadata: { component, ...metadata },
      });
    },
    [addEvent],
  );

  const logNavigation = useCallback(
    (from: string, to: string, metadata?: Record<string, unknown>) => {
      addEvent({
        type: "navigation",
        category: "interaction",
        event: "navigate",
        description: `Navigation from ${from} to ${to}`,
        severity: "info",
        metadata: { route: to, previousRoute: from, ...metadata },
      });
    },
    [addEvent],
  );

  const logComponentMount = useCallback(
    (component: string, metadata?: Record<string, unknown>) => {
      addEvent({
        type: "component",
        category: "lifecycle",
        event: "mount",
        description: `Component ${component} mounted`,
        severity: "debug",
        metadata: { component, ...metadata },
      });
    },
    [addEvent],
  );

  const logComponentUnmount = useCallback(
    (component: string, metadata?: Record<string, unknown>) => {
      addEvent({
        type: "component",
        category: "lifecycle",
        event: "unmount",
        description: `Component ${component} unmounted`,
        severity: "debug",
        metadata: { component, ...metadata },
      });
    },
    [addEvent],
  );

  const logPerformanceMetric = useCallback(
    (metric: string, value: number, metadata?: Record<string, unknown>) => {
      addEvent({
        type: "performance",
        category: "data",
        event: metric,
        description: `Performance metric: ${metric} = ${value}`,
        severity: "info",
        metadata: { performance: { [metric]: value }, ...metadata },
      });
    },
    [addEvent],
  );

  const logError = useCallback(
    (
      error: string,
      component?: string,
      metadata?: Record<string, unknown>,
    ) => {
      addEvent({
        type: "error",
        category: "data",
        event: "error",
        description: error,
        severity: "error",
        metadata: { component, ...metadata },
      });
    },
    [addEvent],
  );

  const logWarning = useCallback(
    (
      warning: string,
      component?: string,
      metadata?: Record<string, unknown>,
    ) => {
      addEvent({
        type: "system",
        category: "data",
        event: "warning",
        description: warning,
        severity: "warning",
        metadata: { component, ...metadata },
      });
    },
    [addEvent],
  );

  const logApiCall = useCallback(
    (
      entityType: string,
      entityId?: string,
      queryParams?: Record<string, unknown>,
    ) => {
      addEvent({
        type: "api",
        category: "data",
        event: "call",
        description: `API call for ${entityType}${entityId ? ` (${entityId})` : ""}`,
        severity: "info",
        metadata: { entityType, entityId, queryParams },
      });
    },
    [addEvent],
  );

  const setTypeFilter = useCallback((types: string[]) => {
    dispatch({ type: "SET_TYPE_FILTER", payload: types });
  }, []);

  const setCategoryFilter = useCallback((categories: string[]) => {
    dispatch({ type: "SET_CATEGORY_FILTER", payload: categories });
  }, []);

  const setSeverityFilter = useCallback((severities: string[]) => {
    dispatch({ type: "SET_SEVERITY_FILTER", payload: severities });
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: "SET_SEARCH_TERM", payload: term });
  }, []);

  const setTimeRange = useCallback((minutes: number) => {
    dispatch({ type: "SET_TIME_RANGE", payload: minutes });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  const contextValue: AppActivityContextType = useMemo(
    () => ({
      state,
      addEvent,
      updateEvent,
      removeEvent,
      clearOldEvents,
      clearAllEvents,
      loadEvents,
      logUserInteraction,
      logNavigation,
      logComponentMount,
      logComponentUnmount,
      logPerformanceMetric,
      logError,
      logWarning,
      logApiCall,
      setTypeFilter,
      setCategoryFilter,
      setSeverityFilter,
      setSearchTerm,
      setTimeRange,
      clearFilters,
    }),
    [
      state,
      addEvent,
      updateEvent,
      removeEvent,
      clearOldEvents,
      clearAllEvents,
      loadEvents,
      logUserInteraction,
      logNavigation,
      logComponentMount,
      logComponentUnmount,
      logPerformanceMetric,
      logError,
      logWarning,
      logApiCall,
      setTypeFilter,
      setCategoryFilter,
      setSeverityFilter,
      setSearchTerm,
      setTimeRange,
      clearFilters,
    ],
  );

  return (
    <AppActivityContext value={contextValue}>{children}</AppActivityContext>
  );
};

// Create stable fallback functions
const createFallbackAppActivityActions = () => {
  const createNoOp = () => () => {
    logger.warn(
      "ui",
      "Attempted to call app activity action outside AppActivityProvider",
    );
  };

  const createNoOpAsync = () => async () => {
    logger.warn(
      "ui",
      "Attempted to call async app activity action outside AppActivityProvider",
    );
  };

  const createNoOpWithString = () => () => {
    logger.warn(
      "ui",
      "Attempted to call app activity action outside AppActivityProvider",
    );
    return "";
  };

  return {
    addEvent: createNoOpWithString(),
    updateEvent: createNoOp(),
    removeEvent: createNoOp(),
    clearOldEvents: createNoOp(),
    clearAllEvents: createNoOp(),
    loadEvents: createNoOpAsync(),
    logUserInteraction: createNoOp(),
    logNavigation: createNoOp(),
    logComponentMount: createNoOp(),
    logComponentUnmount: createNoOp(),
    logPerformanceMetric: createNoOp(),
    logError: createNoOp(),
    logWarning: createNoOp(),
    logApiCall: createNoOp(),
    setTypeFilter: createNoOp(),
    setCategoryFilter: createNoOp(),
    setSeverityFilter: createNoOp(),
    setSearchTerm: createNoOp(),
    setTimeRange: createNoOp(),
    clearFilters: createNoOp(),
  };
};

const fallbackAppActivityActions = createFallbackAppActivityActions();

export const useAppActivityState = (): AppActivityState => {
  const context = use(AppActivityContext);
  if (!context) {
    throw new Error(
      "useAppActivityState must be used within an AppActivityProvider",
    );
  }
  return context.state;
};

export const useAppActivityActions = () => {
  const context = use(AppActivityContext);
  if (!context) {
    if (import.meta.env.DEV) {
      logger.warn(
        "ui",
        "useAppActivityActions called outside AppActivityProvider - returning no-op actions",
      );
    }
    return fallbackAppActivityActions;
  }

  return {
    addEvent: context.addEvent,
    updateEvent: context.updateEvent,
    removeEvent: context.removeEvent,
    clearOldEvents: context.clearOldEvents,
    clearAllEvents: context.clearAllEvents,
    loadEvents: context.loadEvents,
    logUserInteraction: context.logUserInteraction,
    logNavigation: context.logNavigation,
    logComponentMount: context.logComponentMount,
    logComponentUnmount: context.logComponentUnmount,
    logPerformanceMetric: context.logPerformanceMetric,
    logError: context.logError,
    logWarning: context.logWarning,
    logApiCall: context.logApiCall,
    setTypeFilter: context.setTypeFilter,
    setCategoryFilter: context.setCategoryFilter,
    setSeverityFilter: context.setSeverityFilter,
    setSearchTerm: context.setSearchTerm,
    setTimeRange: context.setTimeRange,
    clearFilters: context.clearFilters,
  };
};

export const useAppActivityStore = (): AppActivityContextType => {
  const context = use(AppActivityContext);
  if (!context) {
    throw new Error(
      "useAppActivityStore must be used within an AppActivityProvider",
    );
  }
  return context;
};
