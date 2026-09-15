/**
 * Network Activity Store with React Context and useReducer
 * Replaces Zustand with built-in React patterns for tracking network requests
 */

import { logger } from "@bibgraph/utils/logger";
import React, { createContext, type ReactNode,use, useCallback, useMemo, useReducer } from "react";

export interface NetworkRequest {
  id: string;
  entityType: "api" | "cache" | "worker" | "resource";
  category: "foreground" | "background";
  url: string;
  method: string;
  status: "pending" | "success" | "error" | "cached" | "deduplicated";
  statusCode?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  size?: number;
  cacheStrategy?: string;
  error?: string;
  metadata?: {
    entityType?: string;
    entityId?: string;
    queryParams?: Record<string, unknown>;
    headers?: Record<string, string>;
    fromCache?: boolean;
    deduplicated?: boolean;
  };
}

export interface NetworkStats {
  totalRequests: number;
  activeRequests: number;
  successCount: number;
  errorCount: number;
  cacheHits: number;
  deduplicatedCount: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  totalDataTransferred: number;
}

interface NetworkActivityState {
  // State - using plain objects for immutability
  requests: Record<string, NetworkRequest>;
  maxHistorySize: number;

  // Filters
  filters: {
    status: string[];
    entityType: string[];
    category: string[];
    searchTerm: string;
    timeRange: number; // hours
  };
}

// Action types
type NetworkActivityAction =
  | { type: "ADD_REQUEST"; payload: { request: Omit<NetworkRequest, "id" | "startTime">; id: string } }
  | { type: "UPDATE_REQUEST"; payload: { id: string; updates: Partial<NetworkRequest> } }
  | { type: "COMPLETE_REQUEST"; payload: { id: string; statusCode?: number; size?: number } }
  | { type: "FAIL_REQUEST"; payload: { id: string; error: string; statusCode?: number } }
  | { type: "REMOVE_REQUEST"; payload: string }
  | { type: "CLEAR_OLD_REQUESTS" }
  | { type: "CLEAR_ALL_REQUESTS" }
  | { type: "SET_STATUS_FILTER"; payload: string[] }
  | { type: "SET_TYPE_FILTER"; payload: string[] }
  | { type: "SET_CATEGORY_FILTER"; payload: string[] }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_TIME_RANGE"; payload: number }
  | { type: "CLEAR_FILTERS" };

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const RECENT_REQUESTS_LIMIT = 50;

// ID generator for requests
const createRequestIdGenerator = (() => {
  let counter = 1;
  return (prefix = "req") => `${prefix}-${String(counter++)}`;
})();

// Initial state
const getInitialState = (): NetworkActivityState => ({
  requests: {},
  maxHistorySize: 500,
  filters: {
    status: [],
    entityType: [],
    category: [],
    searchTerm: "",
    timeRange: 24, // 24 hours default
  },
});

// Returning a real function-boundary type here (rather than an inline variable annotation) is necessary: TypeScript's control-flow analysis narrows a `const` declaration's usable type to its initializer's inferred type, not a wider explicit annotation, so a bare `const request: NetworkRequest | undefined = state.requests[id]` still reads as non-nullable at every subsequent use, whereas a function call's return type isn't narrowed that way by its caller.
const getRequestById = (
  requests: Record<string, NetworkRequest>,
  id: string,
): NetworkRequest | undefined => requests[id];

