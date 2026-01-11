/**
 * Field Label Humanization Utility
 *
 * Provides human-readable labels for OpenAlex API field names.
 * This centralizes the mapping to ensure consistent labeling across the UI.
 */

/**
 * Mapping of API field names to human-readable labels.
 * Keys are lowercase to enable case-insensitive matching.
 */
const FIELD_LABELS: Record<string, string> = {
  // Identifiers
  id: "ID",
  ids: "External IDs",
  doi: "DOI",
  orcid: "ORCID",
  ror: "ROR ID",
  mag: "MAG ID",
  openalex_id: "OpenAlex ID",
  pmid: "PubMed ID",
  pmcid: "PMC ID",
  issn: "ISSN",
  issn_l: "ISSN-L",
  wikidata: "Wikidata",
  wikipedia: "Wikipedia",

  // Basic Information
  display_name: "Name",
  display_name_alternatives: "Name Alternatives",
  title: "Title",
  type: "Type",
  type_crossref: "Type (Crossref)",
  description: "Description",
  homepage_url: "Homepage",
  image_url: "Image URL",
  thumbnail_url: "Thumbnail",

  // Metrics
  cited_by_count: "Times Cited",
  works_count: "Works Count",
  h_index: "H-Index",
  i10_index: "i10-Index",
  "2yr_mean_citedness": "2-Year Mean Citedness",
  "2yr_cited_by_count": "2-Year Citation Count",
  "2yr_works_count": "2-Year Works Count",
  "2yr_i10_index": "2-Year i10-Index",
  "2yr_h_index": "2-Year H-Index",
  fwci: "Field-Weighted Citation Impact",
  citation_normalized_percentile: "Citation Percentile",
  cited_by_percentile_year: "Citation Percentile (Year)",
  summary_stats: "Summary Statistics",
  counts_by_year: "Counts By Year",

  // Open Access
  is_oa: "Open Access",
  oa_status: "OA Status",
  oa_url: "OA URL",
  has_fulltext: "Has Full Text",
  is_in_doaj: "In DOAJ",
  apc_list: "APC List Price",
  apc_paid: "APC Paid",

  // Dates
  publication_date: "Publication Date",
  publication_year: "Publication Year",

  // Geographic
  country_code: "Country Code",
  countries_distinct_count: "Countries",
  geo: "Geographic Data",
  latitude: "Latitude",
  longitude: "Longitude",
  city: "City",
  region: "Region",

  // Authorship & Affiliations
  authorships: "Authors",
  institutions: "Institutions",
  affiliations: "Affiliations",
  last_known_institutions: "Last Known Institutions",
  last_known_institution: "Last Known Institution",
  corresponding_author_ids: "Corresponding Authors",
  corresponding_institution_ids: "Corresponding Institutions",

  // Content & Classification
  concepts: "Concepts",
  topics: "Topics",
  keywords: "Keywords",
  mesh: "MeSH Terms",
  sustainable_development_goals: "UN SDGs",
  grants: "Grants",
  referenced_works: "References",
  related_works: "Related Works",
  cited_by_api_url: "Cited By",

  // Locations
  primary_location: "Primary Location",
  locations: "Locations",
  best_oa_location: "Best OA Location",
  alternate_host_venues: "Alternate Venues",
  host_venue: "Host Venue",

  // Source-specific
  publisher: "Publisher",
  host_organization: "Host Organization",
  host_organization_name: "Host Organization Name",
  host_organization_lineage: "Host Organization Lineage",
  lineage: "Lineage",
  associated_institutions: "Associated Institutions",

  // Work-specific
  abstract_inverted_index: "Abstract",
  biblio: "Bibliographic Info",
  language: "Language",
  license: "License",
  version: "Version",
  is_retracted: "Retracted",
  is_paratext: "Is Paratext",

  // Other
  x_concepts: "Concepts (Legacy)",
  relevance_score: "Relevance Score",
  works: "Works",
};

/**
 * Convert an API field name to a human-readable label.
 * Uses the predefined mapping or falls back to automatic formatting.
 *
 * @param key - The API field name (e.g., "2yr_mean_citedness", "cited_by_count")
 * @returns Human-readable label (e.g., "2-Year Mean Citedness", "Times Cited")
 */
export const humanizeFieldName = (key: string): string => {
  // Check for exact match (case-insensitive)
  const lowerKey = key.toLowerCase();
  if (lowerKey in FIELD_LABELS) {
    return FIELD_LABELS[lowerKey];
  }

  // Fallback: convert snake_case to Title Case with special handling
  return key
    // Handle year prefix patterns like "2yr_" -> "2-Year "
    .replace(/^(\d+)yr_/i, "$1-Year ")
    // Replace underscores with spaces
    .replaceAll("_", " ")
    // Capitalize first letter of each word
    .replaceAll(/\b\w/g, (l) => l.toUpperCase())
    // Handle common abbreviations that should stay uppercase
    .replaceAll(/\bId\b/g, "ID")
    .replaceAll(/\bDoi\b/g, "DOI")
    .replaceAll(/\bOrcid\b/g, "ORCID")
    .replaceAll(/\bRor\b/g, "ROR")
    .replaceAll(/\bOa\b/g, "OA")
    .replaceAll(/\bApi\b/g, "API")
    .replaceAll(/\bUrl\b/g, "URL");
};

/**
 * Get label for a field, with optional custom overrides.
 *
 * @param key - The API field name
 * @param customLabels - Optional custom label overrides
 * @returns Human-readable label
 */
export const getFieldLabel = (
  key: string,
  customLabels?: Record<string, string>
): string => {
  // Check custom labels first
  if (customLabels && key in customLabels) {
    return customLabels[key];
  }
  return humanizeFieldName(key);
};
