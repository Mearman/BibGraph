/**
 * Utilities for converting OpenAlex URLs and IDs to internal app routes
 */

export interface ConvertedLink {
  isOpenAlexLink: boolean;
  internalPath: string;
  originalUrl: string;
}

/**
 * Detects if a string is an OpenAlex entity ID (e.g., A5017898742, W1234567890)
 * @param str
 */
export const isOpenAlexId = (str: string): boolean => /^[ACFIPSTVW]\d+$/.test(str);

/**
 * Gets the entity type from an OpenAlex ID
 * @param id
 */
export const getEntityTypeFromId = (id: string): string | null => {
  const prefix = id.charAt(0);
  const typeMap: Record<string, string> = {
    'A': 'authors',
    'W': 'works',
    'I': 'institutions',
    'S': 'sources',
    'V': 'sources', // Venues (deprecated, now sources)
    'F': 'funders',
    'C': 'concepts',
    'P': 'publishers',
    'T': 'topics',
  };
  return typeMap[prefix] || null;
};

/** All valid OpenAlex entity type paths */
const OPENALEX_ENTITY_PATHS = [
  'works', 'authors', 'sources', 'institutions', 'topics',
  'publishers', 'funders', 'concepts',
  'fields', 'domains', 'subfields', 'keywords'
] as const;

/**
 * Converts an OpenAlex URL or ID to an internal app path
 * Handles multiple URL formats:
 * - Direct ID: https://openalex.org/W1234567890
 * - Path + ID: https://openalex.org/works/W1234567890
 * - Path-based: https://openalex.org/fields/17, /keywords/machine-learning
 * - API URLs: https://api.openalex.org/works/W1234567890
 * @param url
 */
export const convertOpenAlexToInternalLink = (url: string): ConvertedLink => {
  const originalUrl = url;

  // Case 1: Direct entity ID URL (https://openalex.org/W1234567890)
  const directIdMatch = url.match(/https?:\/\/openalex\.org\/([ACFIPSTVW]\d+)$/i);
  if (directIdMatch) {
    const entityId = directIdMatch[1];
    const entityType = getEntityTypeFromId(entityId);
    if (entityType) {
      return {
        isOpenAlexLink: true,
        internalPath: `/${entityType}/${entityId}`,
        originalUrl,
      };
    }
  }

  // Case 2: Path-based entity URLs (https://openalex.org/{entityType}/{id})
  // Handles both ID-based (works/W123) and numeric/string IDs (fields/17, keywords/machine-learning)
  const entityPathPattern = new RegExp(
    String.raw`https?://(?:api\.)?openalex\.org/(${OPENALEX_ENTITY_PATHS.join('|')})/([^/?#]+)`,
    'i'
  );
  const pathMatch = url.match(entityPathPattern);
  if (pathMatch) {
    const entityType = pathMatch[1].toLowerCase();
    const entityId = pathMatch[2];
    return {
      isOpenAlexLink: true,
      internalPath: `/${entityType}/${entityId}`,
      originalUrl,
    };
  }

  // Case 3: OpenAlex API URL with query params (https://api.openalex.org/works?filter=...)
  const apiUrlMatch = url.match(/https?:\/\/api\.openalex\.org\/([^?]+)(\?.*)?/i);
  if (apiUrlMatch) {
    const path = apiUrlMatch[1];
    const queryString = apiUrlMatch[2] || '';
    return {
      isOpenAlexLink: true,
      internalPath: `/${path}${queryString}`,
      originalUrl,
    };
  }

  // Case 4: Just an OpenAlex ID (A5017898742)
  if (isOpenAlexId(url)) {
    const entityType = getEntityTypeFromId(url);
    if (entityType) {
      return {
        isOpenAlexLink: true,
        internalPath: `/${entityType}/${url}`,
        originalUrl,
      };
    }
  }

  // Not an OpenAlex link
  return {
    isOpenAlexLink: false,
    internalPath: url,
    originalUrl,
  };
};

/**
 * Extracts OpenAlex IDs from a string
 * @param str
 */
export const extractOpenAlexIds = (str: string): string[] => {
  const matches = str.match(/[ACFIPSTVW]\d+/g);
  return matches || [];
};

/**
 * Checks if a URL is an OpenAlex URL (entity or API)
 * @param url
 */
export const isOpenAlexUrl = (url: string): boolean => url.includes('openalex.org') || url.includes('api.openalex.org');
