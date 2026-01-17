/**
 * ISSN Validation and Normalization Utilities
 *
 * Provides comprehensive ISSN (International Standard Serial Number) handling:
 * - Format detection and validation
 * - Normalization to standard format (1234-5678)
 * - Checksum verification (ISO 3297)
 * - Error handling and logging
 *
 * @module issn-utils
 */

import { logger } from "../internal/logger";

/**
 * ISSN validation options
 */
export interface ISSNValidationOptions {
  validateChecksum?: boolean;
}

/**
 * Result of ISSN validation
 */
export interface ISSNValidationResult {
  isValid: boolean;
  normalized?: string;
  format?: "standard" | "with_prefix" | "scheme_notation" | "bare" | "unknown";
  checksumValid?: boolean;
  error?: string;
}

/**
 * Validates if a string matches a valid ISSN format
 * Supports formats: 1234-5678, ISSN 1234-5678, issn:1234-5678, 12345678
 * @param issn - The ISSN string to validate
 * @returns True if the format is valid (before checksum validation)
 */
export const isValidISSNFormat = (issn: string): boolean => {
  if (!issn || typeof issn !== "string") {
    return false;
  }

  // Remove common prefixes and normalize - handle various prefix formats
  const normalized = issn
    .trim()
    .toLowerCase()
    .replace(/^(?:issn[\s:]*|eissn[\s:]*)/i, "")
    .trim();

  // Check for standard ISSN format (with hyphen) or bare 8-digit format
  const standardFormat = /^\d{4}-\d{3}[\dX]$/i.test(normalized);
  const bareFormat = /^\d{7}[\dX]$/i.test(normalized);

  return standardFormat || bareFormat;
};

/**
 * Normalizes ISSN to standard format (1234-5678)
 * @param issn - The ISSN string to normalize
 * @returns Normalized ISSN or null if invalid format
 */
export const normalizeISSN = (issn: string): string | null => {
  if (!isValidISSNFormat(issn)) {
    return null;
  }

  // Remove prefixes and normalize case - handle various prefix formats
  const cleaned = issn
    .trim()
    .toLowerCase()
    .replace(/^(?:issn[\s:]*|eissn[\s:]*)/i, "")
    .trim()
    .replaceAll(/[^\d\-x]/gi, "")
    .toUpperCase();

  // Add hyphen if missing (bare 8-digit format)
  if (/^\d{7}[\dX]$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }

  // Already in standard format
  if (/^\d{4}-\d{3}[\dX]$/.test(cleaned)) {
    return cleaned;
  }

  return null;
};

/**
 * Validates ISSN checksum digit according to ISO 3297
 * @param issn - Normalized ISSN (1234-5678 format) or raw ISSN
 * @returns True if checksum is valid
 */
export const validateISSNChecksum = (issn: string): boolean => {
  const normalized = normalizeISSN(issn);
  if (!normalized) {
    return false;
  }

  // Remove hyphen for calculation
  const digits = normalized.replace("-", "");

  // Calculate checksum for first 7 digits
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += Number.parseInt(digits[i]) * (8 - i);
  }

  const remainder = sum % 11;
  const expectedCheckDigit =
    remainder === 0
      ? "0"
      : (remainder === 1
        ? "X"
        : (11 - remainder).toString());

  const actualCheckDigit = digits[7];
  return actualCheckDigit === expectedCheckDigit;
};

/**
 * Detects if a string is a potential ISSN identifier
 * @param id - The identifier to check
 * @returns True if it looks like an ISSN
 */
export const isISSNIdentifier = (id: string): boolean => {
  if (!id || typeof id !== "string") {
    return false;
  }

  // Check for explicit ISSN prefixes
  if (/^(?:issn[\s:]*|eissn[\s:]*)/i.test(id.trim())) {
    return true;
  }

  // Check for ISSN format patterns (but exclude OpenAlex IDs)
  if (id.startsWith("S") && /^S\d+$/.test(id)) {
    return false; // OpenAlex source ID
  }

  return isValidISSNFormat(id);
};

/**
 * Validates and normalizes an ISSN with full validation
 * @param issn - The ISSN to validate
 * @param options - Validation options
 * @returns Normalized ISSN if valid, null otherwise
 */
export const validateAndNormalizeISSN = (issn: string, options: ISSNValidationOptions = {}): string | null => {
  const normalized = normalizeISSN(issn);
  if (!normalized) {
    logger.warn("issn", `Invalid ISSN format: ${issn}`);
    return null;
  }

  // Optionally validate checksum
  if (options.validateChecksum && !validateISSNChecksum(normalized)) {
    logger.warn(
      "issn",
      `Invalid ISSN checksum: ${issn} (normalized: ${normalized})`,
    );
    return null;
  }

  return normalized;
};

/**
 * Determines the format type of an ISSN string
 * @param issn - The ISSN string to analyze
 * @returns The detected format type
 */
export const detectISSNFormat = (issn: string): "standard" | "with_prefix" | "scheme_notation" | "bare" | "unknown" => {
  if (!issn || typeof issn !== "string") {
    return "unknown";
  }

  const trimmed = issn.trim();

  if (/^\d{4}-\d{3}[\dX]$/i.test(trimmed)) {
    return "standard";
  }

  if (/^(?:EISSN|ISSN)[\s:]/i.test(trimmed)) {
    return /:/.test(trimmed) ? "scheme_notation" : "with_prefix";
  }

  if (/^\d{7}[\dX]$/i.test(trimmed)) {
    return "bare";
  }

  return "unknown";
};

/**
 * Full ISSN validation with format detection and optional checksum verification
 * @param issn - ISSN to validate
 * @param options - Validation options
 * @returns Validation result with normalized ISSN if valid
 */
export const validateISSN = (issn: string, options: ISSNValidationOptions = {}): ISSNValidationResult => {
  if (!issn || typeof issn !== "string") {
    return { isValid: false, error: "ISSN must be a non-empty string" };
  }

  const format = detectISSNFormat(issn);

  // Validate and normalize
  const normalized = validateAndNormalizeISSN(issn, { validateChecksum: false });
  if (!normalized) {
    return { isValid: false, error: "Invalid ISSN format" };
  }

  const result: ISSNValidationResult = {
    isValid: true,
    normalized,
    format,
  };

  // Optional checksum validation
  if (options.validateChecksum) {
    return {
      ...result,
      checksumValid: validateISSNChecksum(normalized),
    };
  }

  return result;
};