// Reducer
const networkActivityReducer = (
  state: NetworkActivityState,
  action: NetworkActivityAction
): NetworkActivityState => {
  switch (action.type) {
    case "ADD_REQUEST": {
      const { request, id } = action.payload;
      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            id,
            startTime: Date.now(),
          },
        },
      };
    }

    case "UPDATE_REQUEST": {
      const { id, updates } = action.payload;
      const request = getRequestById(state.requests, id);
      if (request === undefined) return state;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            ...updates,
          },
        },
      };
    }

    case "COMPLETE_REQUEST": {
      const { id, statusCode, size } = action.payload;
      const request = getRequestById(state.requests, id);
      if (request === undefined) return state;

      const endTime = Date.now();
      const duration = endTime - request.startTime;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            status: "success",
            endTime,
            duration,
            ...(statusCode !== undefined && { statusCode }),
            ...(size !== undefined && { size }),
          },
        },
      };
    }

    case "FAIL_REQUEST": {
      const { id, error, statusCode } = action.payload;
      const request = getRequestById(state.requests, id);
      if (request === undefined) return state;

      const endTime = Date.now();
      const duration = endTime - request.startTime;

      return {
        ...state,
        requests: {
          ...state.requests,
          [id]: {
            ...request,
            status: "error",
            endTime,
            duration,
            error,
            ...(statusCode !== undefined && { statusCode }),
          },
        },
      };
    }

    case "REMOVE_REQUEST": {
      // Create new requests object without the removed request
      const newRequests = Object.fromEntries(
        Object.entries(state.requests).filter(([id]) => id !== action.payload)
      );

      return {
        ...state,
        requests: newRequests,
      };
    }

    case "CLEAR_OLD_REQUESTS": {
      const requests = Object.values(state.requests);

      if (requests.length <= state.maxHistorySize) return state;

      // Keep most recent requests
      const sorted = [...requests].sort((a, b) => b.startTime - a.startTime);
      const toKeep = sorted.slice(0, state.maxHistorySize);

      const newRequests: Record<string, NetworkRequest> = {};
      for (const request of toKeep) {
        newRequests[request.id] = request;
      }

      return {
        ...state,
        requests: newRequests,
      };
    }

    case "CLEAR_ALL_REQUESTS": {
      return {
        ...state,
        requests: {},
      };
    }

    case "SET_STATUS_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          status: action.payload,
        },
      };
    }

    case "SET_TYPE_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          entityType: action.payload,
        },
      };
    }

    case "SET_CATEGORY_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          category: action.payload,
        },
      };
    }

    case "SET_SEARCH_TERM": {
      return {
        ...state,
        filters: {
          ...state.filters,
          searchTerm: action.payload,
        },
      };
    }

    case "SET_TIME_RANGE": {
      return {
        ...state,
        filters: {
          ...state.filters,
          timeRange: action.payload,
        },
      };
    }

    case "CLEAR_FILTERS": {
      return {
        ...state,
        filters: {
          status: [],
          entityType: [],
          category: [],
          searchTerm: "",
          timeRange: 24,
        },
      };
    }

    default:
      return state;
  }
};

// Context
const NetworkActivityContext = createContext<{
  state: NetworkActivityState;
  dispatch: React.Dispatch<NetworkActivityAction>;
} | null>(null);

// Provider component
export const NetworkActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(networkActivityReducer, getInitialState());

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <NetworkActivityContext value={contextValue}>
      {children}
    </NetworkActivityContext>
  );
};

// Hook for using network activity state
export const useNetworkActivityState = () => {
  const context = use(NetworkActivityContext);
  if (!context) {
    throw new Error("useNetworkActivityState must be used within NetworkActivityProvider");
  }
  return context.state;
};

// Hook for using network activity actions
export const useNetworkActivityActions = () => {
  const context = use(NetworkActivityContext);
  if (!context) {
    throw new Error("useNetworkActivityActions must be used within NetworkActivityProvider");
  }

  return {
    addRequest: useCallback((request: Omit<NetworkRequest, "id" | "startTime">) => {
      const id = createRequestIdGenerator("req");

      context.dispatch({
        type: "ADD_REQUEST",
        payload: { request, id }
      });

      logger.debug(
        "api",
        "Network request added",
        {
          id,
          url: request.url,
          entityType: request.entityType,
          category: request.category,
        },
        "NetworkActivityStore",
      );

      return id;
    }, [context]),

    updateRequest: useCallback((id: string, updates: Partial<NetworkRequest>) => {
      context.dispatch({
        type: "UPDATE_REQUEST",
        payload: { id, updates }
      });
    }, [context]),

    completeRequest: useCallback((id: string, statusCode?: number, size?: number) => {
      context.dispatch({
        type: "COMPLETE_REQUEST",
        payload: { id, statusCode, size }
      });
    }, [context]),

    failRequest: useCallback((id: string, error: string, statusCode?: number) => {
      context.dispatch({
        type: "FAIL_REQUEST",
        payload: { id, error, statusCode }
      });

      logger.warn(
        "api",
        "Network request failed",
        {
          id,
          error,
          statusCode,
        },
        "NetworkActivityStore",
      );
    }, [context]),

    removeRequest: useCallback((id: string) => {
      context.dispatch({
        type: "REMOVE_REQUEST",
        payload: id
      });
    }, [context]),

    clearOldRequests: useCallback(() => {
      const currentState = context.state;
      const requests = Object.values(currentState.requests);

      if (requests.length <= currentState.maxHistorySize) return;

      context.dispatch({ type: "CLEAR_OLD_REQUESTS" });

      const sorted = [...requests].sort((a, b) => b.startTime - a.startTime);
      const toKeep = sorted.slice(0, currentState.maxHistorySize);

      logger.debug(
        "api",
        "Cleared old network requests",
        {
          removed: requests.length - toKeep.length,
          kept: toKeep.length,
        },
        "NetworkActivityStore",
      );
    }, [context]),

    clearAllRequests: useCallback(() => {
      context.dispatch({ type: "CLEAR_ALL_REQUESTS" });

      logger.debug(
        "api",
        "Cleared all network requests",
        {},
        "NetworkActivityStore",
      );
    }, [context]),

    // Filter actions
    setStatusFilter: useCallback((statuses: readonly string[]) => {
      context.dispatch({
        type: "SET_STATUS_FILTER",
        payload: [...statuses]
      });
    }, [context]),

    setTypeFilter: useCallback((types: readonly string[]) => {
      context.dispatch({
        type: "SET_TYPE_FILTER",
        payload: [...types]
      });
    }, [context]),

    setCategoryFilter: useCallback((categories: readonly string[]) => {
      context.dispatch({
        type: "SET_CATEGORY_FILTER",
        payload: [...categories]
      });
    }, [context]),

    setSearchTerm: useCallback((term: string) => {
      context.dispatch({
        type: "SET_SEARCH_TERM",
        payload: term
      });
    }, [context]),

    setTimeRange: useCallback((hours: number) => {
      context.dispatch({
        type: "SET_TIME_RANGE",
        payload: hours
      });
    }, [context]),

    clearFilters: useCallback(() => {
      context.dispatch({ type: "CLEAR_FILTERS" });
    }, [context]),
  };
};

