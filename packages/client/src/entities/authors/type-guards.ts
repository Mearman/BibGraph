/**
 * Type guards for author-related data structures
 */

import type { OpenAlexId } from "@bibgraph/types";

/** Concept data structure from author entity */
export interface AuthorConcept {
  id: OpenAlexId;
  display_name: string;
  score: number;
  level: number;
}

/** Hierarchical reference (subfield, field, domain) */
export interface HierarchicalReference {
  id: OpenAlexId;
  display_name: string;
}

/** Topic data structure from author entity */
export interface AuthorTopic {
  id: OpenAlexId;
  display_name: string;
  count: number;
  subfield?: HierarchicalReference;
  field?: HierarchicalReference;
  domain?: HierarchicalReference;
}

/**
 * Type guard for AuthorConcept
 * Validates that an unknown value conforms to the AuthorConcept interface
 * @param value
 */
export const isAuthorConcept = (value: unknown): value is AuthorConcept => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    "id" in record &&
    "display_name" in record &&
    "score" in record &&
    "level" in record &&
    typeof record.id === "string" &&
    typeof record.display_name === "string" &&
    typeof record.score === "number" &&
    typeof record.level === "number"
  );
};

/**
 * Type guard for HierarchicalReference
 * Validates optional hierarchical references (subfield, field, domain)
 * @param value
 */
const isHierarchicalReference = (value: unknown): value is HierarchicalReference => {
  if (value === undefined) {
    return true; // Optional field
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    "id" in record &&
    "display_name" in record &&
    typeof record.id === "string" &&
    typeof record.display_name === "string"
  );
};

/**
 * Type guard for AuthorTopic
 * Validates that an unknown value conforms to the AuthorTopic interface
 * @param value
 */
export const isAuthorTopic = (value: unknown): value is AuthorTopic => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  // Check required fields
  if (
    !("id" in record) ||
    !("display_name" in record) ||
    !("count" in record)
  ) {
    return false;
  }

  if (
    typeof record.id !== "string" ||
    typeof record.display_name !== "string" ||
    typeof record.count !== "number"
  ) {
    return false;
  }

  // Check optional hierarchical references
  if ("subfield" in record && !isHierarchicalReference(record.subfield)) {
    return false;
  }

  if ("field" in record && !isHierarchicalReference(record.field)) {
    return false;
  }

  if ("domain" in record && !isHierarchicalReference(record.domain)) {
    return false;
  }

  return true;
};

/**
 * Filter and type-narrow an array of unknown concepts to AuthorConcept[]
 * @param concepts
 */
export const filterValidConcepts = (concepts: unknown[]): AuthorConcept[] => concepts.filter(isAuthorConcept);

/**
 * Filter and type-narrow an array of unknown topics to AuthorTopic[]
 * @param topics
 */
export const filterValidTopics = (topics: unknown[]): AuthorTopic[] => topics.filter(isAuthorTopic);
