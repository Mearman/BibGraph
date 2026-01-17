/**
 * ORCID identifier normalization and validation utilities
 */

/** ORCID format patterns supporting various input formats */
const ORCID_PATTERNS = [
  // Bare format: 0000-0000-0000-0000
  /^(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
  // URL format: https://orcid.org/0000-0000-0000-0000
  /^https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
  // URL without protocol: orcid.org/0000-0000-0000-0000
  /orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i,
  // Prefixed format: orcid:0000-0000-0000-0000
  /^orcid:(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
] as const;

/** ORCID format validation pattern (4-4-4-3X structure) */
const ORCID_FORMAT_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i;

/**
 * Validate ORCID format (basic format check - 4-4-4-3X pattern)
 * @param orcid - ORCID identifier to validate
 * @returns True if format is valid, false otherwise
 */
export const validateOrcidFormat = (orcid: string): boolean => ORCID_FORMAT_PATTERN.test(orcid);

/**
 * Normalize ORCID identifier to the format expected by OpenAlex API
 * Supports all ORCID formats: bare, URL, and prefixed formats
 * @param id - Input identifier that might be an ORCID
 * @returns Normalized ORCID URL if input is valid ORCID, null otherwise
 */
export const normalizeOrcidId = (id: string): string | null => {
  if (!id || typeof id !== "string") {
    return null;
  }

  const trimmedId = id.trim();

  for (const pattern of ORCID_PATTERNS) {
    const match = trimmedId.match(pattern);
    if (match) {
      const orcidId = match[1].toUpperCase();
      if (validateOrcidFormat(orcidId)) {
        return `https://orcid.org/${orcidId}`;
      }
    }
  }

  return null;
};

/**
 * Check if an identifier is a valid ORCID in any supported format
 * @param id - Identifier to check
 * @returns True if the identifier is a valid ORCID, false otherwise
 */
export const isValidOrcid = (id: string): boolean => normalizeOrcidId(id) !== null;
