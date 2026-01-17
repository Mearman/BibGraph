/**
 * Checksum validation utilities for external identifiers
 *
 * Provides checksum validation for ORCID and ISSN identifiers
 * using their respective standard algorithms.
 */

/**
 * Validate ORCID checksum using mod-11-2 algorithm
 *
 * The ORCID checksum uses a modified modulo 11 algorithm where:
 * - Each digit is multiplied by its position weight
 * - The check digit is calculated to make the total divisible by 11
 * - X represents 10 as the check digit
 *
 * @param orcid - ORCID in format XXXX-XXXX-XXXX-XXXX
 * @returns Whether the checksum is valid
 */
export const validateOrcidChecksum = (orcid: string): boolean => {
  // Remove hyphens for calculation
  const digits = orcid.replaceAll("-", "");

  // Extract check digit (last character)
  const checkDigit = digits.slice(-1);
  const baseDigits = digits.slice(0, -1);

  // Calculate checksum using mod-11-2 algorithm
  let total = 0;
  for (const digit of baseDigits) {
    total = (total + Number.parseInt(digit, 10)) * 2;
  }

  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const expectedCheckDigit = result === 10 ? "X" : result.toString();

  return checkDigit === expectedCheckDigit;
};

/**
 * Validate ISSN checksum using mod-11 algorithm
 *
 * The ISSN checksum uses a standard modulo 11 algorithm where:
 * - Each digit is multiplied by a weight from 8 to 2
 * - The check digit makes the weighted sum divisible by 11
 * - X represents 10 as the check digit
 *
 * @param issn - ISSN in format XXXX-XXXX
 * @returns Whether the checksum is valid
 */
export const validateIssnChecksum = (issn: string): boolean => {
  // Remove hyphen for calculation
  const digits = issn.replaceAll("-", "");

  // Extract check digit (last character)
  const checkDigit = digits.slice(-1);
  const baseDigits = digits.slice(0, -1);

  // Calculate checksum using mod-11 algorithm
  let total = 0;
  for (const [i, baseDigit] of [...baseDigits].entries()) {
    const ISSN_START_WEIGHT = 8;
    total += Number.parseInt(baseDigit, 10) * (ISSN_START_WEIGHT - i);
  }

  const MOD_11_DIVISOR = 11;
  const remainder = total % MOD_11_DIVISOR;
  const result = remainder === 0 ? 0 : MOD_11_DIVISOR - remainder;
  const CHECK_DIGIT_X_VALUE = 10;
  const expectedCheckDigit =
    result === CHECK_DIGIT_X_VALUE ? "X" : result.toString();

  return checkDigit === expectedCheckDigit;
};
