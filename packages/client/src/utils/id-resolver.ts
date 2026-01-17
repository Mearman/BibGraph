/**
 * External ID Resolver and Validation Utilities
 *
 * Provides validation, normalization, and type detection for external identifiers
 * used in academic research including DOI, ORCID, ROR, ISSN, PMID, and Wikidata.
 *
 * This utility complements the EntityDetectionService by providing granular
 * validation functions and enhanced normalization capabilities.
 */

import { isNonEmptyString, isString } from "@bibgraph/utils";

import { idPatterns } from "./id-patterns";
import type {
  ExternalIdType,
  IdPattern,
  IdValidationConfig,
  IdValidationResult,
} from "./id-resolver-types";

// Re-export types for consumers

/**
 * External ID Resolver
 *
 * Provides validation, normalization, and detection for external identifiers
 * commonly used in academic research and publishing.
 */
export class IdResolver {
  private readonly config: IdValidationConfig;

  constructor(config: Partial<IdValidationConfig> = {}) {
    this.config = {
      validateChecksums: true,
      preferUrls: false,
      ...config,
    };
  }

  /**
   * Validate and normalize any external identifier
   * @param id
   */
  validateId(id: unknown): IdValidationResult {
    if (!isString(id) || !isNonEmptyString(id)) {
      return this.createInvalidResult(
        String(id),
        "Identifier must be a non-empty string"
      );
    }

    const trimmedId = id.trim();
    return this.validateTrimmedId(trimmedId);
  }

  /**
   * Validate a trimmed identifier string
   * @param trimmedId
   */
  private validateTrimmedId(trimmedId: string): IdValidationResult {
    for (const pattern of idPatterns) {
      const result = this.tryPattern(trimmedId, pattern);
      if (result) return result;
    }

    return this.createInvalidResult(trimmedId, "Unrecognized identifier format");
  }

  /**
   * Try to validate an ID against a specific pattern
   * @param trimmedId
   * @param pattern
   */
  private tryPattern(
    trimmedId: string,
    pattern: IdPattern
  ): IdValidationResult | null {
    for (const regex of pattern.patterns) {
      if (regex.test(trimmedId)) {
        return this.processPatternMatch(trimmedId, pattern);
      }
    }
    return null;
  }

