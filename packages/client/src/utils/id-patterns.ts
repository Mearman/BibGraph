/**
 * ID Pattern Definitions for External Identifier Resolution
 *
 * Contains pattern definitions, regex matchers, and normalization functions
 * for all supported external identifier types (DOI, ORCID, ROR, ISSN, etc.).
 */

import { validateIssnChecksum, validateOrcidChecksum } from "./id-checksum";
import type { IdPattern, IdValidationConfig } from "./id-resolver-types";

/**
 * DOI pattern definition
 */
const doiPattern: IdPattern = {
  name: "DOI",
  type: "doi",
  patterns: [
    /^doi:(10\.\d+\/\S+)$/i,
    /^(10\.\d+\/\S+)$/,
    /^https?:\/\/doi\.org\/(10\.\d+\/\S+)$/i,
    /^https?:\/\/dx\.doi\.org\/(10\.\d+\/\S+)$/i,
  ],
  normalize: (match: string, config?: IdValidationConfig): string | null => {
    let doi = match.trim();

    // Remove doi: prefix
    if (doi.toLowerCase().startsWith("doi:")) {
      doi = doi.slice(4);
    }

    // Extract from URL
    const urlMatch = doi.match(/https?:\/\/(?:dx\.)?doi\.org\/(.+)$/i);
    if (urlMatch) {
      doi = urlMatch[1];
    }

    // Validate DOI format (10.xxxx/yyyy)
    if (!/^10\.\d+\/\S+$/.test(doi)) {
      return null;
    }

    // Return URL format if preferred, otherwise canonical format
    return config?.preferUrls ? `https://doi.org/${doi}` : doi;
  },
  examples: [
    "10.1038/nature12373",
    "doi:10.1038/nature12373",
    "https://doi.org/10.1038/nature12373",
  ],
  description: "Digital Object Identifier for academic works",
};

/**
 * ORCID pattern definition
 */
const orcidPattern: IdPattern = {
  name: "ORCID",
  type: "orcid",
  patterns: [
    /^(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
    /^https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])$/i,
    /orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i,
  ],
  normalize: (match: string): string | null => {
    const orcidMatch = match.match(/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i);
    if (!orcidMatch) return null;

    const orcid = orcidMatch[1].toUpperCase();

    // Validate ORCID format
    if (!/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(orcid)) {
      return null;
    }

    // Always return URL format for ORCID
    return `https://orcid.org/${orcid}`;
  },
  validate: (normalized: string): boolean => {
    const orcid = normalized.replace("https://orcid.org/", "");
    return validateOrcidChecksum(orcid);
  },
  examples: ["0000-0002-1825-0097", "https://orcid.org/0000-0002-1825-0097"],
  description: "ORCID identifier for researchers and contributors",
};

/**
 * OpenAlex pattern definition
 * Note: Check BEFORE ROR to avoid conflicts with I prefix
 */
const openalexPattern: IdPattern = {
  name: "OpenAlex",
  type: "openalex",
  patterns: [
    /^https?:\/\/openalex\.org\/([ACFIKPQSTW]\d+)$/i,
    /^([ACFIKPQSTW]\d+)$/i,
  ],
  normalize: (match: string, config?: IdValidationConfig): string | null => {
    let openalexId = match.trim();

    // Extract from URL
    const urlMatch = openalexId.match(/openalex\.org\/([ACFIKPQSTW]\d+)$/i);
    if (urlMatch) {
      openalexId = urlMatch[1];
    }

    // Validate OpenAlex format - flexible length but must have prefix + digits
    if (!/^[ACFIKPQSTW]\d+$/i.test(openalexId)) {
      return null;
    }

    // Minimum length validation (most are 8+ digits, topics can be 4+)
    const prefix = openalexId[0].toUpperCase();
    const digits = openalexId.slice(1);
    const MIN_TOPIC_DIGITS = 4;
    const MIN_OTHER_DIGITS = 6;

    if (
      (prefix === "T" && digits.length < MIN_TOPIC_DIGITS) ||
      (prefix !== "T" && digits.length < MIN_OTHER_DIGITS)
    ) {
      return null; // Topics need at least 4 digits, others need at least 6
    }

    openalexId = openalexId.toUpperCase();

    // Return URL format if preferred, otherwise bare ID
    return config?.preferUrls
      ? `https://openalex.org/${openalexId}`
      : openalexId;
  },
  examples: ["W2741809807", "https://openalex.org/W2741809807"],
  description:
    "OpenAlex identifier (W=works, A=authors, S=sources, I=institutions, etc.)",
};

/**
 * ROR pattern definition
 * Note: Check AFTER OpenAlex to avoid I prefix conflicts
 */