// Combined hook for both state and actions
export const useNetworkActivityStore = () => {
  const state = useNetworkActivityState();
  const actions = useNetworkActivityActions();

  // Memoized computed values
  const computedValues = useMemo(() => {
    const getActiveRequests = useCallback(() => {
      return Object.values(state.requests).filter((request) => request.status === "pending");
    }, []);

    const getRecentRequests = useCallback(() => {
      return Object.values(state.requests)
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, RECENT_REQUESTS_LIMIT);
    }, []);

    const getNetworkStats = useCallback((): NetworkStats => {
      const requestList = Object.values(state.requests);
      const now = Date.now();
      const oneSecondAgo = now - MS_PER_SECOND;

      const recentRequests = requestList.filter(
        (request) => request.startTime > oneSecondAgo,
      );
      const completedRequests = requestList.filter(
        (request) => request.endTime !== undefined,
      );
      const totalDuration = completedRequests.reduce(
        (sum, request) => sum + (request.duration ?? 0),
        0,
      );

      return {
        totalRequests: requestList.length,
        activeRequests: requestList.filter((request) => request.status === "pending").length,
        successCount: requestList.filter((request) => request.status === "success").length,
        errorCount: requestList.filter((request) => request.status === "error").length,
        cacheHits: requestList.filter((request) => request.status === "cached").length,
        deduplicatedCount: requestList.filter(
          (request) => request.status === "deduplicated",
        ).length,
        averageResponseTime:
          completedRequests.length > 0
            ? totalDuration / completedRequests.length
            : 0,
        requestsPerSecond: recentRequests.length,
        totalDataTransferred: requestList.reduce(
          (sum, request) => sum + (request.size ?? 0),
          0,
        ),
      };
    }, []);

    const getFilteredRequests = useCallback(() => {
      const requestList = Object.values(state.requests);
      const cutoffTime = Date.now() - state.filters.timeRange * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

      return requestList
        .filter((request) => {
          // Time range filter
          if (request.startTime < cutoffTime) return false;

          // Status filter
          if (
            state.filters.status.length > 0 &&
            !state.filters.status.includes(request.status)
          )
            return false;

          // Type filter
          if (
            state.filters.entityType.length > 0 &&
            !state.filters.entityType.includes(request.entityType)
          )
            return false;

          // Category filter
          if (
            state.filters.category.length > 0 &&
            !state.filters.category.includes(request.category)
          )
            return false;

          // Search term filter
          if (state.filters.searchTerm) {
            const term = state.filters.searchTerm.toLowerCase();
            const searchableText = [
              request.url,
              request.method,
              request.metadata?.entityType,
              request.metadata?.entityId,
              request.error,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (!searchableText.includes(term)) return false;
          }

          return true;
        })
        .sort((a, b) => b.startTime - a.startTime);
    }, []);

    return {
      getActiveRequests,
      getRecentRequests,
      getNetworkStats,
      getFilteredRequests,
    };
  }, [state.requests, state.filters]);

  return {
    ...state,
    ...actions,
    ...computedValues,
  };
};

