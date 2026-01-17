/**
 * Store for tracking general application activity and system events
 * Monitors user interactions, component lifecycle, performance metrics, and system state
 */

export {
  AppActivityProvider,
  useAppActivityActions,
  useAppActivityState,
  useAppActivityStore,
} from "./provider";

export type {
  AppActivityAction,
  AppActivityContextType,
  AppActivityEvent,
  AppActivityEventMetadata,
  AppActivityFilters,
  AppActivityState,
  AppActivityStats,
} from "./types";
