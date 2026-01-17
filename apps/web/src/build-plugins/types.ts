/**
 * Types, interfaces, schemas, and constants for OpenAlex data management plugin
 */
import { z } from "zod";

// Unified Index Structure
export interface IndexEntry {
  lastModified?: string;
  contentHash?: string;
}

// Unified index: keys can be queries, entities, or URLs in various formats
export interface UnifiedIndex {
  [key: string]: ExtendedIndexEntry;
}

// Extended index entry with metadata for build plugin
export interface ExtendedIndexEntry {
  type?: "file" | "directory";
  lastModified?: string;
  contentHash?: string;
}

// Parsed key structure for understanding resource types
export interface ParsedKey {
  type: "entity" | "query";
  entityType: string;
  entityId?: string;
  queryParams?: Record<string, unknown>;
  originalKey: string;
  canonicalUrl: string;
}

// Redirect update structure for index management
export interface RedirectUpdate {
  oldKey: string;
  newKey: string;
  metadata: IndexEntry;
}

// Result of seeding missing data
export interface SeedMissingDataResult {
  keysToRemove: Set<string>;
  redirectUpdates: RedirectUpdate[];
}

// Zod schemas for type validation
export const IndexEntrySchema = z.object({
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
});

export const QueryParamsSchema = z.record(z.string(), z.unknown());

export const QueryDefinitionSchema = z.object({
  params: QueryParamsSchema.optional(),
  url: z.string().optional(),
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
});

export const OldEntityIndexSchema = z.object({
  entityType: z.string(),
  entities: z.array(z.string()),
});

export const OldQueryIndexSchema = z.object({
  entityType: z.string().optional(),
  queries: z.union([
    z.array(
      z.object({
        query: QueryDefinitionSchema,
        lastModified: z.string().optional(),
        contentHash: z.string().optional(),
      }),
    ),
    z.record(z.string(), QueryDefinitionSchema),
  ]),
});

export const RequestsWrapperSchema = z.object({
  requests: z.record(
    z.string(),
    z.object({
      $ref: z.string().optional(),
      lastModified: z.string().optional(),
      contentHash: z.string().optional(),
    }),
  ),
});

export const FlatIndexSchema = z.record(z.string(), IndexEntrySchema);

// Entity types supported by OpenAlex
export const ENTITY_TYPES = [
  "works",
  "authors",
  "institutions",
  "topics",
  "sources",
  "publishers",
  "funders",
  "concepts",
  "autocomplete",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// Entity type to endpoint mapping
export const ENTITY_TYPE_TO_ENDPOINT: Record<string, string> = {
  authors: "authors",
  works: "works",
  institutions: "institutions",
  topics: "topics",
  publishers: "publishers",
  funders: "funders",
  sources: "sources",
  concepts: "concepts",
};

// Entity prefix mapping
const ENTITY_PREFIX_MAP: Record<string, string> = {
  works: "W",
  authors: "A",
  institutions: "I",
  topics: "T",
  sources: "S",
  publishers: "P",
  funders: "F",
  concepts: "C",
  autocomplete: "", // Autocomplete doesn't use entity prefixes, only queries
};

/**
 * Get the OpenAlex ID prefix for a given entity type
 * @param entityType
 */
export const getEntityPrefix = (entityType: string): string => {
  return ENTITY_PREFIX_MAP[entityType] ?? "";
};

/**
 * Infer entity type from OpenAlex ID prefix
 * @param id
 */
export const inferEntityTypeFromId = (id: string): string => {
  if (id.startsWith("W")) return "works";
  if (id.startsWith("A")) return "authors";
  if (id.startsWith("I")) return "institutions";
  if (id.startsWith("T")) return "topics";
  if (id.startsWith("S")) return "sources";
  if (id.startsWith("P")) return "publishers";
  if (id.startsWith("F")) return "funders";
  if (id.startsWith("C")) return "concepts";

  // Default fallback
  return "works";
};

/**
 * Helper function to convert IndexEntry to ExtendedIndexEntry
 * @param indexEntry
 * @param _$ref
 */
export const indexEntryToUnified = (indexEntry: IndexEntry, _$ref?: string): ExtendedIndexEntry => {
  return {
    lastModified: indexEntry.lastModified,
    contentHash: indexEntry.contentHash,
  };
};
