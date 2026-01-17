/**
 * Entity Type Detection Utilities
 *
 * Functions for detecting OpenAlex entity types from IDs and URLs
 */

/**
 * OpenAlex entity ID prefix to type mapping
 */
const ENTITY_PREFIX_MAP: Readonly<Record<string, string>> = {
  W: "works",
  A: "authors",
  S: "sources",
  I: "institutions",
  T: "topics",
  P: "publishers",
  F: "funders",
} as const;

/**
 * Valid OpenAlex entity types for URL detection
 */
const VALID_ENTITY_TYPES = new Set([
  "works",
  "authors",
  "sources",
  "institutions",
  "topics",
  "publishers",
  "funders",
  "concepts",
  "keywords",
]);

/**
 * OpenAlex ID pattern - matches both full URL and short form
 * Examples: "https://openalex.org/W123", "W123", "A456"
 */
const OPENALEX_ID_PATTERN = /^(?:https:\/\/openalex\.org\/)?[A-Z]\d+$/;

/**
 * Detect OpenAlex entity type from ID prefix
 * @param id - The OpenAlex ID (e.g., "W123", "A456")
 * @returns Entity type or null if not detectable
 */
export const detectEntityTypeFromId = (id: string): string | null => {
  if (!id) return null;
  const prefix = id.charAt(0);
  return ENTITY_PREFIX_MAP[prefix] ?? null;
};

/**
 * Detect entity type from URL path
 * Handles endpoints like "works", "works/W123", "authors/A123/works", etc.
 * @param url - The URL to parse
 * @returns Entity type or null if not detectable
 */
export const detectEntityTypeFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url, "https://api.openalex.org");
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);

    // Check last segment first (handles nested endpoints like /authors/A123/works)
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      if (VALID_ENTITY_TYPES.has(pathSegments[i])) {
        return pathSegments[i];
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Check if an object has a valid OpenAlex ID
 * Uses a loose check (just valid ID pattern) rather than full schema validation
 * This allows caching partial entities from list responses
 * @param obj - The object to check
 * @returns Type guard indicating if object has valid OpenAlex ID
 */
export const hasValidOpenAlexId = (obj: unknown): obj is { id: string } => {
  if (!obj || typeof obj !== "object") return false;
  const maybeEntity = obj as Record<string, unknown>;
  const id = maybeEntity.id;
  if (typeof id !== "string") return false;
  return OPENALEX_ID_PATTERN.test(id);
};
