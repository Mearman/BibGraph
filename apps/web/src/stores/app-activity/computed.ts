/**
 * Computed state utilities for app activity store
 */

import type { AppActivityEvent, AppActivityFilters, AppActivityStats } from "./types";

const RECENT_EVENTS_LIMIT = 100;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const MAX_PERFORMANCE_SCORE = 100;
const PERFORMANCE_DURATION_DIVISOR = 10;

export const generateEventId = (): string =>
  `evt_${Date.now().toString()}_${Math.random().toString(36).slice(2, 11)}`;

export const computeRecentEvents = (
  events: Record<string, AppActivityEvent>,
): AppActivityEvent[] => {
  return Object.values(events)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, RECENT_EVENTS_LIMIT);
};

const getMemoryUsage = (): number | undefined => {
  // Memory usage monitoring disabled to avoid type assertions
  // Performance.memory is not standardized and requires unsafe type casting
  return undefined;
};

const calculatePerformanceScore = (
  events: AppActivityEvent[],
): number | undefined => {
  const performanceEvents = events.filter(
    (e) => e.type === "performance" && e.duration,
  );
  if (performanceEvents.length === 0) return undefined;

  const averageDuration =
    performanceEvents.reduce((sum, e) => sum + (e.duration ?? 0), 0) /
    performanceEvents.length;
  // Score from 0-100 where lower duration = higher score
  return Math.max(
    0,
    Math.min(MAX_PERFORMANCE_SCORE, MAX_PERFORMANCE_SCORE - averageDuration / PERFORMANCE_DURATION_DIVISOR),
  );
};

export const computeActivityStats = (
  events: Record<string, AppActivityEvent>,
): AppActivityStats => {
  const eventList = Object.values(events);
  const now = Date.now();
  const fiveMinutesAgo = now - FIVE_MINUTES_MS;
  const oneMinuteAgo = now - ONE_MINUTE_MS;

  const recentEvents = eventList.filter(
    (event) => event.timestamp > fiveMinutesAgo,
  );
  const lastMinuteEvents = eventList.filter(
    (event) => event.timestamp > oneMinuteAgo,
  );

  // Calculate average event frequency (events per minute over last 5 minutes)
  const timespanMinutes = Math.max(
    1,
    (now - Math.min(...eventList.map((e) => e.timestamp))) / ONE_MINUTE_MS,
  );
  const averageFrequency =
    eventList.length > 0 ? eventList.length / timespanMinutes : 0;

  const memoryUsage = getMemoryUsage();
  const performanceScore = calculatePerformanceScore(eventList);

  return {
    totalEvents: eventList.length,
    eventsLast5Min: recentEvents.length,
    eventsPerMinute: lastMinuteEvents.length,
    errorCount: eventList.filter((event) => event.severity === "error").length,
    warningCount: eventList.filter((event) => event.severity === "warning").length,
    userInteractions: eventList.filter((event) => event.type === "user").length,
    componentLifecycleEvents: eventList.filter(
      (event) => event.type === "component",
    ).length,
    navigationEvents: eventList.filter((event) => event.type === "navigation").length,
    apiCallEvents: eventList.filter((event) => event.type === "api").length,
    averageEventFrequency: averageFrequency,
    ...(memoryUsage !== undefined && { memoryUsage }),
    ...(performanceScore !== undefined && { performanceScore }),
  };
};

export const computeFilteredEvents = (
  events: Record<string, AppActivityEvent>,
  filters: AppActivityFilters,
): AppActivityEvent[] => {
  const eventList = Object.values(events);
  const cutoffTime = Date.now() - filters.timeRange * ONE_MINUTE_MS;

  return eventList
    .filter((event) => {
      // Time range filter
      if (event.timestamp < cutoffTime) return false;

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(event.type))
        return false;

      // Category filter
      if (
        filters.category.length > 0 &&
        !filters.category.includes(event.category)
      )
        return false;

      // Severity filter
      if (
        filters.severity.length > 0 &&
        !filters.severity.includes(event.severity)
      )
        return false;

      // Search term filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const searchableText = [
          event.event,
          event.description,
          event.metadata?.component,
          event.metadata?.route,
          event.metadata?.entityType,
          event.metadata?.entityId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(term)) return false;
      }

      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const createEmptyStats = (): AppActivityStats => ({
  totalEvents: 0,
  eventsLast5Min: 0,
  eventsPerMinute: 0,
  errorCount: 0,
  warningCount: 0,
  userInteractions: 0,
  componentLifecycleEvents: 0,
  navigationEvents: 0,
  apiCallEvents: 0,
  averageEventFrequency: 0,
});
