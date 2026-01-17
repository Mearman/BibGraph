/**
 * Shared types for catalogue hooks
 */

import type { EntityType } from "@bibgraph/types";
import type { CatalogueList, ListType } from "@bibgraph/utils";

export interface UseCatalogueOptions {
	/** Auto-refresh on list changes */
	autoRefresh?: boolean;
	/** Specific list ID to focus on */
	listId?: string;
}

export interface CreateListParams {
	title: string;
	description?: string;
	type: ListType;
	tags?: string[];
	isPublic?: boolean;
}

export interface UpdateListParams {
	title?: string;
	description?: string;
	tags?: string[];
	isPublic?: boolean;
}

export interface AddEntityParams {
	listId: string;
	entityType: EntityType;
	entityId: string;
	notes?: string;
	position?: number;
}

export interface ListStats {
	totalEntities: number;
	entityCounts: Record<string, number>;
}

export interface ShareAccessResult {
	list: CatalogueList | null;
	valid: boolean;
}
