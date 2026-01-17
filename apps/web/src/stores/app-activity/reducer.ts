/**
 * Reducer for app activity store
 */

import { logger } from "@bibgraph/utils/logger";

import {
  computeActivityStats,
  computeFilteredEvents,
  computeRecentEvents,
  createEmptyStats,
  generateEventId,
} from "./computed";
import {
  clearAllEventsFromDB,
  deleteEventsFromDB,
  saveEventToDB,
} from "./database";
import type { AppActivityAction, AppActivityState } from "./types";

const MAX_HISTORY_SIZE = 1000;
const DEFAULT_TIME_RANGE_MINUTES = 30;
const CLEAR_FILTERS_TIME_RANGE_MINUTES = 60;

export const initialState: AppActivityState = {
  events: {},
  maxHistorySize: MAX_HISTORY_SIZE,
  recentEvents: [],
  activityStats: createEmptyStats(),
  filteredEvents: [],
  filters: {
    type: [],
    category: [],
    severity: [],
    searchTerm: "",
    timeRange: DEFAULT_TIME_RANGE_MINUTES,
  },
};

export const appActivityReducer = (
  state: AppActivityState,
  action: AppActivityAction,
): AppActivityState => {
  switch (action.type) {
    case "ADD_EVENT": {
      const id = generateEventId();
      const fullEvent = {
        ...action.payload,
        id,
        timestamp: Date.now(),
      };

      // Save to Dexie asynchronously
      void saveEventToDB(fullEvent);

      const newEvents = {
        ...state.events,
        [id]: fullEvent,
      };

      logger.debug("ui", "App activity event added", {
        id,
        type: action.payload.type,
        category: action.payload.category,
        event: action.payload.event,
        component: "AppActivityStore",
      });

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "UPDATE_EVENT": {
      const { id, updates } = action.payload;
      const event = state.events[id];
      if (!event) return state;

      const newEvents = {
        ...state.events,
        [id]: { ...event, ...updates },
      };

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "REMOVE_EVENT": {
      const newEvents = Object.fromEntries(
        Object.entries(state.events).filter(([id]) => id !== action.payload),
      );

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "CLEAR_OLD_EVENTS": {
      const events = Object.values(state.events);
      if (events.length <= state.maxHistorySize) return state;

      const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, state.maxHistorySize);
      const toRemove = sorted.slice(state.maxHistorySize);
      const idsToRemove = toRemove
        .map((event) => Number.parseInt(event.id.split("_")[2] || "0"))
        .filter((id) => !Number.isNaN(id));

      void deleteEventsFromDB(idsToRemove);

      const newEvents: Record<string, (typeof toKeep)[0]> = {};
      toKeep.forEach((event) => {
        newEvents[event.id] = event;
      });

      logger.debug("ui", "Cleared old app activity events", {
        removed: toRemove.length,
        kept: toKeep.length,
        component: "AppActivityStore",
      });

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "CLEAR_ALL_EVENTS": {
      void clearAllEventsFromDB();

      logger.debug("ui", "Cleared all app activity events", {
        component: "AppActivityStore",
      });

      return {
        ...state,
        events: {},
        recentEvents: [],
        activityStats: createEmptyStats(),
        filteredEvents: [],
      };
    }

    case "LOAD_EVENTS": {
      const newEvents = action.payload;

      return {
        ...state,
        events: newEvents,
        recentEvents: computeRecentEvents(newEvents),
        activityStats: computeActivityStats(newEvents),
        filteredEvents: computeFilteredEvents(newEvents, state.filters),
      };
    }

    case "SET_TYPE_FILTER": {
      const newFilters = { ...state.filters, type: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_CATEGORY_FILTER": {
      const newFilters = { ...state.filters, category: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_SEVERITY_FILTER": {
      const newFilters = { ...state.filters, severity: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_SEARCH_TERM": {
      const newFilters = { ...state.filters, searchTerm: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "SET_TIME_RANGE": {
      const newFilters = { ...state.filters, timeRange: action.payload };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "CLEAR_FILTERS": {
      const newFilters = {
        type: [],
        category: [],
        severity: [],
        searchTerm: "",
        timeRange: CLEAR_FILTERS_TIME_RANGE_MINUTES,
      };

      return {
        ...state,
        filters: newFilters,
        filteredEvents: computeFilteredEvents(state.events, newFilters),
      };
    }

    case "RECOMPUTE_STATE": {
      return {
        ...state,
        recentEvents: computeRecentEvents(state.events),
        activityStats: computeActivityStats(state.events),
        filteredEvents: computeFilteredEvents(state.events, state.filters),
      };
    }

    default:
      return state;
  }
};
