/**
 * Advanced Field Selection - Minimal stub implementation
 */

export interface AdvancedEntityFieldSelections {
  works: { minimal: string[] };
  authors: { minimal: string[] };
  sources: { minimal: string[] };
  institutions: { minimal: string[] };
  topics: { minimal: string[] };
  concepts: { minimal: string[] };
  publishers: { minimal: string[] };
  funders: { minimal: string[] };
  domains: { minimal: string[] };
  fields: { minimal: string[] };
  subfields: { minimal: string[] };
}

export const ADVANCED_FIELD_SELECTIONS: AdvancedEntityFieldSelections = {
  works: {
    minimal: [
      "id",
      "display_name",
      "publication_year",
      "type",
      "open_access",
      "authorships",
      "primary_location",
      "referenced_works",
      "topics",
      "grants",        // T013: Add grants field for Work → Funder relationships
      "keywords",      // T014: Add keywords field for Work → Keyword relationships
      "concepts",      // T015: Add concepts field for Work → Concept relationships (legacy)
    ],
  },
  authors: {
    minimal: [
      "id",
      "display_name",
      "works_count",
      "last_known_institutions",
      "orcid",
      "topics",        // T016: Add enhanced topics field with count/score metadata
    ],
  },
  sources: {
    minimal: [
      "id",
      "display_name",
      "type",
      "publisher",
      "topics",        // T017: Add enhanced topics field with count/score metadata
    ],
  },
  institutions: {
    minimal: [
      "id",
      "display_name",
      "country_code",
      "type",
      "lineage",
      "topics",        // T018: Add enhanced topics field with count/score metadata
      "repositories", // T019: Add repositories field for Institution → Source relationships
      "roles",         // T020: Add roles field for cross-entity mappings
    ],
  },
  topics: {
    minimal: ["id", "display_name", "keywords", "subfield", "field", "domain"],
  },
  concepts: {
    minimal: ["id", "display_name", "keywords"],
  },
  publishers: {
    minimal: ["id", "display_name", "works_count"],
  },
  funders: {
    minimal: ["id", "display_name", "works_count"],
  },
  domains: {
    minimal: ["id", "display_name", "fields"],
  },
  fields: {
    minimal: ["id", "display_name", "domain", "subfields"],
  },
  subfields: {
    minimal: ["id", "display_name", "field", "domain", "topics"],
  },
};

export const createAdvancedFieldSelection = (entityType: keyof AdvancedEntityFieldSelections): string[] => ADVANCED_FIELD_SELECTIONS[entityType].minimal;
