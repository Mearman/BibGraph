/**
 * Types, static option lists, and pure helpers for the advanced search filters panel.
 */

export interface AdvancedSearchFilters {
  // Text filters
  title?: string;
  abstract?: string;
  author?: string;
  institution?: string;
  venue?: string;
  keywords?: string;

  // Date filters
  publicationYear?: {
    from?: number;
    to?: number;
  };
  dateRangePreset?: string;

  // Type filters
  entityType?: string[];
  publicationType?: string[];
  openAccess?: boolean;

  // Citation filters
  citationCount?: {
    from?: number;
    to?: number;
  };
  citationImpact?: string;

  // Field of study
  fieldOfStudy?: string[];
  concepts?: string[];

  // Language
  language?: string[];
}

export const ENTITY_TYPES = [
  { value: "works", label: "Works (Papers, Books, etc.)" },
  { value: "authors", label: "Authors" },
  { value: "institutions", label: "Institutions" },
  { value: "venues", label: "Venues (Journals, Conferences)" },
  { value: "concepts", label: "Concepts & Topics" },
];

export const PUBLICATION_TYPES = [
  { value: "journal-article", label: "Journal Article" },
  { value: "book", label: "Book" },
  { value: "book-chapter", label: "Book Chapter" },
  { value: "conference-paper", label: "Conference Paper" },
  { value: "dissertation", label: "Dissertation/Thesis" },
  { value: "patent", label: "Patent" },
  { value: "preprint", label: "Preprint" },
  { value: "report", label: "Report" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

export const COMMON_FIELDS = [
  { value: "Computer Science", label: "Computer Science" },
  { value: "Medicine", label: "Medicine" },
  { value: "Biology", label: "Biology" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Physics", label: "Physics" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Engineering", label: "Engineering" },
  { value: "Psychology", label: "Psychology" },
  { value: "Economics", label: "Economics" },
  { value: "Sociology", label: "Sociology" },
];

// Date range presets for quick filtering
export const DATE_RANGE_PRESETS = [
  { value: "this-year", label: "This Year", from: 2024, to: 2024 },
  { value: "last-5-years", label: "Last 5 Years", from: 2019, to: 2024 },
  { value: "last-10-years", label: "Last 10 Years", from: 2014, to: 2024 },
  { value: "2000s", label: "2000s", from: 2000, to: 2009 },
  { value: "1990s", label: "1990s", from: 1990, to: 1999 },
  { value: "classic", label: "Classic (pre-1990)", from: 1900, to: 1989 },
];

export const MIN_PUBLICATION_YEAR = 1900;
export const MAX_PUBLICATION_YEAR = 2024;

// Citation impact levels
export const CITATION_IMPACT_LEVELS = [
  { value: "high", label: "High Impact (100+)", from: 100, to: undefined },
  { value: "moderate", label: "Moderate (10-99)", from: 10, to: 99 },
  { value: "low", label: "Low (0-9)", from: 0, to: 9 },
  { value: "viral", label: "Viral (1000+)", from: 1000, to: undefined },
];

// Quick filter entity type pills with colors
export const QUICK_ENTITY_FILTERS = [
  { value: "works", label: "Works", color: "blue" },
  { value: "authors", label: "Authors", color: "green" },
  { value: "institutions", label: "Institutions", color: "orange" },
  { value: "venues", label: "Venues", color: "purple" },
  { value: "concepts", label: "Concepts", color: "pink" },
];

// Every field of AdvancedSearchFilters, typed so indexed access stays a real union instead of falling back to `any` the way a plain `Object.keys()` string index would.
export const FILTER_KEYS: (keyof AdvancedSearchFilters)[] = [
  "title",
  "abstract",
  "author",
  "institution",
  "venue",
  "keywords",
  "publicationYear",
  "dateRangePreset",
  "entityType",
  "publicationType",
  "openAccess",
  "citationCount",
  "citationImpact",
  "fieldOfStudy",
  "concepts",
  "language",
];

interface FilterRange {
  from?: number;
  to?: number;
}

const isFilterRange = (value: unknown): value is FilterRange =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Whether a single filter field's current value should count as "set".
 */
export const isFilterValueActive = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isFilterRange(value)) {
    return value.from !== undefined || value.to !== undefined;
  }
  return true;
};

/**
 * How many active sub-values a single filter field contributes to the displayed count (a range field with both ends set counts as 2).
 */
export const countActiveSubValues = (value: unknown): number => {
  if (value === undefined || value === null || value === "") return 0;
  if (Array.isArray(value)) return value.length;
  if (isFilterRange(value)) {
    return (value.from !== undefined ? 1 : 0) + (value.to !== undefined ? 1 : 0);
  }
  return 1;
};

/**
 * Render a single active filter field's value as a short, human-readable summary label for the "Active Filters" badge list.
 */
export const formatFilterSummaryValue = (
  key: keyof AdvancedSearchFilters,
  value: unknown,
  filters: Readonly<AdvancedSearchFilters>,
): string => {
  switch (key) {
    case "entityType":
    case "publicationType":
    case "language":
    case "fieldOfStudy":
    case "concepts":
      return `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`;
    case "publicationYear": {
      // Check for preset first
      if (filters.dateRangePreset !== undefined && filters.dateRangePreset !== "") {
        const preset = DATE_RANGE_PRESETS.find(p => p.value === filters.dateRangePreset);
        if (preset) return `dates: ${preset.label}`;
      }
      // Fallback to custom range
      if (isFilterRange(value)) {
        if (value.from !== undefined && value.to !== undefined) {
          return `year: ${String(value.from)}-${String(value.to)}`;
        }
        if (value.from !== undefined) {
          return `year: >= ${String(value.from)}`;
        }
        if (value.to !== undefined) {
          return `year: <= ${String(value.to)}`;
        }
      }
      return "";
    }
    case "citationCount": {
      // Check for impact level first
      if (filters.citationImpact !== undefined && filters.citationImpact !== "") {
        const impact = CITATION_IMPACT_LEVELS.find(l => l.value === filters.citationImpact);
        if (impact) return `impact: ${impact.label}`;
      }
      // Fallback to custom range
      if (isFilterRange(value) && (value.from !== undefined || value.to !== undefined)) {
        const fromLabel = value.from !== undefined ? String(value.from) : "0";
        const toLabel = value.to !== undefined ? String(value.to) : "∞";
        return `citations: ${fromLabel}-${toLabel}`;
      }
      return "";
    }
    case "dateRangePreset": {
      const preset = DATE_RANGE_PRESETS.find(p => p.value === value);
      return preset ? `dates: ${preset.label}` : "";
    }
    case "citationImpact": {
      const impact = CITATION_IMPACT_LEVELS.find(l => l.value === value);
      return impact ? `impact: ${impact.label}` : "";
    }
    case "openAccess":
      return value === true ? "Open Access" : "";
    case "title":
    case "abstract":
    case "author":
    case "institution":
    case "venue":
    case "keywords":
      return typeof value === "string" ? `${key}: ${value}` : "";
    default:
      return "";
  }
};
