/**
 * Query Builder Constants
 *
 * Common constants for OpenAlex query building operations.
 */

/**
 * Common sort field constants for convenience
 */
export const SORT_FIELDS = {
  CITED_BY_COUNT: "cited_by_count",
  WORKS_COUNT: "works_count",
  PUBLICATION_YEAR: "publication_year",
  PUBLICATION_DATE: "publication_date",
  CREATED_DATE: "created_date",
  UPDATED_DATE: "updated_date",
  DISPLAY_NAME: "display_name",
  RELEVANCE_SCORE: "relevance_score",
} as const;

/**
 * Common field selection presets
 */
export const SELECT_PRESETS = {
  MINIMAL: ["id", "display_name"],
  BASIC: ["id", "display_name", "cited_by_count"],
  WORKS_DETAILED: [
    "id",
    "doi",
    "display_name",
    "publication_year",
    "publication_date",
    "cited_by_count",
    "is_oa",
    "primary_location",
    "authorships",
  ],
  AUTHORS_DETAILED: [
    "id",
    "display_name",
    "orcid",
    "works_count",
    "cited_by_count",
    "last_known_institution",
    "affiliations",
  ],
} as const;