const rorPattern: IdPattern = {
  name: "ROR",
  type: "ror",
  patterns: [
    /^https?:\/\/ror\.org\/([0-9a-z]{9})$/i,
    /^ror\.org\/([0-9a-z]{9})$/i,
    // Only match bare ROR IDs that don't start with OpenAlex prefixes
    /^(?![ACFIKPQSTW])([0-9a-z]{9})$/i,
  ],
  normalize: (match: string): string | null => {
    let rorId = match.trim();

    // Extract ROR ID from URL
    const urlMatch = rorId.match(/ror\.org\/([0-9a-z]{9})$/i);
    if (urlMatch) {
      rorId = urlMatch[1];
    }

    // Validate ROR format (exactly 9 chars, alphanumeric, must contain letter)
    if (!/^[0-9a-z]{9}$/i.test(rorId) || !/[a-z]/i.test(rorId)) {
      return null;
    }

    // Additional check: ROR IDs shouldn't start with OpenAlex prefixes
    if (/^[ACFIKPQSTW]/i.test(rorId)) {
      return null;
    }

    // Always return URL format for ROR
    return `https://ror.org/${rorId.toLowerCase()}`;
  },
  examples: ["05dxps055", "https://ror.org/05dxps055"],
  description: "Research Organization Registry identifier",
};

/**
 * ISSN pattern definition
 */
const issnPattern: IdPattern = {
  name: "ISSN",
  type: "issn",
  patterns: [
    /^(\d{4}-\d{3}[0-9X])$/i,
    /^ISSN\s*(?::\s*)?(\d{4}-\d{3}[0-9X])$/i,
  ],
  normalize: (match: string): string | null => {
    const issnMatch = match.match(/(\d{4}-\d{3}[0-9X])/i);
    if (!issnMatch) return null;

    const issn = issnMatch[1].toUpperCase();

    // Validate ISSN format
    if (!/^\d{4}-\d{3}[0-9X]$/i.test(issn)) {
      return null;
    }

    return issn;
  },
  validate: (normalized: string): boolean => {
    return validateIssnChecksum(normalized);
  },
  examples: ["2049-3630", "ISSN: 2049-3630"],
  description: "International Standard Serial Number for periodicals",
};

/**
 * PMID pattern definition
 */
const pmidPattern: IdPattern = {
  name: "PMID",
  type: "pmid",
  patterns: [
    /^PMID\s*(?::\s*)?(\d+)$/i,
    /^(\d{7,8})$/, // PMIDs are typically 7-8 digits
    /^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\/?$/i,
  ],
  normalize: (match: string, config?: IdValidationConfig): string | null => {
    let pmid = match.trim();

    // Remove PMID: prefix
    if (pmid.toLowerCase().startsWith("pmid")) {
      const pmidMatch = pmid.match(/pmid\s*(?::\s*)?(\d+)$/i);
      if (pmidMatch) {
        pmid = pmidMatch[1];
      }
    }

    // Extract from PubMed URL
    const urlMatch = pmid.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
    if (urlMatch) {
      pmid = urlMatch[1];
    }

    // Validate PMID (must be numeric, typically 7-8 digits)
    if (!/^\d{1,8}$/.test(pmid)) {
      return null;
    }

    // Convert to number and back to ensure valid
    const pmidNum = Number.parseInt(pmid, 10);
    if (pmidNum <= 0) {
      return null;
    }

    // Return URL format if preferred, otherwise just the number
    return config?.preferUrls
      ? `https://pubmed.ncbi.nlm.nih.gov/${pmidNum}/`
      : pmidNum.toString();
  },
  examples: [
    "PMID: 12345678",
    "12345678",
    "https://pubmed.ncbi.nlm.nih.gov/12345678/",
  ],
  description: "PubMed identifier for biomedical literature",
};

/**
 * Wikidata pattern definition
 */
const wikidataPattern: IdPattern = {
  name: "Wikidata",
  type: "wikidata",
  patterns: [
    /^Q(\d+)$/,
    /^https?:\/\/www\.wikidata\.org\/wiki\/Q(\d+)$/i,
    /^https?:\/\/www\.wikidata\.org\/entity\/Q(\d+)$/i,
  ],
  normalize: (match: string, config?: IdValidationConfig): string | null => {
    let wikidataId = match.trim();

    // Extract Q number from URL
    const urlMatch = wikidataId.match(
      /wikidata\.org\/(?:entity|wiki)\/Q(\d+)$/i
    );
    if (urlMatch) {
      wikidataId = `Q${urlMatch[1]}`;
    }

    // Validate Wikidata format (Q followed by digits)
    if (!/^Q\d+$/.test(wikidataId)) {
      return null;
    }

    // Return URL format if preferred, otherwise Q notation
    return config?.preferUrls
      ? `https://www.wikidata.org/wiki/${wikidataId}`
      : wikidataId;
  },
  examples: ["Q42", "https://www.wikidata.org/wiki/Q42"],
  description: "Wikidata entity identifier",
};

/**
 * All ID patterns in order of priority
 *
 * Order matters: OpenAlex must be checked before ROR to avoid
 * I-prefix conflicts (OpenAlex institutions vs ROR IDs).
 */
export const idPatterns: IdPattern[] = [
  doiPattern,
  orcidPattern,
  openalexPattern, // Must be before ROR
  rorPattern,
  issnPattern,
  pmidPattern,
  wikidataPattern,
];
