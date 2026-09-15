/**
 * Checksum validation utilities for external identifiers
 *
 * Provides checksum validation for ORCID and ISSN identifiers using their respective standard algorithms.
 */

/**
 * Divisor shared by the mod-11-2 (ORCID) and mod-11 (ISSN) checksum algorithms.
 */
const MOD_11_DIVISOR = 11;

/**
 * In the mod-11-2 algorithm (ORCID), the check digit is `(12 - remainder) mod 11`.
 */
const ORCID_CHECK_DIGIT_COMPLEMENT = 12;

/**
 * Both algorithms represent a computed check value of 10 with the letter 'X'.
 */
const CHECK_DIGIT_X_VALUE = 10;

/**
 * Validate ORCID checksum using mod-11-2 algorithm
 *
 * The ORCID checksum uses a modified modulo 11 algorithm where:
 * - Each digit is multiplied by its position weight
 * - The check digit is calculated to make the total divisible by 11
 * - X represents 10 as the check digit
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

  const remainder = total % MOD_11_DIVISOR;
  const result = (ORCID_CHECK_DIGIT_COMPLEMENT - remainder) % MOD_11_DIVISOR;
  const expectedCheckDigit = result === CHECK_DIGIT_X_VALUE ? "X" : result.toString();

  return checkDigit === expectedCheckDigit;
};

/**
 * Validate ISSN checksum using mod-11 algorithm
 *
 * The ISSN checksum uses a standard modulo 11 algorithm where:
 * - Each digit is multiplied by a weight from 8 to 2
 * - The check digit makes the weighted sum divisible by 11
 * - X represents 10 as the check digit
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
  const ISSN_START_WEIGHT = 8;
  let total = 0;
  for (let index = 0; index < baseDigits.length; index += 1) {
    const baseDigit = baseDigits.charAt(index);
    total += Number.parseInt(baseDigit, 10) * (ISSN_START_WEIGHT - index);
  }

  const remainder = total % MOD_11_DIVISOR;
  const result = remainder === 0 ? 0 : MOD_11_DIVISOR - remainder;
  const expectedCheckDigit =
    result === CHECK_DIGIT_X_VALUE ? "X" : result.toString();

  return checkDigit === expectedCheckDigit;
};
