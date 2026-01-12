/**
 * React hook for catalogue management
 * Provides CRUD operations for lists and bibliographies
 */

import type { EntityType } from "@bibgraph/types";
import {
  type CatalogueEntity,
  catalogueEventEmitter,
  type CatalogueList,
  type CompressedListData,
  compressListData,
  createShareUrl,
  decompressListData,
  type ListType,
  validateListData,
} from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";
import type { ExportFormat } from "@/types/catalogue";
import { validateExportFormat } from "@/utils/catalogue-validation";


const CATALOGUE_LOGGER_CONTEXT = "catalogue-hook";

// T079: User-friendly error message mapping
const getUserFriendlyErrorMessage = (error: unknown): string => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Storage quota exceeded
  if (lowerMessage.includes("quota") || lowerMessage.includes("storage") || lowerMessage.includes("full")) {
    return "Storage quota exceeded. Please free up space by deleting unused lists or clearing browser data.";
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
    return "Network error occurred. Please check your internet connection and try again.";
  }

  // Not found errors
  if (lowerMessage.includes("not found") || lowerMessage.includes("does not exist")) {
    return "The requested item could not be found. It may have been deleted.";
  }

  // Validation errors
  if (lowerMessage.includes("invalid") || lowerMessage.includes("validation") || lowerMessage.includes("format")) {
    return "Invalid data format. Please check your input and try again.";
  }

  // Permission errors
  if (lowerMessage.includes("permission") || lowerMessage.includes("denied") || lowerMessage.includes("unauthorized")) {
    return "Permission denied. You don't have access to perform this action.";
  }

  // Database errors
  if (lowerMessage.includes("database") || lowerMessage.includes("indexeddb") || lowerMessage.includes("dexie")) {
    return "Database error occurred. Try refreshing the page or clearing your browser cache.";
  }

  // Duplicate errors
  if (lowerMessage.includes("duplicate") || lowerMessage.includes("already exists")) {
    return "This item already exists in the list.";
  }

  // Timeout errors
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "Operation timed out. Please try again.";
  }

  // Default fallback
  return `An error occurred: ${errorMessage}`;
};

export interface UseCatalogueOptions {
  /** Auto-refresh on list changes */
  autoRefresh?: boolean;
  /** Specific list ID to focus on */
  listId?: string;
}

export interface UseCatalogueReturn {
  // Lists
  lists: CatalogueList[];
  selectedList: CatalogueList | null;
  isLoadingLists: boolean;

  // Entities
  entities: CatalogueEntity[];
  isLoadingEntities: boolean;

  // CRUD Operations
  createList: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<string>;
  updateList: (listId: string, updates: Partial<Pick<CatalogueList,
    "title" | "description" | "tags" | "isPublic"
  >>) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  selectList: (listId: string | null) => void;

  // Entity Management
  addEntityToList: (params: {
    listId: string;
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }) => Promise<string>;
  addEntitiesToList: (listId: string, entities: Array<{
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }>) => Promise<{ success: number; failed: number }>;
  removeEntityFromList: (listId: string, entityRecordId: string) => Promise<void>;
  reorderEntities: (listId: string, entityIds: string[]) => Promise<void>;
  updateEntityNotes: (entityRecordId: string, notes: string) => Promise<void>;
  bulkRemoveEntities: (listId: string, entityIds: string[]) => Promise<void>;
  bulkMoveEntities: (sourceListId: string, targetListId: string, entityIds: string[]) => Promise<void>;
  mergeLists: (sourceListIds: string[], mergeStrategy: 'union' | 'intersection' | 'combine', newListName: string, deduplicate: boolean) => Promise<string>;

  // Search and Filter
  searchLists: (query: string) => Promise<CatalogueList[]>;
  searchEntities: (query: string) => CatalogueEntity[];
  filterByType: (types: EntityType[]) => CatalogueEntity[];

  // Sharing
  generateShareUrl: (listId: string) => Promise<string>;
  importFromShareUrl: (url: string) => Promise<string | null>;
  generateQRCode: (shareURL: string) => Promise<string>;
  copyToClipboard: (text: string) => Promise<void>;

