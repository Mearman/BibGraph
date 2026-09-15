/**
 * ISSN Validation and Normalization Utilities
 *
 * Provides comprehensive ISSN (International Standard Serial Number) handling:
 * - Format detection and validation
 * - Normalization to standard format (1234-5678)
 * - Checksum verification (ISO 3297)
 * - Error handling and logging
 */

import { logger } from "../internal/logger";

/**
Number of digits before the hyphen in standard ISSN format (1234-5678)
 */
const ISSN_PREFIX_DIGIT_COUNT = 4;

/**
Number of digits (excluding the check digit) used in the ISO 3297 checksum calculation
 */
const ISSN_CHECKSUM_DIGIT_COUNT = 7;

/**
Weight applied to the first digit in the ISO 3297 checksum calculation, decreasing by 1 per subsequent digit
 */
const ISSN_CHECKSUM_WEIGHT_BASE = 8;

/**
Modulus used in the ISO 3297 checksum calculation
 */
const ISSN_CHECKSUM_MODULUS = 11;

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
  const isStandardFormat = /^\d{4}-\d{3}[\dX]$/i.test(normalized);
  const isBareFormat = /^\d{7}[\dX]$/i.test(normalized);

  return isStandardFormat || isBareFormat;
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
    return `${cleaned.slice(0, ISSN_PREFIX_DIGIT_COUNT)}-${cleaned.slice(ISSN_PREFIX_DIGIT_COUNT)}`;
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
  if (normalized === null) {
    return false;
  }

  // Remove hyphen for calculation
  const digits = normalized.replace("-", "");

  // Calculate checksum for first 7 digits
  let sum = 0;
  for (let index = 0; index < ISSN_CHECKSUM_DIGIT_COUNT; index++) {
    sum += Number.parseInt(digits[index]) * (ISSN_CHECKSUM_WEIGHT_BASE - index);
  }

  const remainder = sum % ISSN_CHECKSUM_MODULUS;
  const expectedCheckDigit =
    remainder === 0
      ? "0"
      : (remainder === 1
        ? "X"
        : (ISSN_CHECKSUM_MODULUS - remainder).toString());

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
export const validateAndNormalizeISSN = (issn: string, options: Readonly<ISSNValidationOptions> = {}): string | null => {
  const normalized = normalizeISSN(issn);
  if (normalized === null) {
    logger.warn("issn", `Invalid ISSN format: ${issn}`);
    return null;
  }

  // Optionally validate checksum
  if (options.validateChecksum === true && !validateISSNChecksum(normalized)) {
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
    return trimmed.includes(":") ? "scheme_notation" : "with_prefix";
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
export const validateISSN = (issn: string, options: Readonly<ISSNValidationOptions> = {}): ISSNValidationResult => {
  if (!issn || typeof issn !== "string") {
    return { isValid: false, error: "ISSN must be a non-empty string" };
  }

  const format = detectISSNFormat(issn);

  // Validate and normalize
  const normalized = validateAndNormalizeISSN(issn, { validateChecksum: false });
  if (normalized === null) {
    return { isValid: false, error: "Invalid ISSN format" };
  }

  const result: ISSNValidationResult = {
    isValid: true,
    normalized,
    format,
  };

  // Optional checksum validation
  if (options.validateChecksum === true) {
    return {
      ...result,
      checksumValid: validateISSNChecksum(normalized),
    };
  }

  return result;
};
