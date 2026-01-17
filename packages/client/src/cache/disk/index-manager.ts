/**
 * Index management for disk cache
 * Handles hierarchical index.json file operations
 */

import { type DirectoryIndex, type FileEntry, generateContentHash, isDirectoryIndex, logError, logger } from "@bibgraph/utils";

import type { EntityInfo, InterceptedData } from "./entity-extraction";
import { excludeMetaField } from "./entity-extraction";
import { writeFileAtomic } from "./file-operations";
import * as NodeModules from "./nodejs-modules";

const UNKNOWN_ERROR_MESSAGE = "Unknown error";

export const INDEX_FILE_NAME = "index.json";

// Re-export types from utils for convenience

/**
 * Compare two DirectoryIndex objects to determine if content has changed
 * Excludes the lastUpdated field from comparison
 * @param oldIndex
 * @param newIndex
 */
export const indexContentEquals = (oldIndex: DirectoryIndex, newIndex: DirectoryIndex): boolean => {
	// Compare files
	const oldFiles = oldIndex.files ?? {};
	const newFiles = newIndex.files ?? {};

	const oldFileKeys = Object.keys(oldFiles).sort();
	const newFileKeys = Object.keys(newFiles).sort();

	if (oldFileKeys.length !== newFileKeys.length) {
		return false;
	}

	for (const [i, oldFileKey] of oldFileKeys.entries()) {
		if (oldFileKey !== newFileKeys[i]) {
			return false;
		}

		const oldFile = oldFiles[oldFileKey] as FileEntry;
		const newFile = newFiles[newFileKeys[i]] as FileEntry;

		// Compare all FileEntry fields
		if (
			oldFile.url !== newFile.url ||
			oldFile.$ref !== newFile.$ref ||
			oldFile.lastRetrieved !== newFile.lastRetrieved ||
			oldFile.contentHash !== newFile.contentHash
		) {
			return false;
		}
	}

	// Compare directories
	const oldDirs = oldIndex.directories ?? {};
	const newDirs = newIndex.directories ?? {};

	const oldDirKeys = Object.keys(oldDirs).sort();
	const newDirKeys = Object.keys(newDirs).sort();

	if (oldDirKeys.length !== newDirKeys.length) {
		return false;
	}

	for (const [i, oldDirKey] of oldDirKeys.entries()) {
		if (oldDirKey !== newDirKeys[i]) {
			return false;
		}

		const oldDir = oldDirs[oldDirKey];
		const newDir = newDirs[newDirKeys[i]];

		// Compare directory entry fields
		if (
			oldDir?.$ref !== newDir?.$ref ||
			oldDir?.lastModified !== newDir?.lastModified
		) {
			return false;
		}
	}

	return true;
};

/**
 * Update hierarchical index.json files from the saved file up to the root
 * @param entityInfo
 * @param filePaths
 * @param filePaths.dataFile
 * @param filePaths.directoryPath
 * @param data
 * @param basePath
 * @param skipContainingDirectory
 */
