/**
 * Service utilities
 * Stub implementations for relationship detection and graph data services
 */

import { logger } from "./logger.js"

// Service interfaces
export interface RelationshipDetectionService {
	detectRelationships: (entities: readonly unknown[]) => Promise<unknown[]>
	getRelationshipTypes: () => string[]
}

export interface GraphDataService {
	loadGraphData: (entityId: string) => Promise<unknown>
	expandGraph: (nodeId: string, expansionType: string) => Promise<unknown>
}

/**
 * Get relationship detection service instance
 * Stub implementation - applications should provide their own
 */
export const getRelationshipDetectionService = (): RelationshipDetectionService => {
	logger.warn("services", "getRelationshipDetectionService: Using stub implementation")

	return {
		detectRelationships: async (): Promise<unknown[]> => {
			logger.warn("services", "detectRelationships: Using stub implementation")
			await Promise.resolve()
			return []
		},

		getRelationshipTypes: (): string[] => ["cites", "cited_by", "authored_by", "related_to"],
	}
};

/**
 * Get graph data service instance
 * Stub implementation - applications should provide their own
 */
export const getGraphDataService = (): GraphDataService => {
	logger.warn("services", "getGraphDataService: Using stub implementation")

	return {
		loadGraphData: async (): Promise<unknown> => {
			logger.warn("services", "loadGraphData: Using stub implementation")
			await Promise.resolve()
			return null
		},

		expandGraph: async (): Promise<unknown> => {
			logger.warn("services", "expandGraph: Using stub implementation")
			await Promise.resolve()
			return null
		},
	}
};

/**
 * Hook for OpenAlex entity data
 * Stub implementation - applications should provide their own
 */
export const useOpenAlexEntity = (): {
	data: unknown
	isLoading: boolean
	error: Error | null
} => {
	logger.warn("services", "useOpenAlexEntity: Using stub implementation")

	return {
		data: null,
		isLoading: false,
		error: null,
	}
};
