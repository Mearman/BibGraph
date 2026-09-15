/**
 * Hash-based color generation for BibGraph Derives consistent colors from entity type and relationship type strings Using HSL color space with deterministic hue calculation
 */

// djb2 hash algorithm's canonical multiplier constant.
const DJB2_MULTIPLIER = 33

/**
 * Simple string hash function (djb2 algorithm) Produces consistent hash values across different platforms
 */
const stringHash = (str: string): number => {
  let hash = 5381;
  for (let index = 0; index < str.length; index++) {
    hash = (hash * DJB2_MULTIPLIER) ^ str.charCodeAt(index);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
};

// Degrees in a full hue circle, used to wrap a hash value onto the HSL hue range.
const HUE_DEGREES = 360

/**
 * Generate hue from string hash Returns a value between 0-360 for consistent color mapping
 */
const hashToHue = (str: string): number => {
  const hash = stringHash(str);

  // Convert hash to hue range (0-360) Use modulo to ensure we get good distribution across the color wheel
  const hue = hash % HUE_DEGREES;

  return hue;
};

// Percentage-to-fraction divisor for the saturation/lightness inputs of the HSL-to-hex conversion.
const PERCENT_DIVISOR = 100
// Canonical HSL-to-RGB conversion constants (CSS Color spec's `hsl()` algorithm).
const HUE_SEGMENT_DIVISOR = 30
const HSL_MODULO = 12
const HSL_K_OFFSET_LOW = 3
const HSL_K_OFFSET_HIGH = 9
const HSL_GREEN_CHANNEL_OFFSET = 8
const HSL_BLUE_CHANNEL_OFFSET = 4
const RGB_CHANNEL_MAX = 255
const HEX_RADIX = 16

/**
 * Convert HSL to hex color string
 */
const hslToHex = (h: number, s: number, l: number): string => {
  l /= PERCENT_DIVISOR;
  const a = s * Math.min(l, 1 - l) / PERCENT_DIVISOR;
  const f = (n: number) => {
    const k = (n + h / HUE_SEGMENT_DIVISOR) % HSL_MODULO;
    const color = l - a * Math.max(Math.min(k - HSL_K_OFFSET_LOW, HSL_K_OFFSET_HIGH - k, 1), -1);
    return Math.round(RGB_CHANNEL_MAX * color).toString(HEX_RADIX).padStart(2, '0');
  };
  return `#${f(0)}${f(HSL_GREEN_CHANNEL_OFFSET)}${f(HSL_BLUE_CHANNEL_OFFSET)}`;
};

/**
 * Generate consistent color for entity type Uses higher saturation and lightness for clear distinction
 */
export const getEntityTypeColor = (entityType: string): string => {
  // Use moderately high saturation for vibrant but professional colors
  const hue = hashToHue(entityType);
  const saturation = 65; // Professional but vibrant
  const lightness = 50;   // Good contrast for both light/dark themes

  return hslToHex(hue, saturation, lightness);
};

/**
 * Generate consistent color for relationship type Uses slightly different saturation/lightness to distinguish from entity types
 */
export const getRelationshipTypeColor = (relationshipType: string): string => {
  const hue = hashToHue(relationshipType);
  const saturation = 75; // More saturated for relationship types
  const lightness = 45;   // Slightly darker for better visibility

  return hslToHex(hue, saturation, lightness);
};

// Named HSL values for each special-state variant, so the switch below has no bare literals.
const MUTED_SATURATION = 20
const MUTED_LIGHTNESS = 60
const WARNING_HUE = 45
const WARNING_SATURATION = 80
const WARNING_LIGHTNESS = 55
const HIGHLIGHT_SATURATION = 85
const HIGHLIGHT_LIGHTNESS = 50
const DEFAULT_SATURATION = 50
const DEFAULT_LIGHTNESS = 50

/**
 * Generate muted colors for special states (xpac, warning, etc.)
 */
export const getSpecialStateColor = (baseString: string, stateType: 'muted' | 'warning' | 'highlight'): string => {
  const hue = hashToHue(baseString);

  switch (stateType) {
    case 'muted':
      return hslToHex(hue, MUTED_SATURATION, MUTED_LIGHTNESS);  // Low saturation, higher lightness
    case 'warning':
      return hslToHex(WARNING_HUE, WARNING_SATURATION, WARNING_LIGHTNESS);   // Orange-amber hue for warnings
    case 'highlight':
      return hslToHex(hue, HIGHLIGHT_SATURATION, HIGHLIGHT_LIGHTNESS);  // High saturation for emphasis
    default:
      return hslToHex(hue, DEFAULT_SATURATION, DEFAULT_LIGHTNESS);
  }
};

/**
 * Pre-computed entity type colors using hash-based generation These are cached for performance since entity types are fixed
 */
export const ENTITY_TYPE_COLORS = {
  works: getEntityTypeColor('works'),
  authors: getEntityTypeColor('authors'),
  sources: getEntityTypeColor('sources'),
  institutions: getEntityTypeColor('institutions'),
  topics: getEntityTypeColor('topics'),
  publishers: getEntityTypeColor('publishers'),
  funders: getEntityTypeColor('funders'),
  concepts: getEntityTypeColor('concepts'),
  keywords: getEntityTypeColor('keywords'),
  domains: getEntityTypeColor('domains'),
  fields: getEntityTypeColor('fields'),
  subfields: getEntityTypeColor('subfields'),
} as const;

/**
 * Pre-computed relationship type colors using hash-based generation
 */
export const RELATIONSHIP_TYPE_COLORS = {
  AUTHORSHIP: getRelationshipTypeColor('AUTHORSHIP'),
  REFERENCE: getRelationshipTypeColor('REFERENCE'),
  PUBLICATION: getRelationshipTypeColor('PUBLICATION'),
  TOPIC: getRelationshipTypeColor('TOPIC'),
  AFFILIATION: getRelationshipTypeColor('AFFILIATION'),
  HOST_ORGANIZATION: getRelationshipTypeColor('HOST_ORGANIZATION'),
  LINEAGE: getRelationshipTypeColor('LINEAGE'),
  FUNDED_BY: getRelationshipTypeColor('FUNDED_BY'),
  PUBLISHER_CHILD_OF: getRelationshipTypeColor('PUBLISHER_CHILD_OF'),
  WORK_HAS_KEYWORD: getRelationshipTypeColor('WORK_HAS_KEYWORD'),
  AUTHOR_RESEARCHES: getRelationshipTypeColor('AUTHOR_RESEARCHES'),
  INSTITUTION_LOCATED_IN: getRelationshipTypeColor('INSTITUTION_LOCATED_IN'),
  FUNDER_LOCATED_IN: getRelationshipTypeColor('FUNDER_LOCATED_IN'),
  TOPIC_PART_OF_FIELD: getRelationshipTypeColor('TOPIC_PART_OF_FIELD'),
  RELATED_TO: getRelationshipTypeColor('RELATED_TO'),
} as const;

/**
 * Special state colors derived from hash-based generation Maintains the same structure as the original COLORS object
 */
export const SPECIAL_STATE_COLORS = {
  // Standard work colors - use academic entity colors
  standard: {
    fill: getSpecialStateColor('works', 'highlight'),
    stroke: getSpecialStateColor('works', 'highlight'),
  },

  // Xpac work colors (muted, desaturated)
  xpac: {
    fill: getSpecialStateColor('xpac', 'muted'),
    stroke: getSpecialStateColor('xpac', 'muted'),
  },

  // Warning indicators for unverified authors
  warning: {
    fill: getSpecialStateColor('warning', 'warning'),
    stroke: getSpecialStateColor('warning', 'warning'),
    tint: getSpecialStateColor('warning', 'muted'), // Very light tint
  },
} as const;
