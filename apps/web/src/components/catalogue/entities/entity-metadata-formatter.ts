/**
 * Utility functions for formatting entity metadata for display
 * Handles various OpenAlex entity types with type-safe metadata extraction
 */

import type { CatalogueEntity } from "@bibgraph/utils";

import {
  isAuthorMetadata,
  isConceptMetadata,
  isFunderMetadata,
  isInstitutionMetadata,
  isPublisherMetadata,
  isSourceMetadata,
  isTopicMetadata,
  isWorkMetadata,
} from "@/utils/catalogue-guards";

/**
 * Provenance labels for graph list entries
 * Maps technical provenance values to user-friendly descriptions
 */
export const PROVENANCE_LABELS: Record<string, string> = {
  user: "Added manually",
  "collection-load": "Loaded from collection",
  expansion: "Discovered via expansion",
  "auto-population": "Auto-populated",
};

/**
 * Formats entity metadata for display based on entity type
 * Note: Metadata is only available when entities are enriched with OpenAlex data.
 * For base CatalogueEntity objects from storage, this will show entity ID.
 * @param entity
 */
export const formatEntityMetadata = (entity: CatalogueEntity): string => {
  // Type guard: Check if entity has metadata property (enriched entity)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedEntity = entity as CatalogueEntity & { metadata?: any };

  if (!enrichedEntity.metadata) {
    // Fallback for non-enriched entities - show entity type info
    return `Entity: ${entity.entityId}`;
  }

  const { metadata } = enrichedEntity;

  if (isWorkMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    if (metadata.publicationYear) {
      parts.push(`${metadata.publicationYear}`);
    }
    return parts.join(" • ") || "No citation data";
  }

  if (isAuthorMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.hIndex !== undefined) {
      parts.push(`h-index: ${metadata.hIndex}`);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isInstitutionMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.countryCode) {
      parts.push(metadata.countryCode);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isSourceMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.issn && metadata.issn.length > 0) {
      parts.push(`ISSN: ${metadata.issn[0]}`);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isTopicMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(" • ") || "No data";
  }

  if (isFunderMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(" • ") || "No data";
  }

  if (isPublisherMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(" • ") || "No data";
  }

  if (isConceptMetadata(metadata)) {
    const parts: string[] = [];
    if (metadata.worksCount !== undefined) {
      parts.push(`${metadata.worksCount} works`);
    }
    if (metadata.citedByCount !== undefined) {
      parts.push(`${metadata.citedByCount} citations`);
    }
    return parts.join(" • ") || "No data";
  }

  return "No metadata";
};

/**
 * Formats notes field for user-friendly display
 * Handles graph list serialized format: "provenance:TYPE|label:LABEL"
 * @param notes - Raw notes string from entity
 * @returns User-friendly display string
 */
export const formatNotesForDisplay = (notes: string | undefined): string => {
  if (!notes) return "No notes";

  // Check for graph list serialized format: "provenance:TYPE|label:LABEL"
  const provenanceMatch = notes.match(/^provenance:([^|]+)(?:\|label:.+)?$/);
  if (provenanceMatch) {
    const [, provenanceType] = provenanceMatch;
    return PROVENANCE_LABELS[provenanceType] || provenanceType;
  }

  return notes;
};
