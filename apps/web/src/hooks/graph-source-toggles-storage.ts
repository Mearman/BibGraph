/**
 * localStorage persistence for the set of enabled multi-source-graph source IDs
 */

import { logger } from '@bibgraph/utils';

const STORAGE_KEY = 'bibgraph:graph-source-toggles';
const LOG_PREFIX = 'multi-source-graph';

const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

/**
 * Load enabled source IDs from localStorage
 */
export const loadEnabledSources = (): Set<string> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null && stored !== '') {
      const parsed: unknown = JSON.parse(stored);
      if (isStringArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (error) {
    logger.debug(LOG_PREFIX, 'Failed to load source toggles from localStorage', { error });
  }
  // Default: only bookmarks enabled
  return new Set(['catalogue:bookmarks']);
};

/**
 * Save enabled source IDs to localStorage
 */
export const saveEnabledSources = (enabledIds: ReadonlySet<string>): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledIds]));
  } catch (error) {
    logger.debug(LOG_PREFIX, 'Failed to save source toggles to localStorage', { error });
  }
};
