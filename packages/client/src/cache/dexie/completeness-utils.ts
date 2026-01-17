/**
 * Completeness Status Utilities
 *
 * Provides utility functions for managing node completeness status
 * in the graph index tier.
 */

import type { CompletenessStatus } from '@bibgraph/types';

/**
 * Ordering of completeness statuses for upgrade comparisons
 */
const COMPLETENESS_ORDER: Record<CompletenessStatus, number> = {
  stub: 0,
  partial: 1,
  full: 2,
};

/**
 * Check if completeness should be upgraded from current to proposed status.
 * Only allows upgrades: stub → partial → full (never downgrades)
 *
 * @param current - The current completeness status
 * @param proposed - The proposed new completeness status
 * @returns true if proposed is higher than current
 */
export const shouldUpgradeCompleteness = (
  current: CompletenessStatus,
  proposed: CompletenessStatus
): boolean => {
  return COMPLETENESS_ORDER[proposed] > COMPLETENESS_ORDER[current];
};

/**
 * Get the default empty stats for graph index statistics
 */
export const getEmptyNodesByCompleteness = (): Record<CompletenessStatus, number> => ({
  full: 0,
  partial: 0,
  stub: 0,
});
