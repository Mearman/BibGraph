/**
 * Export operations for catalogue
 * Handles exporting lists to various formats (JSON, CSV, BibTeX, compressed)
 */

import type { CatalogueEntity } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import { useCallback } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";
import type { ExportFormat } from "@/types/catalogue";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-export";

/**
 * Export operations hook for catalogue lists
 * Provides export to JSON, CSV, BibTeX, and compressed formats
 */
export const useCatalogueExport = () => {
	const storageProvider = useStorageProvider();

	// Helper function to escape CSV values
	const escapeCSVValue = useCallback((value: string): string => {
		// Wrap in quotes if it contains comma, quote, or newline
		if (value.includes(',') || value.includes('"') || value.includes('\n')) {
			return `"${value.replaceAll('"', '""')}"`;
		}
		return value;
	}, []);

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

	// Export list to ExportFormat
	const exportList = useCallback(async (listId: string): Promise<ExportFormat> => {
		try {
			// Get list metadata
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			// Get all entities for the list
			const listEntities = await storageProvider.getListEntities(listId);

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
	}, [storageProvider]);

	// Export list as compressed Base64URL string
	const exportListCompressed = useCallback(async (listId: string): Promise<string> => {
		try {
			// Get the list
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			const listEntities = await storageProvider.getListEntities(listId);

			// Create CompressedListData format for compression
			const compressedFormat = {
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

			// Import compression utility dynamically
			const { compressListData: compress } = await import("@bibgraph/utils");
			const compressed = compress(compressedFormat);

			logger.debug(CATALOGUE_LOGGER_CONTEXT, "List compressed successfully", {
				listId,
				compressedSize: compressed.length,
			});

			return compressed;
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to compress list", { listId, error });
			throw error;
		}
	}, [storageProvider]);

	// Export list as CSV
	const exportListAsCSV = useCallback(async (listId: string): Promise<void> => {
		try {
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			const listEntities = await storageProvider.getListEntities(listId);

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
	}, [storageProvider, escapeCSVValue]);

	// Export list as BibTeX (works only)
	const exportListAsBibTeX = useCallback(async (listId: string): Promise<void> => {
		try {
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			const listEntities = await storageProvider.getListEntities(listId);

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
	}, [storageProvider, convertToBibTeX]);

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

			const list = await storageProvider.getList(listId);
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
	}, [storageProvider, exportList, exportListCompressed, exportListAsCSV, exportListAsBibTeX]);

	// Export list as compressed data (returns string, doesn't trigger download)
	const exportListAsCompressedData = useCallback(async (listId: string): Promise<string | null> => {
		try {
			const list = await storageProvider.getList(listId);
			if (!list) {
				throw new Error("List not found");
			}

			const listEntities = await storageProvider.getListEntities(listId);

			const listData = {
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

			// Import compression utility dynamically
			const { compressListData: compress } = await import("@bibgraph/utils");
			return compress(listData);
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as compressed data", { listId, error });
			return null;
		}
	}, [storageProvider]);

	return {
		exportList,
		exportListCompressed,
		exportListAsFile,
		exportListAsCSV,
		exportListAsBibTeX,
		exportListAsCompressedData,
	};
};