  /**
   * Process a successful pattern match
   * @param trimmedId
   * @param pattern
   */
  private processPatternMatch(
    trimmedId: string,
    pattern: IdPattern
  ): IdValidationResult | null {
    try {
      const normalized = pattern.normalize(trimmedId, this.config);
      if (normalized === null) return null;

      const checksumValid = this.validateChecksumIfNeeded(pattern, normalized);
      if (checksumValid === false) {
        return {
          isValid: false,
          type: pattern.type,
          normalized: null,
          original: trimmedId,
          error: `Invalid ${pattern.name} checksum`,
          metadata: { checksumValid: false },
        };
      }

      const metadata = this.buildMetadata(
        normalized,
        pattern.type,
        checksumValid
      );
      return {
        isValid: true,
        type: pattern.type,
        normalized,
        original: trimmedId,
        metadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate checksum if needed
   * @param pattern
   * @param normalized
   */
  private validateChecksumIfNeeded(
    pattern: IdPattern,
    normalized: string
  ): boolean | undefined {
    if (this.config.validateChecksums && pattern.validate) {
      return pattern.validate(normalized);
    }
    return undefined;
  }

  /**
   * Build metadata for valid identifier
   * @param normalized
   * @param type
   * @param checksumValid
   */
  private buildMetadata(
    normalized: string,
    type: ExternalIdType,
    checksumValid?: boolean
  ): IdValidationResult["metadata"] {
    const url = this.getUrlFormat(normalized, type);
    const metadata: IdValidationResult["metadata"] = { url, checksumValid };

    if (type === "openalex") {
      const entityType = this.getOpenAlexEntityType(normalized);
      if (entityType) {
        metadata.entityType = entityType;
      }
    }

    return metadata;
  }

  /**
   * Create an invalid validation result
   * @param original
   * @param error
   */
  private createInvalidResult(
    original: string,
    error: string
  ): IdValidationResult {
    return {
      isValid: false,
      type: "unknown",
      normalized: null,
      original,
      error,
    };
  }

  /**
   * Batch validate multiple identifiers
   * @param ids
   */
  validateIds(ids: unknown[]): IdValidationResult[] {
    return ids.map((id) => this.validateId(id));
  }

  /**
   * Check if an identifier is valid for a specific type
   * @param id
   * @param type
   */
  isValidType(id: string, type: ExternalIdType): boolean {
    const result = this.validateId(id);
    return result.isValid && result.type === type;
  }

  /**
   * Get the URL format for an identifier
   * @param normalized
   * @param type
   */
  private getUrlFormat(
    normalized: string,
    type: ExternalIdType
  ): string | undefined {
    switch (type) {
      case "doi":
        return normalized.startsWith("https://")
          ? normalized
          : `https://doi.org/${normalized}`;
      case "orcid":
        return normalized.startsWith("https://")
          ? normalized
          : `https://orcid.org/${normalized}`;
      case "ror":
        return normalized.startsWith("https://")
          ? normalized
          : `https://ror.org/${normalized}`;
      case "pmid":
        return normalized.startsWith("https://")
          ? normalized
          : `https://pubmed.ncbi.nlm.nih.gov/${normalized}/`;
      case "wikidata":
        return normalized.startsWith("https://")
          ? normalized
          : `https://www.wikidata.org/wiki/${normalized}`;
      case "openalex":
        return normalized.startsWith("https://")
          ? normalized
          : `https://openalex.org/${normalized}`;
      case "issn":
        // ISSN doesn't have a standard URL format
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get OpenAlex entity type from ID prefix
   * @param id
   */
  private getOpenAlexEntityType(id: string): string | undefined {
    const prefixMatch = id.match(/^([ACFIKPQSTW])/i);
    if (!prefixMatch) return undefined;

    const prefixMap: Record<string, string> = {
      W: "works",
      A: "authors",
      S: "sources",
      I: "institutions",
      P: "publishers",
      C: "concepts",
      F: "funders",
      T: "topics",
      K: "keywords",
      Q: "keywords",
    };

    return prefixMap[prefixMatch[1].toUpperCase()];
  }

  // Individual validation functions

  isValidDOI(id: string): boolean {
    return this.isValidType(id, "doi");
  }

  isValidORCID(id: string): boolean {
    return this.isValidType(id, "orcid");
  }

  isValidROR(id: string): boolean {
    return this.isValidType(id, "ror");
  }

  isValidISSN(id: string): boolean {
    return this.isValidType(id, "issn");
  }

  isValidPMID(id: string): boolean {
    return this.isValidType(id, "pmid");
  }

  isValidWikidata(id: string): boolean {
    return this.isValidType(id, "wikidata");
  }

  isValidOpenAlex(id: string): boolean {
    return this.isValidType(id, "openalex");
  }

  // Normalization functions

  /**
   * Normalize identifier to standard format
   * @param id
   * @param type
   */
  normalizeId(id: string, type?: ExternalIdType): string | null {
    if (type) {
      // If type is specified, only check patterns for that type
      const patterns = idPatterns.filter((p) => p.type === type);
      for (const pattern of patterns) {
        for (const regex of pattern.patterns) {
          if (regex.test(id)) {
            return pattern.normalize(id, this.config);
          }
        }
      }
      return null;
    }

    // Otherwise use general validation
    const result = this.validateId(id);
    return result.normalized;
  }

  /**
   * Normalize identifier to URL format
   * @param id
   */
  normalizeToUrl(id: string): string | null {
    const result = this.validateId(id);
    return result.isValid ? (result.metadata?.url ?? null) : null;
  }

  /**
   * Get supported identifier types and their information
   */
  static getSupportedTypes(): Array<{
    type: ExternalIdType;
    name: string;
    description: string;
    examples: string[];
  }> {
    return idPatterns.map((pattern) => ({
      type: pattern.type,
      name: pattern.name,
      description: pattern.description,
      examples: pattern.examples,
    }));
  }
}

// Convenience functions for direct usage
export const createIdResolver = (
  config?: Partial<IdValidationConfig>
): IdResolver => new IdResolver(config);

// Export individual validation functions as standalone utilities
const defaultResolver = new IdResolver();

export const isValidDOI = (id: string): boolean =>
  defaultResolver.isValidDOI(id);
export const isValidORCID = (id: string): boolean =>
  defaultResolver.isValidORCID(id);
export const isValidROR = (id: string): boolean =>
  defaultResolver.isValidROR(id);
export const isValidISSN = (id: string): boolean =>
  defaultResolver.isValidISSN(id);
export const isValidPMID = (id: string): boolean =>
  defaultResolver.isValidPMID(id);
export const isValidWikidata = (id: string): boolean =>
  defaultResolver.isValidWikidata(id);
export const isValidOpenAlex = (id: string): boolean =>
  defaultResolver.isValidOpenAlex(id);

export const validateExternalId = (id: unknown): IdValidationResult =>
  defaultResolver.validateId(id);
export const normalizeExternalId = (
  id: string,
  type?: ExternalIdType
): string | null => defaultResolver.normalizeId(id, type);
export const normalizeToUrl = (id: string): string | null =>
  defaultResolver.normalizeToUrl(id);
