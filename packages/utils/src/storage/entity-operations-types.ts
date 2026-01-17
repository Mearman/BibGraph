/**
 * Entity Operations Interface
 *
 * Interface definitions for catalogue entity operations within lists.
 * @package
 */

import type { EntityType } from '@bibgraph/types';

import type { CatalogueEntity } from './catalogue-db/index.js';
import type {
  AddEntityParams,
  BatchAddResult,
} from './storage-provider-types.js';

/**
 * Entity Operations Interface
 *
 * Operations for managing entities within catalogue lists.
 */
export interface EntityOperationsInterface {
  /**
   * Add an entity to a catalogue list
   * @param params - Entity addition parameters
   * @returns Promise resolving to the new entity record ID (UUID)
   * @throws {Error} If list not found or entity already exists
   */
  addEntityToList(params: AddEntityParams): Promise<string>;

  /**
   * Get all entities in a list, sorted by position
   * @param listId - ID of the list
   * @returns Promise resolving to array of entities
   */
  getListEntities(listId: string): Promise<CatalogueEntity[]>;

  /**
   * Remove an entity from a list
   * @param listId - ID of the list containing the entity
   * @param entityRecordId - ID of the catalogue entity record
   */
  removeEntityFromList(listId: string, entityRecordId: string): Promise<void>;

  /**
   * Update notes for an entity
   * @param entityRecordId - ID of the catalogue entity record
   * @param notes - New notes content (max 5000 characters)
   */
  updateEntityNotes(entityRecordId: string, notes: string): Promise<void>;

  /**
   * Update entity data (entityType, entityId, and optionally notes)
   * Used primarily for migration scenarios where entity identification changes
   * @param entityRecordId - ID of the catalogue entity record
   * @param data - Object with entityType, entityId, and optional notes
   */
  updateEntityData(
    entityRecordId: string,
    data: { entityType: EntityType; entityId: string; notes?: string }
  ): Promise<void>;

  /**
   * Add multiple entities to a list in a batch operation
   * @param listId - ID of the list
   * @param entities - Array of entities to add
   * @returns Promise resolving to success/failed counts
   */
  addEntitiesToList(
    listId: string,
    entities: Array<{
      entityType: EntityType;
      entityId: string;
      notes?: string;
    }>
  ): Promise<BatchAddResult>;

  /**
   * Reorder entities in a list by updating their positions
   * @param listId - ID of the list containing the entities
   * @param orderedEntityIds - Array of entity record IDs in desired order
   */
  reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void>;
}
