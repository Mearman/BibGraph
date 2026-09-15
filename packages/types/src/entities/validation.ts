/**
 * Validation functions for OpenAlex API data
 */

/**
 * Basic ID validation functions
 */
export const isOpenAlexId = (id: string): boolean => /^https:\/\/openalex\.org\/[A-Z]\d+$/.test(id);

export const isValidDateString = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date);

export const isValidDOI = (doi: string): boolean => doi.startsWith("10.") && doi.includes("/");

export const isValidORCID = (orcid: string): boolean => /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid);

export const isValidROR = (ror: string): boolean => ror.startsWith("https://ror.org/") || ror.startsWith("0");

export const isValidISSN = (issn: string): boolean => /^\d{4}-\d{3}[\dX]$/.test(issn);

export const isValidWikidataId = (id: string): boolean => id.startsWith("Q") && /^\d+$/.test(id.slice(1));
