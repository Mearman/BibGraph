/**
 * Sharing operations for catalogue
 * Handles share URL generation, QR code generation, and clipboard operations
 */

import type { CompressedListData } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import QRCode from "qrcode";
import { useCallback } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-sharing";

// User-friendly error message mapping
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

/**
 * Sharing operations hook for catalogue lists
 * Provides share URL generation, QR code, and clipboard operations
 */
export const useCatalogueSharing = () => {
	const storageProvider = useStorageProvider();

	// Generate share URL
	const generateShareUrl = useCallback(async (listId: string): Promise<string> => {
		try {
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			const listEntities = await storageProvider.getListEntities(listId);

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
			const shareToken = await storageProvider.generateShareToken(listId);

			// Import createShareUrl dynamically
			const { createShareUrl: createShareUrlUtil } = await import("@bibgraph/utils");

			// Create share URL with compressed data
			const baseUrl = `${window.location.origin}${window.location.pathname}#/catalogue/shared/${shareToken}`;
			return createShareUrlUtil(baseUrl, listData, logger);
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to generate share URL", { listId, error });
			throw error;
		}
	}, [storageProvider]);

	// Import from share URL
	const importFromShareUrl = useCallback(async (url: string): Promise<string | null> => {
		try {
			// URL validation - Check if input is full URL or just data string
			let compressedData: string;

			if (url.includes('://') || url.includes('?')) {
				// Full URL format - extract data parameter
				try {
					const urlObj = new URL(url.startsWith('http') ? url : `https://dummy.com${url.startsWith('/') ? '' : '/'}${url}`);
					const dataParam = urlObj.searchParams.get('data');
					if (!dataParam) {
						throw new Error("No 'data' parameter found in URL");
					}
					compressedData = dataParam;
				} catch {
					// URL parsing failed, try as data string
					compressedData = url;
				}
			} else {
				// Direct data string
				compressedData = url;
			}

			// Import decompression utility dynamically
			const { decompressListData, validateListData } = await import("@bibgraph/utils");

			// Decompress the data
			const listData = decompressListData(compressedData);

			if (!listData || !validateListData(listData)) {
				throw new Error("Invalid or corrupted share data");
			}

			// Create new list from share data
			const listId = await storageProvider.createList({
				title: listData.list.title,
				description: listData.list.description ? `${listData.list.description} (Imported from shared list)` : "Imported from shared list",
				type: listData.list.type, // Preserves 'bibliography' type
				tags: [...(listData.list.tags || []), "imported"],
				isPublic: false, // Don't make imported lists public by default
			});

			// Add entities to the new list
			if (listData.entities.length > 0) {
				await storageProvider.addEntitiesToList(listId, listData.entities);
			}

			logger.debug(CATALOGUE_LOGGER_CONTEXT, "List imported from share URL successfully", {
				listId,
				entityCount: listData.entities.length,
				isBibliography: listData.list.type === 'bibliography',
			});

			return listId;
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from share URL", { url, error });
			// Re-throw with user-friendly message
			throw new Error(getUserFriendlyErrorMessage(error));
		}
	}, [storageProvider]);

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

	return {
		generateShareUrl,
		importFromShareUrl,
		generateQRCode,
		copyToClipboard,
	};
};