  // Utilities
  refreshLists: () => Promise<void>;
  refreshEntities: (listId: string) => Promise<void>;
  getListStats: (listId: string) => Promise<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  }>;

  // URL Compression
  exportListAsCompressedData: (listId: string) => Promise<string | null>;
  importListFromCompressedData: (compressedData: string) => Promise<string | null>;

  // File Export
  exportList: (listId: string) => Promise<ExportFormat>;
  exportListCompressed: (listId: string) => Promise<string>;
  exportListAsFile: (listId: string, format: "json" | "compressed" | "csv" | "bibtex") => Promise<void>;
  exportListAsCSV: (listId: string) => Promise<void>;
  exportListAsBibTeX: (listId: string) => Promise<void>;

  // Import Methods
  importList: (data: ExportFormat) => Promise<string>;
  importListCompressed: (compressed: string) => Promise<string>;
  importListFromFile: (file: File) => Promise<string>;
  validateImportData: (data: unknown) => { valid: boolean; errors: string[]; warnings?: string[] };
  previewImport: (data: ExportFormat) => Promise<{
    listTitle: string;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    duplicates: number;
    estimatedSize: string;
  }>;
}

export const useCatalogue = (options: UseCatalogueOptions = {}): UseCatalogueReturn => {
  const { autoRefresh = true, listId: focusedListId } = options;

  // Get storage provider from context
  const storage = useStorageProvider();

  // State
  const [lists, setLists] = useState<CatalogueList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(focusedListId || null);
  const [entities, setEntities] = useState<CatalogueEntity[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // Get selected list object
  const selectedList = lists.find(list => list.id === selectedListId) || null;

  // Refresh lists
  const refreshLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const allLists = await storage.getAllLists();
      setLists(allLists);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to refresh catalogue lists", { error });
    } finally {
      setIsLoadingLists(false);
    }
  }, [storage]);

  // Refresh entities for a specific list
  const refreshEntities = useCallback(async (listId: string) => {
    if (!listId) return;

    logger.debug(CATALOGUE_LOGGER_CONTEXT, "refreshEntities called", { listId });
    setIsLoadingEntities(true);
    try {
      const listEntities = await storage.getListEntities(listId);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "getListEntities returned", { listId, count: listEntities.length, entities: listEntities });
      setEntities(listEntities);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to refresh list entities", { listId, error });
      setEntities([]);
    } finally {
      setIsLoadingEntities(false);
    }
  }, [storage]);

  // Load data on mount
  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  // Load entities when selected list changes
  useEffect(() => {
    logger.debug(CATALOGUE_LOGGER_CONTEXT, "selectedListId changed, refreshing entities", { selectedListId });
    if (selectedListId) {
      void refreshEntities(selectedListId);
    } else {
      setEntities([]);
    }
  }, [selectedListId, refreshEntities]);

  // Listen for catalogue events if auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Catalogue event detected", { event });

      // Refresh lists on any list-related event
      if (event.type.startsWith('list-')) {
        void refreshLists();
      }

      // Refresh entities for the affected list
      if (event.listId && selectedListId && event.listId === selectedListId) {
        void refreshEntities(selectedListId);
      }
    });

    return unsubscribe;
  }, [autoRefresh, refreshLists, refreshEntities, selectedListId]);

  // Create list
  const createList = useCallback(async (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<string> => {
    try {
      const listId = await storage.createList(params);

      // Auto-select the new list
      setSelectedListId(listId);

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to create catalogue list", { params, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Update list
  const updateList = useCallback(async (
    listId: string,
    updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>
  ): Promise<void> => {
    try {
      await storage.updateList(listId, updates);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update catalogue list", { listId, updates, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Delete list
  const deleteList = useCallback(async (listId: string): Promise<void> => {
    try {
      await storage.deleteList(listId);

      // Clear selection if deleted list was selected
      if (selectedListId === listId) {
        setSelectedListId(null);
      }
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to delete catalogue list", { listId, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [selectedListId, storage]);

  // Select list
  const selectList = useCallback((listId: string | null) => {
    setSelectedListId(listId);
  }, []);

  // Add entity to list
  const addEntityToList = useCallback(async (params: {
    listId: string;
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }): Promise<string> => {
    try {
      return await storage.addEntityToList(params);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add entity to catalogue list", { params, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Add multiple entities to list
  const addEntitiesToList = useCallback(async (
    listId: string,
    entities: Array<{
      entityType: EntityType;
      entityId: string;
      notes?: string;
    }>
  ): Promise<{ success: number; failed: number }> => {
    try {
      return await storage.addEntitiesToList(listId, entities);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add multiple entities to catalogue list", {
        listId,
        entitiesCount: entities.length,
        error
      });
      throw error;
    }
  }, []);

  // Remove entity from list
  const removeEntityFromList = useCallback(async (listId: string, entityRecordId: string): Promise<void> => {
    try {
      await storage.removeEntityFromList(listId, entityRecordId);
      // T085: Refresh entities after removal to update UI
      await refreshEntities(listId);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Entity removed and list refreshed", {
        listId,
        entityRecordId
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to remove entity from catalogue list", {
        listId,
        entityRecordId,
        error
      });
      throw error;
    }
  }, [storage, refreshEntities]);

  // Reorder entities in list
  const reorderEntities = useCallback(async (listId: string, orderedEntityIds: string[]): Promise<void> => {
    try {
      await storage.reorderEntities(listId, orderedEntityIds);
      // T085: Refresh entities after reordering to update UI
      await refreshEntities(listId);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Entities reordered and list refreshed", {
        listId,
        entityCount: orderedEntityIds.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to reorder catalogue list entities", {
        listId,
        orderedEntityIds,
        error
      });
      throw error;
    }
  }, [storage, refreshEntities]);

  // Update entity notes
  const updateEntityNotes = useCallback(async (entityRecordId: string, notes: string): Promise<void> => {
    try {
      await storage.updateEntityNotes(entityRecordId, notes);
      // Refresh entities to show updated notes
      if (selectedList && selectedList.id) {
        await refreshEntities(selectedList.id);
      }
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update entity notes", {
        entityRecordId,
        notesLength: notes.length,
        error
      });
      throw error;
    }
  }, [selectedList, refreshEntities]);

  // Bulk remove entities from list
  const bulkRemoveEntities = useCallback(async (listId: string, entityIds: string[]): Promise<void> => {
    if (!entityIds || entityIds.length === 0) return;

    try {
      // Remove entities one by one
      for (const entityId of entityIds) {
        await storage.removeEntityFromList(listId, entityId);
      }

      // T085: Refresh entities after bulk removal to update UI
      await refreshEntities(listId);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk remove completed and list refreshed", {
        listId,
        removedCount: entityIds.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk remove entities", {
        listId,
        entityCount: entityIds.length,
        error
      });
      throw error;
    }
  }, [storage, refreshEntities]);

  // Bulk move entities from one list to another
  const bulkMoveEntities = useCallback(async (
    sourceListId: string,
    targetListId: string,
    entityIds: string[]
  ): Promise<void> => {
    if (!entityIds || entityIds.length === 0) return;
    if (sourceListId === targetListId) {
      throw new Error("Source and target lists cannot be the same");
    }

    try {
      // Get the entities from source list
      const sourceEntities = await storage.getListEntities(sourceListId);
      const entitiesToMove = sourceEntities.filter(e => e.id && entityIds.includes(e.id));

      // Move entities one by one
      for (const entity of entitiesToMove) {
        // Add to target list
        await storage.addEntityToList({
          listId: targetListId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        });

        // Remove from source list
        if (entity.id) {
          await storage.removeEntityFromList(sourceListId, entity.id);
        }
      }

      // T085: Refresh source list after bulk move to update UI
      await refreshEntities(sourceListId);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk move completed and source list refreshed", {
        sourceListId,
        targetListId,
        movedCount: entitiesToMove.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk move entities", {
        sourceListId,
        targetListId,
        entityCount: entityIds.length,
        error
      });
      throw error;
    }
  }, [storage, refreshEntities]);

  // Merge lists
  const mergeLists = useCallback(async (
    sourceListIds: string[],
    mergeStrategy: 'union' | 'intersection' | 'combine',
    newListName: string,
    deduplicate: boolean
  ): Promise<string> => {
    try {
      // Fetch entities from all source lists
      const allEntities: Array<{
        listId: string;
        entity: CatalogueEntity;
      }> = [];

      for (const listId of sourceListIds) {
        const entities = await storage.getListEntities(listId);
        for (const entity of entities) {
          allEntities.push({ listId, entity });
        }
      }

      // Apply merge strategy
      let entitiesToMerge: Array<typeof allEntities[0]>;
      const entityKey = (e: CatalogueEntity) => `${e.entityType}:${e.entityId}`;

      if (mergeStrategy === 'intersection') {
        // Only entities that appear in ALL source lists
        const entityCounts = new Map<string, number>();
        for (const { entity } of allEntities) {
          const key = entityKey(entity);
          entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
        }
        const requiredCount = sourceListIds.length;
        entitiesToMerge = allEntities.filter(({ entity }) =>
          (entityCounts.get(entityKey(entity)) || 0) >= requiredCount
        );
      } else if (mergeStrategy === 'union') {
        // All unique entities
        const seen = new Set<string>();
        entitiesToMerge = [];
        for (const item of allEntities) {
          const key = entityKey(item.entity);
          if (!seen.has(key)) {
            seen.add(key);
            entitiesToMerge.push(item);
          }
        }
      } else {
        // Combine: keep all entities including duplicates
        entitiesToMerge = allEntities;
      }

      // Additional deduplication if requested (and not intersection)
      if (deduplicate && mergeStrategy !== 'intersection') {
        const seen = new Set<string>();
        entitiesToMerge = entitiesToMerge.filter(({ entity }) => {
          const key = entityKey(entity);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      // Create new list
      const newListId = await storage.createList({
        title: newListName,
        type: 'list',
        tags: ['merged'],
      });

      // Add entities to new list
      for (const { entity } of entitiesToMerge) {
        await storage.addEntityToList({
          listId: newListId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        });
      }

      // Refresh lists to show the new merged list
      await refreshLists();

      // Select the new list
      selectList(newListId);

      logger.info(CATALOGUE_LOGGER_CONTEXT, "Lists merged successfully", {
        sourceListIds,
        mergeStrategy,
        newListId,
        newListName,
        deduplicate,
        entityCount: entitiesToMerge.length,
      });

      return newListId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to merge lists", {
        sourceListIds,
        mergeStrategy,
        newListName,
        error,
      });
      throw error;
    }
  }, [storage, refreshLists, selectList]);

  // Search lists
  const searchLists = useCallback(async (query: string): Promise<CatalogueList[]> => {
    try {
      return await storage.searchLists(query);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to search catalogue lists", { query, error });
      return [];
    }
  }, []);

  // Search entities by entityId or notes (case-insensitive)
  const searchEntities = useCallback((query: string): CatalogueEntity[] => {
    if (!query.trim()) {
      return entities;
    }

    const lowercaseQuery = query.toLowerCase();
    return entities.filter((entity) => {
      const entityId = entity.entityId?.toLowerCase() || '';
      const notes = entity.notes?.toLowerCase() || '';
      return entityId.includes(lowercaseQuery) || notes.includes(lowercaseQuery);
    });
  }, [entities]);

  // Filter entities by type
  const filterByType = useCallback((types: EntityType[]): CatalogueEntity[] => {
    if (!types || types.length === 0) {
      return entities;
    }

    return entities.filter((entity) => types.includes(entity.entityType));
  }, [entities]);

  // Generate share URL
  const generateShareUrl = useCallback(async (listId: string): Promise<string> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Convert to compressed data format
      const listData: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      // Generate share token
      const shareToken = await storage.generateShareToken(listId);

      // Create share URL with compressed data
      const baseUrl = `${window.location.origin}${window.location.pathname}#/catalogue/shared/${shareToken}`;
      return createShareUrl(baseUrl, listData, logger);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to generate share URL", { listId, error });
      throw error;
    }
  }, []);

  // Import from share URL (T062, T065, T067)
  const importFromShareUrl = useCallback(async (url: string): Promise<string | null> => {
    try {
      // T065: URL validation - Check if input is full URL or just data string
      let compressedData: string;

      if (url.includes('://') || url.includes('?')) {
        // Full URL format - extract data parameter
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://dummy.com${url.startsWith('/') ? '' : '/'}${url}`);
          const dataParam = urlObj.searchParams.get('data');

          if (!dataParam) {
            throw new Error("Invalid share URL: missing 'data' parameter");
          }

          compressedData = dataParam;
        } catch (urlError) {
          throw new Error("Invalid share URL format: " + (urlError instanceof Error ? urlError.message : 'malformed URL'));
        }
      } else {
        // Just the data string (Base64URL)
        compressedData = url.trim();
      }

      // T065: Validate Base64URL format (basic check)
      if (!compressedData || !/^[\w-]+$/.test(compressedData)) {
        throw new Error("Invalid share URL: data must be Base64URL encoded");
      }

      // T065: Try to decompress and validate
      const listData = decompressListData(compressedData);

      if (!listData || !validateListData(listData)) {
        throw new Error("Invalid or corrupted list data in URL");
      }

      // T067: Create new list from shared data, preserving isBibliography flag
      const listId = await storage.createList({
        title: `${listData.list.title} (Imported)`,
        description: listData.list.description ? `${listData.list.description} (Imported from shared list)` : "Imported from shared list",
        type: listData.list.type, // T067: Preserves 'bibliography' type
        tags: [...(listData.list.tags || []), "imported"],
        isPublic: false, // Don't make imported lists public by default
      });

      // Add entities to the new list
      if (listData.entities.length > 0) {
        await storage.addEntitiesToList(listId, listData.entities);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List imported from share URL successfully", {
        listId,
        entityCount: listData.entities.length,
        isBibliography: listData.list.type === 'bibliography',
      });

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from share URL", { url, error });
      // T079: Re-throw with user-friendly message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Generate QR code from share URL
  const generateQRCode = useCallback(async (shareURL: string): Promise<string> => {
    try {
      const dataURL = await QRCode.toDataURL(shareURL, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "QR code generated successfully", {
        urlLength: shareURL.length,
      });

      return dataURL;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to generate QR code", { shareURL, error });
      throw error;
    }
  }, []);

  // Copy text to clipboard
  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      // Use modern Clipboard API
      await navigator.clipboard.writeText(text);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Text copied to clipboard using Clipboard API", {
        textLength: text.length,
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to copy to clipboard", { error });
      throw error;
    }
  }, []);

  // Get list statistics
  const getListStats = useCallback(async (listId: string): Promise<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  }> => {
    try {
      return await storage.getListStats(listId);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to get list stats", { listId, error });
      return {
        totalEntities: 0,
        entityCounts: {
          works: 0,
          authors: 0,
          sources: 0,
          institutions: 0,
          topics: 0,
          publishers: 0,
          funders: 0,
          concepts: 0,
          keywords: 0,
          domains: 0,
          fields: 0,
          subfields: 0,
        },
      };
    }
  }, []);

  // Export list as compressed data
  const exportListAsCompressedData = useCallback(async (listId: string): Promise<string | null> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      const listData: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      return compressListData(listData);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as compressed data", { listId, error });
      return null;
    }
  }, []);

  // Import list from compressed data
  const importListFromCompressedData = useCallback(async (compressedData: string): Promise<string | null> => {
    try {
      const listData = decompressListData(compressedData);

      if (!listData || !validateListData(listData)) {
        throw new Error("Invalid or corrupted list data");
      }

      // Create new list from compressed data
      const listId = await storage.createList({
        title: `${listData.list.title} (Imported)`,
        description: listData.list.description ? `${listData.list.description} (Imported)` : "Imported from compressed data",
        type: listData.list.type,
        tags: [...(listData.list.tags || []), "imported"],
        isPublic: false,
      });

      // Add entities to the new list
      if (listData.entities.length > 0) {
        await storage.addEntitiesToList(listId, listData.entities);
      }

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from compressed data", { error });
      return null;
    }
  }, []);

  // Export list to ExportFormat
  const exportList = useCallback(async (listId: string): Promise<ExportFormat> => {
    try {
      // Get list metadata
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      // Get all entities for the list
      const listEntities = await storage.getListEntities(listId);

      // Convert to ExportFormat
      const exportData: ExportFormat = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        listMetadata: {
          title: list.title,
          description: list.description,
          created: list.createdAt instanceof Date ? list.createdAt.toISOString() : list.createdAt,
          entityCount: listEntities.length,
          isBibliography: list.type === "bibliography",
        },
        entities: listEntities.map(entity => ({
          entityId: entity.entityId,
          type: entity.entityType,
          position: entity.position,
          note: entity.notes,
          addedAt: entity.addedAt instanceof Date ? entity.addedAt.toISOString() : entity.addedAt,
          // Minimal metadata since CatalogueEntity doesn't store full metadata
          metadata: {
            type: entity.entityType,
            displayName: entity.entityId,
            worksCount: 0,
            citedByCount: 0,
          },
        })),
      };

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List exported successfully", {
        listId,
        entityCount: listEntities.length,
      });

      return exportData;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list", { listId, error });
      throw error;
    }
  }, [storage]);

  // Export list as compressed Base64URL string
  const exportListCompressed = useCallback(async (listId: string): Promise<string> => {
    try {
      // Get the export data
      const exportData = await exportList(listId);

      // Serialize to JSON
      const jsonString = JSON.stringify(exportData);

      // Compress using pako (via imported compressListData if available, or inline)
      // Note: We'll use the existing compressListData function, but need to convert format
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Create CompressedListData format for compression
      const compressedFormat: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      // Use existing compression utility
      const compressed = compressListData(compressedFormat);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List compressed successfully", {
        listId,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / jsonString.length * 100).toFixed(1) + "%",
      });

      return compressed;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to compress list", { listId, error });
      throw error;
    }
  }, [exportList, storage]);

  // Helper function to escape CSV values
  const escapeCSVValue = useCallback((value: string): string => {
    // Wrap in quotes if it contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }, []);

  // Export list as CSV
  const exportListAsCSV = useCallback(async (listId: string): Promise<void> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Create CSV header
      const headers = ["Entity ID", "Entity Type", "Notes", "Position", "Added At"];
      let csv = headers.map(escapeCSVValue).join(",") + "\n";

      // Add data rows
      for (const entity of listEntities) {
        const row = [
          entity.entityId,
          entity.entityType,
          entity.notes || "",
          entity.position?.toString() || "",
          entity.addedAt instanceof Date ? entity.addedAt.toISOString() : entity.addedAt || "",
        ];
        csv += row.map(escapeCSVValue).join(",") + "\n";
      }

      // Create filename
      const date = new Date().toISOString().split('T')[0];
      const sanitizedTitle = list.title
        .replaceAll(/[^0-9a-z]/gi, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-/g, '')
        .replaceAll(/-$/g, '')
        .toLowerCase();
      const filename = `catalogue-${sanitizedTitle}-${date}.csv`;

      // Create blob and trigger download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.append(link);
      link.click();

      link.remove();
      URL.revokeObjectURL(url);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "CSV export completed", {
        listId,
        entityCount: listEntities.length,
        filename,
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as CSV", { listId, error });
      throw error;
    }
  }, [storage, escapeCSVValue]);

  // Helper function to convert entity to BibTeX format
  const convertToBibTeX = useCallback((entity: CatalogueEntity): string | null => {
    // Only works can be exported to BibTeX
    if (entity.entityType !== "works") {
      return null;
    }

    const citationKey = entity.entityId.replace(/^W/, ''); // Remove W prefix for key
    const bibTeXType = "misc"; // Default to misc since we have limited data

    // Basic BibTeX entry with the data we have
    let bibtex = `@${bibTeXType}{${citationKey},\n`;
    bibtex += `  openalex = {${entity.entityId}},\n`;

    if (entity.notes) {
      bibtex += `  note = {${entity.notes.replaceAll('"', "{").replaceAll('}', "}")}},\n`;
    }

    bibtex += `}`;

    return bibtex;
  }, []);

  // Export list as BibTeX (works only)
  const exportListAsBibTeX = useCallback(async (listId: string): Promise<void> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Filter only works
      const works = listEntities.filter(e => e.entityType === "works");

      if (works.length === 0) {
        throw new Error("No works found in this list. BibTeX export is only available for works.");
      }

      let bibtex = "";
      const skippedEntities: { entityId: string; type: string }[] = [];

      for (const entity of listEntities) {
        const entry = convertToBibTeX(entity);
        if (entry) {
          bibtex += entry + "\n\n";
        } else {
          skippedEntities.push({ entityId: entity.entityId, type: entity.entityType });
        }
      }

      // Create filename
      const date = new Date().toISOString().split('T')[0];
      const sanitizedTitle = list.title
        .replaceAll(/[^0-9a-z]/gi, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-/g, '')
        .replaceAll(/-$/g, '')
        .toLowerCase();
      const filename = `bibliography-${sanitizedTitle}-${date}.bib`;

      // Create blob and trigger download
      const blob = new Blob([bibtex], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      document.body.append(link);
      link.click();

      link.remove();
      URL.revokeObjectURL(url);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "BibTeX export completed", {
        listId,
        worksExported: works.length,
        skippedCount: skippedEntities.length,
        skippedTypes: skippedEntities.map(s => s.type),
        filename,
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as BibTeX", { listId, error });
      throw error;
    }
  }, [storage, convertToBibTeX]);

  // Export list as downloadable file
  const exportListAsFile = useCallback(async (listId: string, format: "json" | "compressed" | "csv" | "bibtex"): Promise<void> => {
    try {
      if (format === "csv") {
        await exportListAsCSV(listId);
        return;
      }
      if (format === "bibtex") {
        await exportListAsBibTeX(listId);
        return;
      }

      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      let data: string;
      let mimeType: string;
      let extension: string;

      if (format === "json") {
        // Export as JSON
        const exportData = await exportList(listId);
        data = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        // Export as compressed
        data = await exportListCompressed(listId);
        mimeType = "text/plain";
        extension = "txt";
      }

      // Create filename: catalogue-{listTitle}-{date}.{format}
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedTitle = list.title
        .replaceAll(/[^0-9a-z]/gi, '-')
        .replaceAll(/-+/g, '-')
        .replaceAll(/^-/g, '')
        .replaceAll(/-$/g, '')
        .toLowerCase();
      const filename = `catalogue-${sanitizedTitle}-${date}.${extension}`;

      // Create blob and trigger download
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Create temporary anchor element for download (standard approach)
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Trigger download
      document.body.append(link);
      link.click();

      // Cleanup
      link.remove();
      URL.revokeObjectURL(url);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List file download triggered", {
        listId,
        format,
        filename,
        dataSize: data.length,
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as file", { listId, format, error });
      throw error;
    }
  }, [storage, exportList, exportListCompressed, exportListAsCSV, exportListAsBibTeX]);

  // Import list from ExportFormat data
  const importList = useCallback(async (data: ExportFormat): Promise<string> => {
    try {
      // Validate the data first
      validateExportFormat(data);

      // Helper function to convert singular entity type to plural
      const toPluralType = (type: string): EntityType => {
        const mapping: Record<string, EntityType> = {
          "work": "works",
          "author": "authors",
          "source": "sources",
          "institution": "institutions",
          "topic": "topics",
          "publisher": "publishers",
          "funder": "funders",
        };
        return mapping[type] || (type + "s") as EntityType;
      };

      // Create new list from imported data
      const listId = await storage.createList({
        title: `${data.listMetadata.title} (Imported)`,
        description: data.listMetadata.description
          ? `${data.listMetadata.description} (Imported)`
          : "Imported from file",
        type: data.listMetadata.isBibliography ? "bibliography" : "list",
        tags: ["imported"],
        isPublic: false, // Don't make imported lists public by default
      });

      // Add all entities to the list (preserve positions and notes)
      if (data.entities.length > 0) {
        const entitiesToAdd = data.entities.map(entity => ({
          entityType: toPluralType(entity.type),
          entityId: entity.entityId,
          notes: entity.note,
        }));

        await storage.addEntitiesToList(listId, entitiesToAdd);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List imported successfully", {
        listId,
        entityCount: data.entities.length,
        title: data.listMetadata.title,
      });

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import list", { error });
      throw error;
    }
  }, [storage]);

  // Import list from compressed Base64URL string
  const importListCompressed = useCallback(async (compressed: string): Promise<string> => {
    try {
      // Decompress the data
      const listData = decompressListData(compressed);

      if (!listData) {
        throw new Error("Failed to decompress data or data is corrupted");
      }

      // Convert CompressedListData to ExportFormat
      const exportData: ExportFormat = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        listMetadata: {
          title: listData.list.title,
          description: listData.list.description,
          created: new Date().toISOString(),
          entityCount: listData.entities.length,
          isBibliography: listData.list.type === "bibliography",
        },
        entities: listData.entities.map((entity, index) => {
          return {
            entityId: entity.entityId,
            type: entity.entityType,
            position: index,
            note: entity.notes,
            addedAt: new Date().toISOString(),
            metadata: {
              type: entity.entityType,
              displayName: entity.entityId,
              worksCount: 0,
              citedByCount: 0,
            },
          };
        }),
      };

      // Use importList to handle the actual import
      return await importList(exportData);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import compressed list", { error });
      throw error;
    }
  }, [importList]);

  // Import list from File object
  const importListFromFile = useCallback(async (file: File): Promise<string> => {
    try {
      // Read file as text
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new Error("File is empty");
      }

      // Try to detect format (JSON or compressed)
      let data: ExportFormat;

      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(text);

        // If it has the ExportFormat structure, use it directly
        if (parsed.version && parsed.listMetadata && parsed.entities) {
          data = parsed as ExportFormat;
        } else {
          throw new Error("Not an ExportFormat JSON");
        }
      } catch {
        // If JSON parsing fails, treat as compressed data
        try {
          return await importListCompressed(text.trim());
        } catch {
          throw new Error("File contains invalid data: not valid JSON or compressed format");
        }
      }

      // Use importList to handle the actual import
      return await importList(data);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import list from file", {
        fileName: file.name,
        fileSize: file.size,
        error
      });
      throw error;
    }
  }, [importList, importListCompressed]);

  // Validate import data
  const validateImportData = useCallback((data: unknown): {
    valid: boolean;
    errors: string[];
    warnings?: string[]
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      validateExportFormat(data);

      // Add warnings for potential issues
      const exportData = data as ExportFormat;

      if (exportData.entities.length > 1000) {
        warnings.push(`Large import: ${exportData.entities.length} entities (may take a moment)`);
      }

      if (exportData.version !== "1.0") {
        warnings.push(`Import uses version ${exportData.version} (current version is 1.0)`);
      }

      return { valid: true, errors: [], warnings: warnings.length > 0 ? warnings : undefined };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push("Unknown validation error");
      }
      return { valid: false, errors, warnings: warnings.length > 0 ? warnings : undefined };
    }
  }, []);

  // Preview import before actually importing
  const previewImport = useCallback(async (data: ExportFormat): Promise<{
    listTitle: string;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    duplicates: number;
    estimatedSize: string;
  }> => {
    try {
      // Extract metadata
      const listTitle = data.listMetadata.title;
      const entityCount = data.entities.length;

      // Group entities by type and count
      const entityTypes: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        publishers: 0,
        funders: 0,
        concepts: 0,
        keywords: 0,
        domains: 0,
        fields: 0,
        subfields: 0,
      };

      data.entities.forEach(entity => {
        const type = entity.type;
        // Convert singular to plural for counting
        const pluralType = (type + "s") as EntityType;
        if (pluralType in entityTypes) {
          entityTypes[pluralType]++;
        }
      });

      // Check for duplicates (entities already in user's catalogue)
      let duplicates = 0;
      const allLists = await storage.getAllLists();

      for (const list of allLists) {
        if (!list.id) continue;
        const listEntities = await storage.getListEntities(list.id);
        const existingEntityIds = new Set(listEntities.map(e => e.entityId));

        for (const entity of data.entities) {
          if (existingEntityIds.has(entity.entityId)) {
            duplicates++;
          }
        }
      }

      // Estimate size (compressed size if applicable)
      const jsonString = JSON.stringify(data);
      const estimatedSize = jsonString.length < 1024
        ? `${jsonString.length} bytes`
        : (jsonString.length < 1024 * 1024
        ? `${(jsonString.length / 1024).toFixed(1)} KB`
        : `${(jsonString.length / (1024 * 1024)).toFixed(1)} MB`);

      return {
        listTitle,
        entityCount,
        entityTypes,
        duplicates,
        estimatedSize,
      };
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to preview import", { error });
      throw error;
    }
  }, [storage]);

  return {
    // Lists
    lists,
    selectedList,
    isLoadingLists,

    // Entities
    entities,
    isLoadingEntities,

    // CRUD Operations
    createList,
    updateList,
    deleteList,
    selectList,

    // Entity Management
    addEntityToList,
    addEntitiesToList,
    removeEntityFromList,
    reorderEntities,
    updateEntityNotes,
    bulkRemoveEntities,
    bulkMoveEntities,
    mergeLists,

    // Search and Filter
    searchLists,
    searchEntities,
    filterByType,

    // Sharing
    generateShareUrl,
    importFromShareUrl,
    generateQRCode,
    copyToClipboard,

    // Utilities
    refreshLists,
    refreshEntities,
    getListStats,

    // URL Compression
    exportListAsCompressedData,
    importListFromCompressedData,

    // File Export
    exportList,
    exportListCompressed,
    exportListAsFile,
    exportListAsCSV,
    exportListAsBibTeX,

    // Import Methods
    importList,
    importListCompressed,
    importListFromFile,
    validateImportData,
    previewImport,
  };
};