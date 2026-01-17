/**
 * Utility functions for Cache Tier components
 * @module components/catalogue/cache-tier/cache-tier-utils
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";

import type { EntityTypeCount } from "./cache-tier-types";

/**
 * Formats bytes into human-readable string (B, KB, MB, GB)
 * @param bytes
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Formats a timestamp into a relative time string (e.g., "5m ago", "2h ago")
 * @param timestamp
 */
export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
 * @param entityType
 */
export const getEntityTypeColor = (entityType: string): string => {
  return ENTITY_TYPE_COLORS[entityType] || "gray";
};

/**
 * Groups cached entities by their type and returns counts sorted descending
 * @param entities
 */
export const groupByEntityType = (entities: CachedEntityEntry[]): EntityTypeCount[] => {
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
 * @param title
 */
export const generateTestId = (title: string): string => {
  return `cache-tier-card-${title.toLowerCase().replaceAll(/\s+/g, "-")}`;
};
