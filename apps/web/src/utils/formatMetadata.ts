/**
 * Metadata formatting utilities for relationship items Converts raw metadata objects into human-readable strings
 */

import type { RelationshipMetadata } from '@/types/relationship';

// Base used to reduce a number to its last two digits before picking an ordinal suffix
const ORDINAL_MOD_BASE = 100;
// The 11th-13th values take "th" regardless of their last digit, so this offset shifts them out of range of the st/nd/rd lookup below
const ORDINAL_TEEN_OFFSET = 20;
const ORDINAL_SUFFIX_MOD = 10;

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
const getOrdinal = (n: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % ORDINAL_MOD_BASE;
  return `${String(n)}${suffixes[(v - ORDINAL_TEEN_OFFSET) % ORDINAL_SUFFIX_MOD] || suffixes[v] || suffixes[0]}`;
};

/**
 * Format a date range string
 */
const formatDateRange = (startDate?: string, endDate?: string): string => {
  const hasStart = startDate !== undefined && startDate !== '';
  const hasEnd = endDate !== undefined && endDate !== '';

  if (!hasStart && !hasEnd) {
    return '';
  }

  const formatDate = (date: string): string => {
    // Handle YYYY-MM-DD format by extracting year or formatting nicely
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date; // Return as-is if not parseable
    }
    return parsed.getFullYear().toString();
  };

  if (hasStart && hasEnd) {
    return `${formatDate(startDate)}\u{2013}${formatDate(endDate)}`;
  }

  if (hasStart) {
    return `${formatDate(startDate)}\u{2013}present`;
  }

  // endDate must exist if we reach here (since we checked both undefined/empty above)
  return `Until ${formatDate(endDate ?? '')}`;
};

/**
 * Format currency with proper locale formatting
 */
const formatCurrency = (amount: number, currency = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currency codes
    return `${amount.toLocaleString()} ${currency}`;
  }
};

/**
 * Exhaustive type check helper - ensures all discriminated union cases are handled
 */
const exhaustiveCheck = (value: never): string => {
  // If we reach here, we've missed a case in the switch statement
  console.warn('Unhandled metadata type:', value);
  return '';
};

/**
 * Format authorship metadata into human-readable text
 */
const formatAuthorshipMetadata = (metadata: {
  position?: number;
  isCorresponding?: boolean;
  affiliations?: string[];
}): string => {
  const parts: string[] = [];

  if (metadata.position !== undefined) {
    const ordinal = getOrdinal(metadata.position);
    parts.push(`${ordinal} author`);
  }

  if (metadata.isCorresponding === true) {
    parts.push('corresponding');
  }

  if (metadata.affiliations && metadata.affiliations.length > 0) {
    const affiliationText =
      metadata.affiliations.length === 1
        ? metadata.affiliations[0]
        : `${String(metadata.affiliations.length)} affiliations`;
    parts.push(affiliationText);
  }

  return parts.join(' \u{B7} ');
};

/**
 * Format citation metadata into human-readable text
 */
const formatCitationMetadata = (metadata: Readonly<{
  year?: number;
  context?: string;
}>): string => {
  const parts: string[] = [];

  if (metadata.year !== undefined) {
    parts.push(String(metadata.year));
  }

  if (metadata.context !== undefined && metadata.context !== '') {
    // Truncate context to reasonable length for display
    const MAX_CONTEXT_LENGTH = 100;
    const truncatedContext =
      metadata.context.length > MAX_CONTEXT_LENGTH
        ? `${metadata.context.slice(0, MAX_CONTEXT_LENGTH)}\u{2026}`
        : metadata.context;
    parts.push(`"${truncatedContext}"`);
  }

  return parts.join(' \u{B7} ');
};

/**
 * Format affiliation metadata into human-readable text
 */
const formatAffiliationMetadata = (metadata: Readonly<{
  startDate?: string;
  endDate?: string;
  isPrimary?: boolean;
}>): string => {
  const parts: string[] = [];

  if (metadata.isPrimary === true) {
    parts.push('Primary');
  }

  const hasStartDate = metadata.startDate !== undefined && metadata.startDate !== '';
  const hasEndDate = metadata.endDate !== undefined && metadata.endDate !== '';
  if (hasStartDate || hasEndDate) {
    const dateRange = formatDateRange(metadata.startDate, metadata.endDate);
    if (dateRange) {
      parts.push(dateRange);
    }
  }

  return parts.join(' \u{B7} ');
};

/**
 * Format funding metadata into human-readable text
 */
const formatFundingMetadata = (metadata: Readonly<{
  awardId?: string;
  amount?: number;
  currency?: string;
}>): string => {
  const parts: string[] = [];

  if (metadata.awardId !== undefined && metadata.awardId !== '') {
    parts.push(`Award: ${metadata.awardId}`);
  }

  if (metadata.amount !== undefined) {
    const formattedAmount = formatCurrency(metadata.amount, metadata.currency);
    parts.push(formattedAmount);
  }

  return parts.join(' \u{B7} ');
};

/**
 * Format lineage metadata into human-readable text
 */
const formatLineageMetadata = (metadata: Readonly<{ level?: number }>): string => {
  if (metadata.level === undefined) {
    return '';
  }

  switch (metadata.level) {
    case 1:
      return 'Direct parent';
    case 2:
      return 'Grandparent';
    default:
      return `Level ${String(metadata.level)}`;
  }
};

/**
 * Format relationship metadata into a human-readable string Uses discriminated union pattern to handle each metadata type appropriately
 */
export const formatMetadata = (metadata: RelationshipMetadata): string => {
  switch (metadata.type) {
    case 'authorship':
      return formatAuthorshipMetadata(metadata);
    case 'citation':
      return formatCitationMetadata(metadata);
    case 'affiliation':
      return formatAffiliationMetadata(metadata);
    case 'funding':
      return formatFundingMetadata(metadata);
    case 'lineage':
      return formatLineageMetadata(metadata);
    default:
      // Exhaustive check - TypeScript will error if we miss a case
      return exhaustiveCheck(metadata);
  }
};