export const updateHierarchicalIndexes = async (
	entityInfo: EntityInfo,
	filePaths: { dataFile: string; directoryPath: string },
	data: InterceptedData,
	basePath: string,
	skipContainingDirectory = true,
): Promise<void> => {
	await NodeModules.initializeNodeModules();
	const { path } = NodeModules.getNodeModules();

	try {
		// Start from the immediate directory containing the data file
		let currentPath = filePaths.directoryPath;
		if (skipContainingDirectory) {
			currentPath = path.dirname(currentPath);
		}
		const resolvedBasePath = path.resolve(basePath);

		while (currentPath?.startsWith(resolvedBasePath)) {
			await updateDirectoryIndex(
				currentPath,
				entityInfo,
				filePaths,
				data,
				basePath,
			);

			// Move up one directory level
			const parentPath = path.dirname(currentPath);
			if (parentPath === currentPath || !parentPath.startsWith(resolvedBasePath)) {
				break;
			}
			currentPath = parentPath;
		}
	} catch (error) {
		logError(logger, "Failed to update hierarchical indexes", error);
		throw new Error(
			`Index update failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
		);
	}
};

/**
 * Update a single directory's index.json file
 * @param directoryPath
 * @param entityInfo
 * @param filePaths
 * @param filePaths.dataFile
 * @param filePaths.directoryPath
 * @param data
 * @param basePath
 */
const updateDirectoryIndex = async (
	directoryPath: string,
	entityInfo: EntityInfo,
	filePaths: { dataFile: string; directoryPath: string },
	data: InterceptedData,
	basePath: string,
): Promise<void> => {
	await NodeModules.initializeNodeModules();
	const { fs, path } = NodeModules.getNodeModules();

	const indexPath = path.join(directoryPath, INDEX_FILE_NAME);
	const resolvedBasePath = path.resolve(basePath);
	const relativePath = path
		.relative(resolvedBasePath, directoryPath)
		.replaceAll("\\", "/");
	const displayPath = relativePath ? `/${relativePath}` : "/";

	try {
		// Read existing index or create new one
		let oldIndexData: DirectoryIndex | null = null;
		let indexData: DirectoryIndex = {
			lastUpdated: new Date().toISOString(),
		};

		try {
			const existingContent = await fs.readFile(indexPath, "utf8");
			const parsedData: unknown = JSON.parse(existingContent);
			if (!isDirectoryIndex(parsedData)) {
				throw new Error(`Invalid directory index format in ${indexPath}`);
			}
			// parsedData is validated as DirectoryIndex by isDirectoryIndex
			oldIndexData = parsedData;
			indexData = {
				// Preserve existing lastUpdated initially
				lastUpdated: parsedData.lastUpdated,
				...(parsedData.directories &&
					Object.keys(parsedData.directories).length > 0 && {
						directories: parsedData.directories,
					}),
				...(parsedData.files &&
					Object.keys(parsedData.files).length > 0 && {
						files: parsedData.files,
					}),
			};
		} catch {
			// File doesn't exist, use default structure
		}

		const isContainingDirectory = directoryPath === filePaths.directoryPath;

		// Handle containing directory case
		if (
			isContainingDirectory &&
			entityInfo.isQueryResponse &&
			entityInfo.queryParams
		) {
			const filename = path.basename(filePaths.dataFile, ".json");
			indexData.files ??= {};
			const responseDataToCache = excludeMetaField(data.responseData);
			indexData.files[filename] = {
				url: data.url,
				$ref: `./${filename}.json`,
				lastRetrieved: new Date().toISOString(),
				contentHash: await generateContentHash(responseDataToCache),
			};

			// Only update lastUpdated if content has actually changed
			indexData.lastUpdated =
				oldIndexData && indexContentEquals(oldIndexData, indexData)
					? oldIndexData.lastUpdated
					: new Date().toISOString();

			await writeFileAtomic({
				filePath: indexPath,
				content: JSON.stringify(indexData, null, 2),
			});
			return;
		}

		// Handle parent directory case
		if (!isContainingDirectory) {
			const relativePath = path.relative(
				directoryPath,
				filePaths.directoryPath,
			);
			const childDirName = relativePath.split(path.sep)[0];
			if (childDirName && childDirName !== ".") {
				indexData.directories ??= {};
				indexData.directories[childDirName] = {
					$ref: `./${childDirName}`,
					lastModified: new Date().toISOString(),
				};
			}
		}

		// Only update lastUpdated if content has actually changed
		if (oldIndexData && indexContentEquals(oldIndexData, indexData)) {
			// Content is identical, preserve old lastUpdated timestamp
			indexData.lastUpdated = oldIndexData.lastUpdated;
		} else {
			// Content has changed or this is a new index, update timestamp
			indexData.lastUpdated = new Date().toISOString();
		}

		// Write updated index
		await writeFileAtomic({
			filePath: indexPath,
			content: JSON.stringify(indexData, null, 2),
		});

		logger.debug("cache", "Updated directory index", {
			indexPath,
			relativePath: displayPath,
			isContainingDirectory,
			hasFiles: Object.keys(indexData.files ?? {}).length > 0,
			hasDirectories: Object.keys(indexData.directories ?? {}).length > 0,
		});
	} catch (error) {
		logError(logger, "Failed to update directory index", error);
		throw new Error(
			`Directory index update failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
		);
	}
};

/**
 * Read or create directory index at specified path
 * @param directoryPath
 * @param basePath
 * @param _basePath
 */
export const readOrCreateDirectoryIndex = async (
	directoryPath: string,
	_basePath: string,
): Promise<{ oldIndex: DirectoryIndex | null; currentIndex: DirectoryIndex }> => {
	await NodeModules.initializeNodeModules();
	const { fs, path } = NodeModules.getNodeModules();

	const indexPath = path.join(directoryPath, INDEX_FILE_NAME);
	let oldIndexData: DirectoryIndex | null = null;
	let indexData: DirectoryIndex = {
		lastUpdated: new Date().toISOString(),
	};

	try {
		const existingContent = await fs.readFile(indexPath, "utf8");
		const parsedData: unknown = JSON.parse(existingContent);
		if (!isDirectoryIndex(parsedData)) {
			throw new Error(`Invalid directory index format in ${indexPath}`);
		}
		// parsedData is validated as DirectoryIndex by isDirectoryIndex
		oldIndexData = parsedData;
		indexData = {
			...parsedData,
			// Preserve existing lastUpdated initially, we'll update it below if content changes
			lastUpdated: parsedData.lastUpdated,
		};
	} catch {
		// Index doesn't exist, use default
	}

	return { oldIndex: oldIndexData, currentIndex: indexData };
};

/**
 * Create a basic single-URL FileEntry
 * @param baseName
 * @param url
 * @param lastRetrieved
 * @param contentHash
 */
export const createBasicFileEntry = (
	baseName: string,
	url: string,
	lastRetrieved: string,
	contentHash: string,
): FileEntry => {
	return {
		url,
		$ref: `./${baseName}.json`,
		lastRetrieved,
		contentHash,
	};
};
