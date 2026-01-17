/**
 * Types and interfaces for External ID Resolver
 *
 * Contains type definitions, validation result interfaces, and configuration
 * types used throughout the ID resolution system.
 */

/**
 * Supported external identifier types
 */
export type ExternalIdType =
  | "doi"
  | "orcid"
  | "ror"
  | "issn"
  | "pmid"
  | "wikidata"
  | "openalex"
  | "unknown";

/**
 * Validation result for external identifiers
 */
export interface IdValidationResult {
  /** Whether the identifier is valid */
  isValid: boolean;
  /** Detected identifier type */
  type: ExternalIdType;
  /** Normalized identifier (null if invalid) */
  normalized: string | null;
  /** Original input identifier */
  original: string;
  /** Error message if validation failed */
  error?: string;
  /** Additional metadata about the identifier */
  metadata?: {
    /** URL format if applicable */
    url?: string;
    /** Checksum validation result (for ORCID, ISSN) */
    checksumValid?: boolean;
    /** Entity type for OpenAlex IDs */
    entityType?: string;
  };
}

/**
 * Configuration for ID validation behavior
 */
export interface IdValidationConfig {
  /** Whether to validate checksums for ORCID and ISSN */
  validateChecksums: boolean;
  /** Whether to normalize to URL format when possible */
  preferUrls: boolean;
  /** Custom validation patterns (experimental) */
  customPatterns?: Record<string, RegExp>;
}

/**
 * Pattern definition for identifier validation
 */
export interface IdPattern {
  /** Human-readable name */
  name: string;
  /** Identifier type */
  type: ExternalIdType;
  /** Validation patterns (most specific first) */
  patterns: RegExp[];
  /** Normalization function */
  normalize: (match: string, config?: IdValidationConfig) => string | null;
  /** Validation function (optional, for checksum validation) */
  validate?: (normalized: string) => boolean;
  /** Examples for documentation */
  examples: string[];
  /** Description */
  description: string;
}
