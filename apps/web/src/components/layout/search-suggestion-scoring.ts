/**
 * OpenAlex autocomplete response types and suggestion-scoring helpers for HeaderSearchInput. Kept separate from the component so the scoring logic is independently testable and the component itself stays focused on rendering (see constitution Principle XVI).
 */

import type { EntityType } from "@bibgraph/types";

import { decodeHtmlEntities } from "@/utils/decode-html-entities";

// Type for OpenAlex autocomplete API response
export interface OpenAlexAutocompleteItem {
  id?: string;
  display_name: string;
  entity_type: string;
  works_count?: number;
  cited_by_count?: number;
}

export interface OpenAlexAutocompleteResponse {
  results?: OpenAlexAutocompleteItem[];
}

// Type for search suggestions
export interface SearchSuggestion {
  id: string;
  displayName: string;
  entityType: EntityType;
  description?: string;
  worksCount?: number;
  citedByCount?: number;
  score?: number;
  trending?: boolean;
  recent?: boolean;
  relevanceReason?: string;
}

const isOpenAlexAutocompleteItem = (value: unknown): value is OpenAlexAutocompleteItem => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("display_name" in value) || typeof value.display_name !== "string") {
    return false;
  }
  if (!("entity_type" in value) || typeof value.entity_type !== "string") {
    return false;
  }
  return true;
};

export const isOpenAlexAutocompleteResponse = (value: unknown): value is OpenAlexAutocompleteResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("results" in value) || value.results === undefined) {
    return true;
  }
  return Array.isArray(value.results) && value.results.every(isOpenAlexAutocompleteItem);
};

// Map OpenAlex entity types to our EntityType enum
const mapEntityType = (apiType: string): EntityType => {
  switch (apiType) {
    case 'work': return 'works';
    case 'author': return 'authors';
    case 'institution': return 'institutions';
    case 'source': return 'sources';
    case 'topic': return 'topics';
    case 'concept': return 'concepts';
    case 'publisher': return 'publishers';
    case 'funder': return 'funders';
    case 'keyword': return 'keywords';
    case 'domain': return 'domains';
    case 'field': return 'fields';
    case 'subfield': return 'subfields';
    default: return 'works'; // Default fallback
  }
};

// Suggestion fetching and scoring constants
const MAX_SUGGESTIONS = 8;
const BASE_SUGGESTION_SCORE = 100;
const ORDER_SCORE_PENALTY_PER_INDEX = 5;
const HIGH_CITATION_THRESHOLD = 100;
const HIGH_CITATION_BOOST = 15;
const MEDIUM_CITATION_THRESHOLD = 50;
const MEDIUM_CITATION_BOOST = 10;
const LOW_CITATION_THRESHOLD = 10;
const LOW_CITATION_BOOST = 5;
const EMERGING_WORKS_COUNT_THRESHOLD = 10;
const EMERGING_WORKS_BOOST = 8;
const INSTITUTION_BOOST = 5;
const TRENDING_CITATION_THRESHOLD = 200;
const RECENT_WORKS_COUNT_THRESHOLD = 5;
const HIGHLY_CITED_SCORE_THRESHOLD = 115;
const EMERGING_SCORE_THRESHOLD = 110;

/**
 * Transforms a validated OpenAlex autocomplete response into scored, ranked search suggestions.
 */
export const buildSearchSuggestions = (response: Readonly<OpenAlexAutocompleteResponse>): SearchSuggestion[] => {
  const rawSuggestions = (response.results ?? []).slice(0, MAX_SUGGESTIONS);
  const transformedSuggestions: SearchSuggestion[] = rawSuggestions.map((item: Readonly<OpenAlexAutocompleteItem>, index: number) => {
    // Calculate relevance score based on multiple factors
    let score = BASE_SUGGESTION_SCORE - (index * ORDER_SCORE_PENALTY_PER_INDEX); // Base score from API ordering

    // Boost highly cited works
    if (item.cited_by_count !== undefined && item.cited_by_count > HIGH_CITATION_THRESHOLD) {
      score += HIGH_CITATION_BOOST;
    } else if (item.cited_by_count !== undefined && item.cited_by_count > MEDIUM_CITATION_THRESHOLD) {
      score += MEDIUM_CITATION_BOOST;
    } else if (item.cited_by_count !== undefined && item.cited_by_count > LOW_CITATION_THRESHOLD) {
      score += LOW_CITATION_BOOST;
    }

    // Boost recent publications (assumed from OpenAlex freshness heuristics)
    if (item.works_count !== undefined && item.works_count < EMERGING_WORKS_COUNT_THRESHOLD) {
      score += EMERGING_WORKS_BOOST; // Likely emerging researcher/topic
    }

    // Boost institutional entities for research credibility
    if (item.entity_type === 'institution') {
      score += INSTITUTION_BOOST;
    }

    const suggestion: SearchSuggestion = {
      id: item.id ?? `${item.entity_type}-${item.display_name}`,
      displayName: decodeHtmlEntities(item.display_name),
      entityType: mapEntityType(item.entity_type),
      description: item.entity_type,
      worksCount: item.works_count,
      citedByCount: item.cited_by_count,
      score,
      trending: item.cited_by_count !== undefined && item.cited_by_count > TRENDING_CITATION_THRESHOLD,
      recent: item.works_count !== undefined && item.works_count < RECENT_WORKS_COUNT_THRESHOLD,
    };

    // Add relevance reason for highly scored suggestions
    if (score >= HIGHLY_CITED_SCORE_THRESHOLD) {
      suggestion.relevanceReason = 'Highly cited research';
    } else if (score >= EMERGING_SCORE_THRESHOLD) {
      suggestion.relevanceReason = 'Emerging research';
    } else if (item.entity_type === 'institution') {
      suggestion.relevanceReason = 'Research institution';
    }

    return suggestion;
  });

  // Sort by calculated score for research relevance
  transformedSuggestions.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return transformedSuggestions;
};
