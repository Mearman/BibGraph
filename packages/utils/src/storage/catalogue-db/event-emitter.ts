/**
 * Catalogue database event system Broadcasts list/entity mutations to interested subscribers
 */

import type { CatalogueList } from "./types.js";

export type CatalogueEventListener = (event: {
  type: 'list-added' | 'list-removed' | 'list-updated' | 'entity-added' | 'entity-removed' | 'entity-reordered';
  listId?: string;
  entityIds?: string[];
  list?: CatalogueList;
}) => void;

class CatalogueEventEmitter {
  private readonly listeners: CatalogueEventListener[] = [];

  subscribe(listener: CatalogueEventListener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(event: Parameters<CatalogueEventListener>[0]) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in catalogue event listener:', error);
      }
    }
  }
}

// Global event emitter for catalogue changes
export const catalogueEventEmitter = new CatalogueEventEmitter();
