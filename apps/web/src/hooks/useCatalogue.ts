/**
 * React hook for catalogue management
 * Composes focused hooks for CRUD, search, sharing, export, and import operations
 */

import type { EntityType } from "@bibgraph/types";
import { type CatalogueEntity, catalogueEventEmitter, type CatalogueList, type ListType } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import { useCallback, useEffect, useState } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";
import type { ExportFormat } from "@/types/catalogue";

import {
	useCatalogueCore,
	useCatalogueCRUD,
	useCatalogueSearch,
	useCatalogueSharing,
	useCatalogueExport,
	useCatalogueImport,
	type UseCatalogueOptions,
} from "./catalogue";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-hook";

export interface UseCatalogueReturn {
	// Lists
	lists: CatalogueList[];
	selectedList: CatalogueList | null;
	isLoadingLists: boolean;

	// Entities
	entities: CatalogueEntity[];
	isLoadingEntities: boolean;

	// Mutation loading states
	isAddingEntity: boolean;
	isRemovingEntity: boolean;
	isUpdatingList: boolean;
	isDeletingList: boolean;

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
	const storageProvider = useStorageProvider();

	// Mutation loading states
	const [isAddingEntity, setIsAddingEntity] = useState(false);
	const [isRemovingEntity, setIsRemovingEntity] = useState(false);
	const [isUpdatingList, setIsUpdatingList] = useState(false);
	const [isDeletingList, setIsDeletingList] = useState(false);

	// Core state management
	const core = useCatalogueCore(options);

	// CRUD operations
	const crud = useCatalogueCRUD({
		setLists: core.setLists,
		setEntities: core.setEntities,
		setSelectedList: core.setSelectedList,
		setIsUpdatingList,
		setIsDeletingList,
		setIsAddingEntity,
		setIsRemovingEntity,
		lists: core.lists,
		entities: core.entities,
		selectedList: core.selectedList,
		refreshLists: core.refreshLists,
		refreshEntities: async (listId) => {
			const list = core.lists.find(l => l.id === listId);
			if (list) {
				core.selectList(list);
				await core.refreshEntities();
			}
		},
		selectList: core.selectList,
	});

	// Search and filter
	const search = useCatalogueSearch({ entities: core.entities });

	// Sharing operations
	const sharing = useCatalogueSharing();

	// Export operations
	const exportOps = useCatalogueExport();

	// Import operations
	const importOps = useCatalogueImport();

	// Get list statistics
	const getListStats = useCallback(async (listId: string): Promise<{
		totalEntities: number;
		entityCounts: Record<EntityType, number>;
	}> => {
		try {
			return await storageProvider.getListStats(listId);
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
	}, [storageProvider]);

	return {
		// Lists
		lists: core.lists,
		selectedList: core.selectedList,
		isLoadingLists: core.isLoadingLists,

		// Entities
		entities: core.entities,
		isLoadingEntities: core.isLoadingEntities,

		// Mutation loading states
		isAddingEntity,
		isRemovingEntity,
		isUpdatingList,
		isDeletingList,

		// CRUD Operations
		createList: crud.createList,
		updateList: crud.updateList,
		deleteList: crud.deleteList,
		selectList: (id) => core.selectList(core.lists.find(l => l.id === id) || null),

		// Entity Management
		addEntityToList: crud.addEntityToList,
		addEntitiesToList: crud.addEntitiesToList,
		removeEntityFromList: crud.removeEntityFromList,
		reorderEntities: crud.reorderEntities,
		updateEntityNotes: crud.updateEntityNotes,
		bulkRemoveEntities: crud.bulkRemoveEntities,
		bulkMoveEntities: crud.bulkMoveEntities,
		mergeLists: crud.mergeLists,

		// Search and Filter
		searchLists: search.searchLists,
		searchEntities: search.searchEntities,
		filterByType: search.filterByType,

		// Sharing
		generateShareUrl: sharing.generateShareUrl,
		importFromShareUrl: sharing.importFromShareUrl,
		generateQRCode: sharing.generateQRCode,
		copyToClipboard: sharing.copyToClipboard,

		// Utilities
		refreshLists: core.refreshLists,
		refreshEntities: core.refreshEntities,
		getListStats,

		// URL Compression
		exportListAsCompressedData: exportOps.exportListAsCompressedData,
		importListFromCompressedData: importOps.importListFromCompressedData,

		// File Export
		exportList: exportOps.exportList,
		exportListCompressed: exportOps.exportListCompressed,
		exportListAsFile: exportOps.exportListAsFile,
		exportListAsCSV: exportOps.exportListAsCSV,
		exportListAsBibTeX: exportOps.exportListAsBibTeX,

		// Import Methods
		importList: importOps.importList,
		importListCompressed: importOps.importListCompressed,
		importListFromFile: importOps.importListFromFile,
		validateImportData: importOps.validateImportData,
		previewImport: importOps.previewImport,
	};
};
