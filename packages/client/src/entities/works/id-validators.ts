/**
 * ID Validation Utilities for Works API
 * Provides validation and normalization for DOI and PMID identifiers
 */

/**
Maximum digit length allowed for a PMID (most PMIDs are 8 digits; allowing for future growth)
 */
const MAX_PMID_LENGTH = 10;

/**
Length of the "10." DOI prefix that precedes the registrant code
 */
const DOI_PREFIX_LENGTH = 3;

/**
Minimum digit length required for a DOI registrant code
 */
const MIN_REGISTRANT_LENGTH = 4;

/**
 * Validate PMID numeric component
 * PMIDs are typically 1-8 digits, but can theoretically be longer
 * @param pmidNumber - Numeric string to validate
 * @returns True if valid PMID number
 */
const isValidPMIDNumber = (pmidNumber: string): boolean => {
  // Must be numeric
  if (!/^\d+$/.test(pmidNumber)) {
    return false;
  }

  // Reasonable length constraints (1-10 digits)
  // Most PMIDs are 8 digits, but allowing for future growth
  const { length } = pmidNumber;
  if (length < 1 || length > MAX_PMID_LENGTH) {
    return false;
  }

  // Must not be all zeros or start with zero (except single zero)
  if (
    pmidNumber === "0" ||
    (pmidNumber.length > 1 && pmidNumber.startsWith("0"))
  ) {
    return false;
  }

  return true;
};

/**
 * Validate and normalize PMID format
 * Supports: pmid:12345678, PMID:12345678, 12345678 (bare numeric)
 * @param id - Potential PMID string
 * @returns Normalized PMID or null if invalid
 */
export const validateAndNormalizePMID = (id: string): string | null => {
  // Remove whitespace
  const cleanId = id.trim();

  // Check for prefixed formats: pmid:12345678 or PMID:12345678
  const prefixMatch = /^(?:PMID|pmid):(\d+)$/.exec(cleanId);
  if (prefixMatch) {
    const [, pmidNumber] = prefixMatch;
    if (isValidPMIDNumber(pmidNumber)) {
      return `pmid:${pmidNumber}`;
    }
    return null;
  }

  // Check for bare numeric format: 12345678
  if (/^\d+$/.test(cleanId)) {
    if (isValidPMIDNumber(cleanId)) {
      return `pmid:${cleanId}`;
    }
    return null;
  }

  return null;
};

/**
 * Validate DOI string format
 * DOIs follow the pattern: 10.registrant/suffix
 * @param doiString - DOI string without protocol or domain
 * @returns True if valid DOI format
 */
const isValidDOIString = (doiString: string): boolean => {
  // DOI must start with "10." followed by registrant code and suffix
  // Pattern: 10.{registrant}/{suffix}
  // Registrant: 4+ digits, Suffix: any characters including special chars
  const doiPattern = /^10\.\d{4,}\/\S+$/;

  if (!doiPattern.test(doiString)) {
    return false;
  }

  // Additional validation: ensure it's not just the minimal pattern
  // DOI must have meaningful content after the slash
  const parts = doiString.split("/");
  if (parts.length < 2 || parts[1].length === 0) {
    return false;
  }

  // Registrant code validation (after "10.")
  const registrantPart = parts[0].slice(DOI_PREFIX_LENGTH); // Remove "10."
  return !(registrantPart.length < MIN_REGISTRANT_LENGTH) && /^\d+$/.test(registrantPart);
};

/**
 * Validate and normalize DOI format
 * Supports: https://doi.org/10.xxxx/yyyy, doi:10.xxxx/yyyy, 10.xxxx/yyyy (bare DOI)
 * Also handles crossref.org redirects: https://www.crossref.org/iPage?doi=10.xxxx/yyyy
 * @param id - Potential DOI string
 * @returns Normalized DOI or null if invalid
 */
export const validateAndNormalizeDOI = (id: string): string | null => {
  // Remove whitespace
  const cleanId = id.trim();

  // Check for full DOI URL: https://doi.org/10.xxxx/yyyy
  const doiUrlMatch = /^https?:\/\/(?:www\.)?doi\.org\/(.+)$/i.exec(cleanId);
  if (doiUrlMatch) {
    const [, doiString] = doiUrlMatch;
    if (isValidDOIString(doiString)) {
      return `https://doi.org/${doiString}`;
    }
    return null;
  }

  // Check for crossref.org redirect: https://www.crossref.org/iPage?doi=10.xxxx/yyyy
  const crossrefMatch = /^https?:\/\/(?:www\.)?crossref\.org\/iPage\?doi=(.+)$/i.exec(
    cleanId,
  );
  if (crossrefMatch) {
    const [, encodedDoi] = crossrefMatch;
    const doiString = decodeURIComponent(encodedDoi);
    if (isValidDOIString(doiString)) {
      return `https://doi.org/${doiString}`;
    }
    return null;
  }

  // Check for prefixed format: doi:10.xxxx/yyyy
  const prefixMatch = /^doi:(.+)$/i.exec(cleanId);
  if (prefixMatch) {
    const [, doiString] = prefixMatch;
    if (isValidDOIString(doiString)) {
      return `https://doi.org/${doiString}`;
    }
    return null;
  }

  // Check for bare DOI format: 10.xxxx/yyyy
  if (isValidDOIString(cleanId)) {
    return `https://doi.org/${cleanId}`;
  }

  return null;
};
