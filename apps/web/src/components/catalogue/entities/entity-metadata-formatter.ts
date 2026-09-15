/**
 * Utility functions for formatting entity metadata for display
 * Handles various OpenAlex entity types with type-safe metadata extraction
 */

import type { CatalogueEntity } from "@bibgraph/utils";

import type { EntityMetadata } from "@/types/catalogue";
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
 */
export const formatEntityMetadata = (
  entity: CatalogueEntity & { metadata?: EntityMetadata }
): string => {
  // Enriched entities carry a `metadata` field; base CatalogueEntity objects from storage do not.
  const { metadata } = entity;

  if (metadata === undefined) {
    // Fallback for non-enriched entities - show entity type info
    return `Entity: ${entity.entityId}`;
  }

  if (isWorkMetadata(metadata)) {
    const parts: string[] = [`${String(metadata.citedByCount)} citations`];
    if (metadata.publicationYear !== undefined) {
      parts.push(String(metadata.publicationYear));
    }
    return parts.join(" • ") || "No citation data";
  }

  if (isAuthorMetadata(metadata)) {
    const parts: string[] = [`${String(metadata.worksCount)} works`];
    if (metadata.hIndex !== undefined) {
      parts.push(`h-index: ${String(metadata.hIndex)}`);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isInstitutionMetadata(metadata)) {
    const parts: string[] = [`${String(metadata.worksCount)} works`];
    if (metadata.countryCode !== undefined && metadata.countryCode !== "") {
      parts.push(metadata.countryCode);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isSourceMetadata(metadata)) {
    const parts: string[] = [`${String(metadata.worksCount)} works`];
    const firstIssn = metadata.issn?.[0];
    if (firstIssn !== undefined) {
      parts.push(`ISSN: ${firstIssn}`);
    }
    return parts.join(" • ") || "No works data";
  }

  if (isTopicMetadata(metadata)) {
    const parts: string[] = [
      `${String(metadata.worksCount)} works`,
      `${String(metadata.citedByCount)} citations`,
    ];
    return parts.join(" • ") || "No data";
  }

  if (isFunderMetadata(metadata)) {
    const parts: string[] = [
      `${String(metadata.worksCount)} works`,
      `${String(metadata.citedByCount)} citations`,
    ];
    return parts.join(" • ") || "No data";
  }

  if (isPublisherMetadata(metadata)) {
    const parts: string[] = [
      `${String(metadata.worksCount)} works`,
      `${String(metadata.citedByCount)} citations`,
    ];
    return parts.join(" • ") || "No data";
  }

  if (isConceptMetadata(metadata)) {
    const parts: string[] = [
      `${String(metadata.worksCount)} works`,
      `${String(metadata.citedByCount)} citations`,
    ];
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
  if (notes === undefined || notes === "") return "No notes";

  // Check for graph list serialized format: "provenance:TYPE|label:LABEL"
  const provenanceMatch = /^provenance:([^|]+)(?:\|label:.+)?$/.exec(notes);
  if (provenanceMatch) {
    const [, provenanceType] = provenanceMatch;
    return PROVENANCE_LABELS[provenanceType] || provenanceType;
  }

  return notes;
};
