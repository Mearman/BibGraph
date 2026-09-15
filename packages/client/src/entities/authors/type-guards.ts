/**
 * Type guards for author-related data structures
 */

import type { OpenAlexId } from "@bibgraph/types";

/**
Concept data structure from author entity
 */
export interface AuthorConcept {
  id: OpenAlexId;
  display_name: string;
  score: number;
  level: number;
}

/**
Hierarchical reference (subfield, field, domain)
 */
export interface HierarchicalReference {
  id: OpenAlexId;
  display_name: string;
}

/**
Topic data structure from author entity
 */
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
 */
export const isAuthorConcept = (value: unknown): value is AuthorConcept => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    "display_name" in value &&
    "score" in value &&
    "level" in value &&
    typeof value.id === "string" &&
    typeof value.display_name === "string" &&
    typeof value.score === "number" &&
    typeof value.level === "number"
  );
};

/**
 * Type guard for HierarchicalReference
 * Validates optional hierarchical references (subfield, field, domain)
 */
const isHierarchicalReference = (value: unknown): value is HierarchicalReference => {
  if (value === undefined) {
    return true; // Optional field
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    "display_name" in value &&
    typeof value.id === "string" &&
    typeof value.display_name === "string"
  );
};

/**
 * Type guard for AuthorTopic
 * Validates that an unknown value conforms to the AuthorTopic interface
 */
export const isAuthorTopic = (value: unknown): value is AuthorTopic => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // Check required fields
  if (!("id" in value)) return false;
  if (!("display_name" in value)) return false;
  if (!("count" in value)) return false;

  if (typeof value.id !== "string") return false;
  if (typeof value.display_name !== "string") return false;
  if (typeof value.count !== "number") return false;

  // Check optional hierarchical references
  if ("subfield" in value && !isHierarchicalReference(value.subfield)) {
    return false;
  }

  if ("field" in value && !isHierarchicalReference(value.field)) {
    return false;
  }

  if ("domain" in value && !isHierarchicalReference(value.domain)) {
    return false;
  }

  return true;
};

/**
 * Filter and type-narrow an array of unknown concepts to AuthorConcept[]
 */
export const filterValidConcepts = (concepts: readonly unknown[]): AuthorConcept[] => concepts.filter(isAuthorConcept);

/**
 * Filter and type-narrow an array of unknown topics to AuthorTopic[]
 */
export const filterValidTopics = (topics: readonly unknown[]): AuthorTopic[] => topics.filter(isAuthorTopic);
