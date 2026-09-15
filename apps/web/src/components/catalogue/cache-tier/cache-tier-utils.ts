/**
 * Utility functions for Cache Tier components
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";

import type { EntityTypeCount } from "./cache-tier-types";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

/**
 * Formats bytes into human-readable string (B, KB, MB, GB)
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${String(Number.parseFloat((bytes / Math.pow(k, index)).toFixed(2)))} ${sizes[index]}`;
};

/**
 * Formats a timestamp into a relative time string (e.g., "5m ago", "2h ago")
 */
export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / MS_PER_SECOND);
  if (seconds < SECONDS_PER_MINUTE) return `${String(seconds)}s ago`;
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${String(hours)}h ago`;
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${String(days)}d ago`;
};

/**
 * Entity type to color mapping for consistent visual identification
 */
const ENTITY_TYPE_COLORS: Record<string, string> = {
  works: "blue",
  authors: "green",
  sources: "orange",
  institutions: "purple",
  topics: "cyan",
  publishers: "pink",
  funders: "yellow",
  keywords: "teal",
  concepts: "grape",
  domains: "indigo",
  fields: "lime",
  subfields: "violet",
};

/**
 * Returns the Mantine color associated with an entity type
 */
export const getEntityTypeColor = (entityType: string): string => {
  return ENTITY_TYPE_COLORS[entityType] || "gray";
};

/**
 * Groups cached entities by their type and returns counts sorted descending
 */
export const groupByEntityType = (entities: readonly CachedEntityEntry[]): EntityTypeCount[] => {
  const counts: Record<string, number> = {};
  for (const entity of entities) {
    counts[entity.entityType] = (counts[entity.entityType] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([entityType, count]) => ({ entityType, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * Generates a test ID from a title string
 */
export const generateTestId = (title: string): string => {
  return `cache-tier-card-${title.toLowerCase().replaceAll(/\s+/g, "-")}`;
};
