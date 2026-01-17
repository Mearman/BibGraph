/**
 * Import operations for catalogue
 * Handles importing lists from various sources (files, compressed data, JSON)
 */

import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import { useCallback } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";
import type { ExportFormat } from "@/types/catalogue";
import { validateExportFormat } from "@/utils/catalogue-validation";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-import";

/**
 * Import operations hook for catalogue lists
 * Provides import from files, compressed data, and JSON
 */
export const useCatalogueImport = () => {
	const storageProvider = useStorageProvider();

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
			const allLists = await storageProvider.getAllLists();

			for (const list of allLists) {
				if (!list.id) continue;
				const listEntities = await storageProvider.getListEntities(list.id);
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
	}, [storageProvider]);

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
			const listId = await storageProvider.createList({
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

				await storageProvider.addEntitiesToList(listId, entitiesToAdd);
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
	}, [storageProvider]);

	// Import list from compressed Base64URL string
	const importListCompressed = useCallback(async (compressed: string): Promise<string> => {
		try {
			// Import decompression utility dynamically
			const { decompressListData } = await import("@bibgraph/utils");

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

	// Import list from compressed data (alias for importListCompressed)
	const importListFromCompressedData = useCallback(async (compressedData: string): Promise<string | null> => {
		try {
			const utils = await import("@bibgraph/utils");
			const listData = utils.decompressListData(compressedData);

			if (!listData || !utils.validateListData(listData)) {
				throw new Error("Invalid or corrupted list data");
			}

			// Create new list from compressed data
			const listId = await storageProvider.createList({
				title: `${listData.list.title} (Imported)`,
				description: listData.list.description ? `${listData.list.description} (Imported)` : "Imported from compressed data",
				type: listData.list.type,
				tags: [...(listData.list.tags || []), "imported"],
				isPublic: false,
			});

			// Add entities to the new list
			if (listData.entities.length > 0) {
				await storageProvider.addEntitiesToList(listId, listData.entities);
			}

			return listId;
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from compressed data", { error });
			return null;
		}
	}, [storageProvider]);

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

	return {
		validateImportData,
		previewImport,
		importList,
		importListCompressed,
		importListFromCompressedData,
		importListFromFile,
	};
};