// Selector hook for optimized re-renders
export const useNetworkActivitySelector = <T,>(
  selector: (state: NetworkActivityState) => T
): T => {
  const state = useNetworkActivityState();
  return selector(state);
};

// Legacy selectors for backward compatibility
export const selectActiveRequests = (state: NetworkActivityState) =>
  Object.values(state.requests).filter((request) => request.status === "pending");

export const selectRecentRequests = (state: NetworkActivityState) =>
  Object.values(state.requests)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, RECENT_REQUESTS_LIMIT);

export const selectNetworkStats = (state: NetworkActivityState): NetworkStats => {
  const requestList = Object.values(state.requests);
  const now = Date.now();
  const oneSecondAgo = now - MS_PER_SECOND;

  const recentRequests = requestList.filter(
    (request) => request.startTime > oneSecondAgo,
  );
  const completedRequests = requestList.filter(
    (request) => request.endTime !== undefined,
  );
  const totalDuration = completedRequests.reduce(
    (sum, request) => sum + (request.duration ?? 0),
    0,
  );

  return {
    totalRequests: requestList.length,
    activeRequests: requestList.filter((request) => request.status === "pending")
      .length,
    successCount: requestList.filter((request) => request.status === "success").length,
    errorCount: requestList.filter((request) => request.status === "error").length,
    cacheHits: requestList.filter((request) => request.status === "cached").length,
    deduplicatedCount: requestList.filter(
      (request) => request.status === "deduplicated",
    ).length,
    averageResponseTime:
      completedRequests.length > 0
        ? totalDuration / completedRequests.length
        : 0,
    requestsPerSecond: recentRequests.length,
    totalDataTransferred: requestList.reduce(
      (sum, request) => sum + (request.size ?? 0),
      0,
    ),
  };
};

export const selectFilteredRequests = (state: NetworkActivityState) => {
  const requestList = Object.values(state.requests);
  const cutoffTime = Date.now() - state.filters.timeRange * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

  return requestList
    .filter((request) => {
      // Time range filter
      if (request.startTime < cutoffTime) return false;

      // Status filter
      if (
        state.filters.status.length > 0 &&
        !state.filters.status.includes(request.status)
      )
        return false;

      // Type filter
      if (
        state.filters.entityType.length > 0 &&
        !state.filters.entityType.includes(request.entityType)
      )
        return false;

      // Category filter
      if (
        state.filters.category.length > 0 &&
        !state.filters.category.includes(request.category)
      )
        return false;

      // Search term filter
      if (state.filters.searchTerm) {
        const term = state.filters.searchTerm.toLowerCase();
        const searchableText = [
          request.url,
          request.method,
          request.metadata?.entityType,
          request.metadata?.entityId,
          request.error,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(term)) return false;
      }

      return true;
    })
    .sort((a, b) => b.startTime - a.startTime);
};

// Standalone store object for non-React usage
export const networkActivityStore = (() => {
  let currentState: NetworkActivityState = getInitialState();

  const setState = (updater: NetworkActivityState | ((state: NetworkActivityState) => NetworkActivityState)) => {
    currentState = typeof updater === 'function' ? updater(currentState) : updater;
  };

  return {
    addRequest: (request: Omit<NetworkRequest, "id" | "startTime">) => {
      const id = createRequestIdGenerator("req");
      setState(state => networkActivityReducer(state, {
        type: "ADD_REQUEST",
        payload: { request, id }
      }));
      return id;
    },
    completeRequest: (id: string, statusCode?: number, size?: number) => {
      setState(state => networkActivityReducer(state, {
        type: "COMPLETE_REQUEST",
        payload: { id, statusCode, size }
      }));
    },
    failRequest: (id: string, error: string, statusCode?: number) => {
      setState(state => networkActivityReducer(state, {
        type: "FAIL_REQUEST",
        payload: { id, error, statusCode }
      }));
    },
    removeRequest: (id: string) => {
      setState(state => networkActivityReducer(state, {
        type: "REMOVE_REQUEST",
        payload: id
      }));
    },
    clearAll: () => {
      setState(state => networkActivityReducer(state, {
        type: "CLEAR_ALL_REQUESTS"
      }));
    },
  };
})();