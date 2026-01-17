/**
 * ROR (Research Organization Registry) identifier validation and normalization utilities
 *
 * ## ROR ID Support
 *
 * Provides comprehensive support for Research Organization Registry (ROR) identifiers.
 * ROR IDs are automatically validated and normalized.
 *
 * ### Supported ROR Formats:
 * - **Bare format**: `05dxps055` (9-character alphanumeric with letters)
 * - **ROR prefix**: `ror:05dxps055` (ror: followed by 9-character ID)
 * - **ROR URL**: `https://ror.org/05dxps055` (full HTTPS URL)
 * - **ROR domain**: `ror.org/05dxps055` (domain without protocol)
 *
 * ### ROR Validation:
 * - Format validation: Exactly 9 characters, alphanumeric, must contain letters
 * - Character set validation: Uses ROR base32 (0-9, a-z excluding i, l, o, u)
 * - Case insensitive: Accepts both uppercase and lowercase input
 */

/** ROR ID length constant */
const ROR_ID_LENGTH = 9;

/** Pattern for potential bare ROR IDs (7-11 alphanumeric chars with letters) */
const POTENTIAL_ROR_PATTERN = /^[0-9a-z]{7,11}$/i;

/** Pattern for all-numeric strings that look like ROR length */
const NUMERIC_ROR_LENGTH_PATTERN = /^\d{8,10}$/;

/** Pattern for OpenAlex ID prefixes */
const OPENALEX_PREFIX_PATTERN = /^[ACFIKPQSTW]/i;

/** Valid ROR base32 character set (0-9, a-z excluding i, l, o, u) */
const VALID_ROR_CHARS_PATTERN = /^[0-9a-hjkmnp-tv-z]{9}$/;

/**
 * Validate ROR format
 * @param rorId - 9-character ROR identifier
 * @returns true if valid ROR format
 */
export const validateRorFormat = (rorId: string): boolean => {
  if (!rorId || typeof rorId !== "string") {
    return false;
  }

  const normalized = rorId.toLowerCase();

  // Basic format validation: exactly 9 characters, alphanumeric, must contain at least one letter
  if (!/^[0-9a-z]{9}$/i.test(normalized) || !/[a-z]/i.test(normalized)) {
    return false;
  }

  // Validate against ROR base32 character set (0-9, a-z excluding i, l, o, u)
  return VALID_ROR_CHARS_PATTERN.test(normalized);
};

/**
 * Try to extract ROR ID from URL pattern (https://ror.org/...)
 * @param trimmed - Trimmed input string
 * @returns Normalized ROR URL or null if not a URL pattern
 * @throws Error if ROR ID format is invalid
 */
export const tryExtractRorFromUrl = (trimmed: string): string | null => {
  const urlMatch = trimmed.match(/^https?:\/\/ror\.org\/([0-9a-z]*)/i);
  if (!urlMatch) return null;

  const rorId = urlMatch[1];
  validateRorIdLength(rorId, `Invalid ROR ID format in URL: ${trimmed}`);
  validateAndThrowIfInvalid(rorId);

  return `https://ror.org/${rorId.toLowerCase()}`;
};

/**
 * Try to extract ROR ID from domain pattern (ror.org/...)
 * @param trimmed - Trimmed input string
 * @returns Normalized ROR URL or null if not a domain pattern
 * @throws Error if ROR ID format is invalid
 */
export const tryExtractRorFromDomain = (trimmed: string): string | null => {
  const domainMatch = trimmed.match(/^ror\.org\/([0-9a-z]*)/i);
  if (!domainMatch) return null;

  const rorId = domainMatch[1];
  validateRorIdLength(
    rorId,
    `Invalid ROR ID format in domain: ${trimmed}`,
  );
  validateAndThrowIfInvalid(rorId);

  return `https://ror.org/${rorId.toLowerCase()}`;
};

/**
 * Try to extract ROR ID from prefix pattern (ror:...)
 * @param trimmed - Trimmed input string
 * @returns Normalized ROR URL or null if not a prefix pattern
 * @throws Error if ROR ID format is invalid
 */
export const tryExtractRorFromPrefix = (trimmed: string): string | null => {
  const prefixMatch = trimmed.match(/^ror:([0-9a-z]*)/i);
  if (!prefixMatch) return null;

  const rorId = prefixMatch[1];
  validateRorIdLength(
    rorId,
    `Invalid ROR ID format with ror: prefix: ${trimmed}`,
  );
  validateAndThrowIfInvalid(rorId);

  return `https://ror.org/${rorId.toLowerCase()}`;
};

