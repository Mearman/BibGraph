/**
 * Stub implementations for cache functions These provide basic functionality to prevent compilation errors Applications should provide their own implementations
 */

import { logger } from "../logger.js";

/**
 * Initialize query client with cache restoration Stub implementation - applications should provide their own
 */
export const initializeQueryClient = async (): Promise<{
	queryClient: unknown;
	invalidationResult: unknown;
}> => {
	await Promise.resolve();
	return {
		queryClient: null,
		invalidationResult: { success: true, message: "Stub implementation" },
	};
};

/**
 * Create a standard query client Stub implementation - applications should provide their own
 */
export const createStandardQueryClient = (): unknown => null;

/**
 * Clear expired cache entries Stub implementation - applications should provide their own
 */
export const clearExpiredCache = async (): Promise<void> => {
	logger.warn("cache", "clearExpiredCache: Using stub implementation");
	await Promise.resolve();
};

/**
 * Clear all cache layers Stub implementation - applications should provide their own
 */
export const clearAllCacheLayers = async (): Promise<unknown> => {
	logger.warn("cache", "clearAllCacheLayers: Using stub implementation");
	await Promise.resolve();
	return { success: true, message: "Stub implementation" };
};

/**
 * Clear application metadata Stub implementation - applications should provide their own
 */
export const clearAppMetadata = async (): Promise<void> => {
	logger.warn("cache", "clearAppMetadata: Using stub implementation");
	await Promise.resolve();
};
