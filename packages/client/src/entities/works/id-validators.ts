/**
 * ID Validation Utilities for Works API
 * Provides validation and normalization for DOI and PMID identifiers
 */

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
  if (length < 1 || length > 10) {
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
  const prefixMatch = cleanId.match(/^(?:PMID|pmid):(\d+)$/);
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
  const registrantPart = parts[0].slice(3); // Remove "10."
  if (registrantPart.length < 4 || !/^\d+$/.test(registrantPart)) {
    return false;
  }

  return true;
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
  const doiUrlMatch = cleanId.match(/^https?:\/\/(?:www\.)?doi\.org\/(.+)$/i);
  if (doiUrlMatch) {
    const [, doiString] = doiUrlMatch;
    if (isValidDOIString(doiString)) {
      return `https://doi.org/${doiString}`;
    }
    return null;
  }

  // Check for crossref.org redirect: https://www.crossref.org/iPage?doi=10.xxxx/yyyy
  const crossrefMatch = cleanId.match(
    /^https?:\/\/(?:www\.)?crossref\.org\/iPage\?doi=(.+)$/i,
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
  const prefixMatch = cleanId.match(/^doi:(.+)$/i);
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