/**
 * Try to extract bare ROR ID
 * @param trimmed - Trimmed input string
 * @returns Normalized ROR URL or null if not a bare ROR ID
 * @throws Error if identifier looks like a ROR ID but is invalid
 */
export const tryExtractBareRor = (trimmed: string): string | null => {
  // Check for patterns that look like they could be intended as ROR IDs
  if (!(POTENTIAL_ROR_PATTERN.test(trimmed) && /[a-z]/i.test(trimmed))) {
    // Special case: all numbers (no letters) but ROR-like length
    if (NUMERIC_ROR_LENGTH_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid ROR ID: ${trimmed} (ROR IDs must contain letters)`,
      );
    }
    return null;
  }

  // Don't treat OpenAlex IDs as ROR IDs (they start with specific prefixes)
  if (OPENALEX_PREFIX_PATTERN.test(trimmed)) {
    return null; // This is likely an OpenAlex ID, not a ROR ID
  }

  // Check if this looks like a ROR ID but has wrong length
  if (trimmed.length !== ROR_ID_LENGTH) {
    throw new Error(
      `Invalid ROR ID length: ${trimmed} (must be exactly 9 characters)`,
    );
  }

  // Exactly 9 chars - validate as ROR
  validateAndThrowIfInvalid(trimmed);
  return `https://ror.org/${trimmed.toLowerCase()}`;
};

/**
 * Validate ROR ID length and throw if invalid
 * @param rorId - ROR ID to validate
 * @param errorMessage - Error message to throw if invalid
 * @throws Error if ROR ID length is not 9 characters
 */
export const validateRorIdLength = (rorId: string, errorMessage: string): void => {
  if (rorId?.length !== ROR_ID_LENGTH) {
    throw new Error(errorMessage);
  }
};

/**
 * Validate ROR format and throw if invalid
 * @param rorId - ROR ID to validate
 * @throws Error if ROR ID format is invalid
 */
export const validateAndThrowIfInvalid = (rorId: string): void => {
  if (!validateRorFormat(rorId)) {
    throw new Error(`Invalid ROR ID format: ${rorId}`);
  }
};

/**
 * Detect and normalize ROR identifiers
 * @param id - Input identifier
 * @returns Normalized ROR URL or null if not a valid ROR ID
 * @throws Error if identifier looks like a ROR ID but is invalid
 */
export const detectAndNormalizeRor = (id: string): string | null => {
  if (!id || typeof id !== "string") {
    return null;
  }

  const trimmed = id.trim();

  // Try different ROR pattern types in order of specificity
  const rorUrl = tryExtractRorFromUrl(trimmed);
  if (rorUrl) return rorUrl;

  const rorDomain = tryExtractRorFromDomain(trimmed);
  if (rorDomain) return rorDomain;

  const rorPrefix = tryExtractRorFromPrefix(trimmed);
  if (rorPrefix) return rorPrefix;

  const bareRor = tryExtractBareRor(trimmed);
  if (bareRor !== undefined) return bareRor;

  return null;
};

/**
 * Validate and normalize ROR identifier if applicable
 * @param id - Input identifier (could be ROR, OpenAlex ID, etc.)
 * @returns Normalized identifier for OpenAlex API
 * @throws Error if ROR ID format is invalid or fails validation
 */
export const validateAndNormalizeRor = (id: string): string => {
  if (!id || typeof id !== "string") {
    throw new Error("Institution ID is required and must be a string");
  }

  const trimmedId = id.trim();
  if (!trimmedId) {
    throw new Error("Institution ID cannot be empty");
  }

  // Try to detect and normalize ROR ID
  const normalizedRor = detectAndNormalizeRor(trimmedId);
  if (normalizedRor) {
    return normalizedRor;
  }

  // Not a ROR ID (or invalid ROR ID), return as-is for other identifier types
  // This handles OpenAlex IDs, other external IDs, etc.
  return trimmedId;
};

/**
 * Check if an identifier is a valid ROR ID in any supported format
 * @param id - Identifier to check
 * @returns True if the identifier is a valid ROR ID, false otherwise
 */
export const isValidRorId = (id: string): boolean => {
  try {
    const normalized = detectAndNormalizeRor(id);
    return normalized !== null;
  } catch {
    return false;
  }
};
