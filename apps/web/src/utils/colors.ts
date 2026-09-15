/**
 * Color utility functions Provides hash-based color generation for consistent visual styling
 */

// Percentage values (saturation, lightness) are expressed 0-100 and divided down to 0-1
const PERCENTAGE_DIVISOR = 100;

// The HSL hue wheel is divided into six 60-degree sectors; these are the sector boundaries used by the standard HSL-to-RGB conversion algorithm.
const HUE_DEGREES_IN_CIRCLE = 360;
const HUE_SECTOR_DEGREES = 60;
const HUE_SECTOR_2_END = 120;
const HUE_SECTOR_3_END = 180;
const HUE_SECTOR_4_END = 240;
const HUE_SECTOR_5_END = 300;

// Maximum value of a single RGB channel, and the radix used to render it as hex
const RGB_CHANNEL_MAX = 255;
const HEX_RADIX = 16;

// Bit shift used by the string hash function below
const HASH_SHIFT_BITS = 5;

// Saturation and lightness are kept within a narrow, visually pleasant band rather than spanning the full 0-100 range.
const MIN_SATURATION_PERCENT = 60;
const SATURATION_RANGE_PERCENT = 20; // 60-80% saturation
const MIN_LIGHTNESS_PERCENT = 45;
const LIGHTNESS_RANGE_PERCENT = 15; // 45-60% lightness

/**
 * Convert HSL color to hex
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string
 */
const hslToHex = (h: number, s: number, l: number): string => {
  s /= PERCENTAGE_DIVISOR;
  l /= PERCENTAGE_DIVISOR;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / HUE_SECTOR_DEGREES) % 2 - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < HUE_SECTOR_DEGREES) {
    r = c;
    g = x;
  } else if (h >= HUE_SECTOR_DEGREES && h < HUE_SECTOR_2_END) {
    r = x;
    g = c;
  } else if (h >= HUE_SECTOR_2_END && h < HUE_SECTOR_3_END) {
    g = c;
    b = x;
  } else if (h >= HUE_SECTOR_3_END && h < HUE_SECTOR_4_END) {
    g = x;
    b = c;
  } else if (h >= HUE_SECTOR_4_END && h < HUE_SECTOR_5_END) {
    r = x;
    b = c;
  } else if (h >= HUE_SECTOR_5_END && h < HUE_DEGREES_IN_CIRCLE) {
    r = c;
    b = x;
  }

  const rHex = Math.round((r + m) * RGB_CHANNEL_MAX)
    .toString(HEX_RADIX)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * RGB_CHANNEL_MAX)
    .toString(HEX_RADIX)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * RGB_CHANNEL_MAX)
    .toString(HEX_RADIX)
    .padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

/**
 * Generate a consistent color from a string using hash function
 * @param input - String to hash
 * @returns Hex color string
 */
export const getHashColor = (input: string): string => {
  let hash = 0;

  for (const char of input) {
    hash = ((hash << HASH_SHIFT_BITS) - hash) + char.charCodeAt(0);
    hash &= hash; // Convert to 32bit integer
  }

  // Use hash to generate HSL color with good saturation and lightness
  const h = Math.abs(hash) % HUE_DEGREES_IN_CIRCLE;
  const s = MIN_SATURATION_PERCENT + (Math.abs(hash) % SATURATION_RANGE_PERCENT);
  const l = MIN_LIGHTNESS_PERCENT + (Math.abs(hash) % LIGHTNESS_RANGE_PERCENT);

  return hslToHex(h, s, l);
};

/**
 * Generate a color for tags (alias for getHashColor)
 * @param tag - Tag string
 * @returns Hex color string
 */
export const getTagColor = (tag: string): string => {
  return getHashColor(tag);
};
