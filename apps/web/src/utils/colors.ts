/**
 * Color utility functions
 * Provides hash-based color generation for consistent visual styling
 */

/**
 * Convert HSL color to hex
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color string
 */
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
  } else if (h >= 120 && h < 180) {
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, '0');
  const bHex = Math.round((b + m) * 255)
    .toString(16)
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
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use hash to generate HSL color with good saturation and lightness
  const h = Math.abs(hash) % 360;
  const s = 60 + (Math.abs(hash) % 20); // 60-80% saturation
  const l = 45 + (Math.abs(hash) % 15); // 45-60% lightness

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
