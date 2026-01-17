/**
 * Types and constants for the search page
 */
import type { AutocompleteResult } from "@bibgraph/types";
import { ENTITY_METADATA, toEntityType } from "@bibgraph/types";

export interface SearchFilters {
  query: string;
}

export type ViewMode = "table" | "card" | "list";

export type SortOption = "relevance" | "citations" | "works" | "name" | "type";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "citations", label: "Most Cited" },
  { value: "works", label: "Most Works" },
  { value: "name", label: "Name (A-Z)" },
  { value: "type", label: "Entity Type" },
];

/**
 * Get entity type color for badges using centralized metadata
 * @param entityType
 */
export const getEntityTypeColor = (entityType: AutocompleteResult["entity_type"]): string => {
  const pluralForm = toEntityType(entityType);
  if (pluralForm) {
    return ENTITY_METADATA[pluralForm].color;
  }
  return "gray";
};

/**
 * Calculate entity type breakdown from results
 * @param results
 */
export const getEntityTypeBreakdown = (results: AutocompleteResult[]): { type: string; count: number }[] => {
  const breakdown = results.reduce((acc, result) => {
    acc[result.entity_type] = (acc[result.entity_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(breakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
};
