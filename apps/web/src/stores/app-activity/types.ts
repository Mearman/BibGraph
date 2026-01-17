/**
 * Type definitions for app activity store
 */

export interface AppActivityEvent {
  id: string;
  type:
    | "user"
    | "system"
    | "navigation"
    | "component"
    | "performance"
    | "error"
    | "api";
  category: "interaction" | "lifecycle" | "data" | "ui" | "background";
  event: string;
  description: string;
  timestamp: number;
  duration?: number;
  severity: "info" | "warning" | "error" | "debug";
  metadata?: AppActivityEventMetadata;
}

export interface AppActivityEventMetadata {
  component?: string;
  route?: string;
  previousRoute?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  queryParams?: Record<string, unknown>;
  searchQuery?: string;
  filters?: string;
  search?: string;
  pageType?: string;
  searchParams?: Record<string, unknown>;
  performance?: {
    memory?: number;
    timing?: number;
    fps?: number;
  };
  data?: Record<string, unknown>;
}

export interface AppActivityStats {
  totalEvents: number;
  eventsLast5Min: number;
  eventsPerMinute: number;
  errorCount: number;
  warningCount: number;
  userInteractions: number;
  componentLifecycleEvents: number;
  navigationEvents: number;
  apiCallEvents: number;
  averageEventFrequency: number;
  memoryUsage?: number;
  performanceScore?: number;
}

export interface AppActivityFilters {
  type: string[];
  category: string[];
  severity: string[];
  searchTerm: string;
  timeRange: number; // minutes
}

export interface AppActivityState {
  events: Record<string, AppActivityEvent>;
  maxHistorySize: number;
  recentEvents: AppActivityEvent[];
  activityStats: AppActivityStats;
  filteredEvents: AppActivityEvent[];
  filters: AppActivityFilters;
}

export type AppActivityAction =
  | { type: "ADD_EVENT"; payload: Omit<AppActivityEvent, "id" | "timestamp"> }
  | { type: "UPDATE_EVENT"; payload: { id: string; updates: Partial<AppActivityEvent> } }
  | { type: "REMOVE_EVENT"; payload: string }
  | { type: "CLEAR_OLD_EVENTS" }
  | { type: "CLEAR_ALL_EVENTS" }
  | { type: "LOAD_EVENTS"; payload: Record<string, AppActivityEvent> }
  | { type: "SET_TYPE_FILTER"; payload: string[] }
  | { type: "SET_CATEGORY_FILTER"; payload: string[] }
  | { type: "SET_SEVERITY_FILTER"; payload: string[] }
  | { type: "SET_SEARCH_TERM"; payload: string }
  | { type: "SET_TIME_RANGE"; payload: number }
  | { type: "CLEAR_FILTERS" }
  | { type: "RECOMPUTE_STATE" };

export interface AppActivityContextType {
  state: AppActivityState;
  addEvent: (event: Omit<AppActivityEvent, "id" | "timestamp">) => string;
  updateEvent: (id: string, updates: Partial<AppActivityEvent>) => void;
  removeEvent: (id: string) => void;
  clearOldEvents: () => void;
  clearAllEvents: () => void;
  loadEvents: () => Promise<void>;
  logUserInteraction: (
    action: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logNavigation: (
    from: string,
    to: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logComponentMount: (
    component: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logComponentUnmount: (
    component: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logPerformanceMetric: (
    metric: string,
    value: number,
    metadata?: Record<string, unknown>,
  ) => void;
  logError: (
    error: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logWarning: (
    warning: string,
    component?: string,
    metadata?: Record<string, unknown>,
  ) => void;
  logApiCall: (
    entityType: string,
    entityId?: string,
    queryParams?: Record<string, unknown>,
  ) => void;
  setTypeFilter: (types: string[]) => void;
  setCategoryFilter: (categories: string[]) => void;
  setSeverityFilter: (severities: string[]) => void;
  setSearchTerm: (term: string) => void;
  setTimeRange: (minutes: number) => void;
  clearFilters: () => void;
}
