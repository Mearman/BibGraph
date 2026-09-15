/**
 * Validation functions for catalogue import/export data
 *
 * These functions ensure data integrity when importing catalogue lists from external sources (files, URLs, shared data).
 *
 * Feature: 004-fix-failing-tests Created: 2025-11-11
 */

import type { ExportFormat } from '../types/catalogue';

// Upper bound on the number of entities a single export/import payload may contain
const MAX_EXPORT_ENTITIES = 10_000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// Describes an arbitrary unknown value for an error message without risking the default Object#toString() output ('[object Object]') that a bare String(value) could produce.
const describeUnknownValue = (value: unknown): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Validates export format data structure
 * @param data - Unknown data to validate
 * @throws Error if validation fails with descriptive message
 */
export function validateExportFormat(data: unknown): asserts data is ExportFormat {
  if (!isRecord(data)) {
    throw new Error('Invalid format: must be object');
  }

  if (data.version !== '1.0') {
    throw new Error(`Unsupported version: ${describeUnknownValue(data.version)}`);
  }

  if (!isRecord(data.listMetadata) || typeof data.listMetadata.title !== 'string' || data.listMetadata.title.trim() === '') {
    throw new Error('Invalid format: missing list title');
  }

  if (!Array.isArray(data.entities)) {
    throw new TypeError('Invalid format: entities must be array');
  }

  if (data.entities.length !== data.listMetadata.entityCount) {
    throw new Error('Invalid format: entity count mismatch');
  }

  if (data.entities.length > MAX_EXPORT_ENTITIES) {
    throw new Error(`Invalid format: too many entities (max ${String(MAX_EXPORT_ENTITIES)})`);
  }

  for (const [index, entity] of data.entities.entries()) {
    if (
      !isRecord(entity) ||
      typeof entity.entityId !== 'string' ||
      entity.entityId === '' ||
      typeof entity.type !== 'string' ||
      entity.type === '' ||
      typeof entity.position !== 'number'
    ) {
      throw new Error(`Invalid entity at position ${String(index)}`);
    }
    if (entity.position !== index) {
      throw new Error(`Invalid entity position at index ${String(index)}: expected ${String(index)}, got ${String(entity.position)}`);
    }
    if (!isRecord(entity.metadata) || typeof entity.metadata.displayName !== 'string' || entity.metadata.displayName === '') {
      throw new Error(`Invalid entity metadata at position ${String(index)}`);
    }
  }
}
