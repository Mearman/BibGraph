/**
 * Search and filter operations for catalogue
 * Provides search and filter functionality for lists and entities
 */

import type { CatalogueEntity, CatalogueList } from "@bibgraph/utils";
import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import { useCallback } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-search";

export interface UseCatalogueSearchParams {
	entities: CatalogueEntity[];
}

/**
 * Search and filter hook for catalogue lists and entities
 */
export const useCatalogueSearch = (params: UseCatalogueSearchParams) => {
	const storageProvider = useStorageProvider();
	const { entities } = params;

	// Search lists
	const searchLists = useCallback(async (query: string): Promise<CatalogueList[]> => {
		try {
			return await storageProvider.searchLists(query);
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to search catalogue lists", { query, error });
			return [];
		}
	}, [storageProvider]);

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

	return {
		searchLists,
		searchEntities,
		filterByType,
	};
};
