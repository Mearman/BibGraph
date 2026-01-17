/**
 * Disk-based cache writing system for OpenAlex API responses
 * Orchestrates writing intercepted responses to apps/web/public/data/openalex/ structure
 * with atomic operations, file locking, and metadata generation
 *
 * This module has been refactored to use focused sub-modules:
 * - nodejs-modules.ts: Dynamic imports and module management
 * - file-operations.ts: Atomic writes, locking, and directory management
 * - entity-extraction.ts: Entity info extraction and path generation
 * - index-manager.ts: Hierarchical index.json operations
 */

import { type FileEntry,logger, STATIC_DATA_CACHE_PATH } from "@bibgraph/utils";

import * as EntityExtraction from "./entity-extraction";
import * as FileOps from "./file-operations";
import * as IndexManager from "./index-manager";
import * as NodeModules from "./nodejs-modules";

// Re-export types from sub-modules

// Re-export utilities for testing

/**
 * Configuration for disk cache writer
 */
export interface DiskWriterConfig {
	/** Base path for cache storage (defaults to apps/web/public/data/openalex) */
	basePath: string;
	/** Maximum concurrent write operations (defaults to 10) */
	maxConcurrentWrites: number;
	/** Timeout for file lock acquisition in milliseconds (defaults to 5000) */
	lockTimeoutMs: number;
	/** Whether to validate available disk space before writing (defaults to true) */
	checkDiskSpace: boolean;
	/** Minimum required disk space in bytes (defaults to 100MB) */
	minDiskSpaceBytes: number;
}

/**
 * Comprehensive disk cache writer with atomic operations and concurrent access control
 */
export class DiskCacheWriter {
	private readonly config: Required<DiskWriterConfig>;
	private readonly activeLocks = new Map<string, FileOps.FileLock>();
	private readonly writeQueue = new Set<Promise<void>>();
	private workspaceRoot: string | null = null;
	private workspaceRootPromise: Promise<string> | null = null;

	constructor(config: Partial<DiskWriterConfig> = {}) {
		this.config = {
			basePath: config.basePath ?? STATIC_DATA_CACHE_PATH,
			maxConcurrentWrites: config.maxConcurrentWrites ?? 10,
			lockTimeoutMs: config.lockTimeoutMs ?? 5000,
			checkDiskSpace: config.checkDiskSpace ?? true,
			minDiskSpaceBytes: config.minDiskSpaceBytes ?? 100 * 1024 * 1024, // 100MB
		};

		logger.debug("cache", "DiskCacheWriter initialized", {
			config: this.config,
		});
	}

	/**
	 * Get the resolved base path (workspace root + relative path)
	 * Cached after first call
	 */
	private async getResolvedBasePath(): Promise<string> {
		// Check if basePath is already absolute FIRST
		// This must be checked before using this.workspaceRoot to avoid double path joining
		await NodeModules.initializeNodeModules();
		const { path } = NodeModules.getNodeModules();

		if (path.isAbsolute(this.config.basePath)) {
			logger.debug("cache", "Using absolute basePath", {
				basePath: this.config.basePath,
			});
			return this.config.basePath;
		}

		// If we have a cached workspace root, use it for relative paths
		if (this.workspaceRoot) {
			return path.join(this.workspaceRoot, this.config.basePath);
		}

		// Perform workspace root detection for relative paths
		if (!this.workspaceRootPromise) {
			this.workspaceRootPromise = NodeModules.findWorkspaceRoot().then((root) => {
				this.workspaceRoot = root;
				logger.debug("cache", "Workspace root found", { root });
				return root;
			});
		}

		const root = await this.workspaceRootPromise;
		return path.join(root, this.config.basePath);
	}

	/**
	 * Write intercepted response data to disk cache
	 * @param data
	 */
	public async writeToCache(data: EntityExtraction.InterceptedData): Promise<void> {
		// Enforce concurrent write limit
		while (this.writeQueue.size >= this.config.maxConcurrentWrites) {
			// Wait for any write to complete
			await Promise.race(this.writeQueue);
		}

		const writePromise = this._writeToCache(data);
		this.writeQueue.add(writePromise);

		try {
			await writePromise;
		} finally {
			this.writeQueue.delete(writePromise);
		}
	}

	/**
	 * Internal write implementation
	 *
	 * WRITE WORKFLOW:
	 * This method orchestrates the complete cache write process, including:
	 * 1. Input validation and disk space checks
	 * 2. Entity extraction and path generation
	 * 3. File locking for concurrent safety (index and data files)
	 * 4. Atomic file writes using temporary files
	 * 5. Index updates with hierarchical propagation
	 * 6. Lock release in finally block
	 * @param data
	 */
	private async _writeToCache(data: EntityExtraction.InterceptedData): Promise<void> {
		let indexLockId: string | undefined;
		let dataLockId: string | undefined;
		let filePaths:
			| {
					dataFile: string;
					directoryPath: string;
				}
			| undefined;

		// Initialize Node.js modules and extract them for use in try and finally blocks
		await NodeModules.initializeNodeModules();
		const { path } = NodeModules.getNodeModules();

		try {
			// Validate input data
			this.validateInterceptedData(data);

			// Get resolved base path (workspace root + relative path)
			const resolvedBasePath = await this.getResolvedBasePath();

			// Check disk space if enabled
			if (this.config.checkDiskSpace) {
				await FileOps.ensureSufficientDiskSpace(
					resolvedBasePath,
					this.config.minDiskSpaceBytes,
				);
			}

			// Extract entity information from URL or response
			const entityInfo = await EntityExtraction.extractEntityInfo(data);

			// Generate file paths
			filePaths = await EntityExtraction.generateFilePaths(
				entityInfo,
				resolvedBasePath,
			);

			const indexPath = path.join(filePaths.directoryPath, IndexManager.INDEX_FILE_NAME);

			// Acquire exclusive locks for concurrent writes
			indexLockId = await FileOps.acquireFileLock(
				indexPath,
				this.activeLocks,
				this.config,
			);
			dataLockId = await FileOps.acquireFileLock(
				filePaths.dataFile,
				this.activeLocks,
				this.config,
			);

			// Ensure directory structure exists
			await FileOps.ensureDirectoryStructure(filePaths.directoryPath);

			// Prepare content - exclude meta field from cached responses
			const responseDataToCache = EntityExtraction.excludeMetaField(
				data.responseData,
			);

			// Skip caching if results are empty
			if (EntityExtraction.hasEmptyResults(responseDataToCache)) {
				logger.debug("cache", "Skipping cache write for empty results", {
					url: data.url,
				});
				return;
			}

			const content = JSON.stringify(responseDataToCache, null, 2);
			const utils = await import("@bibgraph/utils");
			const newContentHash = await utils.generateContentHash(
				responseDataToCache,
			);
			const newLastRetrieved = new Date().toISOString();

			const baseName = path.basename(filePaths.dataFile, ".json");

			// Read or create directory index
			const { oldIndex, currentIndex } =
				await IndexManager.readOrCreateDirectoryIndex(
					filePaths.directoryPath,
					this.config.basePath,
				);

			// Create or update file entry with sanitized URL
			const sanitizedUrl = utils.sanitizeUrlForCaching(
				data.url,
			);
			const fileEntry: FileEntry = {
				url: sanitizedUrl,
				$ref: `./${baseName}.json`,
				lastRetrieved: newLastRetrieved,
				contentHash: newContentHash,
			};

			// Write data file atomically
			await FileOps.writeFileAtomic({
				filePath: filePaths.dataFile,
				content,
			});

			// Update the containing directory index
			currentIndex.files ??= {};
			currentIndex.files[baseName] = fileEntry;

			// Only update lastUpdated if content has actually changed
			if (oldIndex && IndexManager.indexContentEquals(oldIndex, currentIndex)) {
				// Content is identical, preserve old lastUpdated timestamp
				currentIndex.lastUpdated = oldIndex.lastUpdated;
			} else {
				// Content has changed or this is a new index, update timestamp
				currentIndex.lastUpdated = new Date().toISOString();
			}

			await FileOps.writeFileAtomic({
				filePath: path.join(filePaths.directoryPath, IndexManager.INDEX_FILE_NAME),
				content: JSON.stringify(currentIndex, null, 2),
			});

			// Propagate updates to hierarchical parent indexes (skip containing directory)
			await IndexManager.updateHierarchicalIndexes(
				entityInfo,
				filePaths,
				data,
				this.config.basePath,
				true,
			);

			logger.debug("cache", "Cache write successful", {
				entityType: entityInfo.entityType,
				entityId: entityInfo.entityId,
				baseName,
				dataFile: filePaths.dataFile,
				fileSizeBytes: Buffer.byteLength(content, "utf8"),
			});
		} finally {
			// Release all locks
			if (indexLockId && filePaths) {
				FileOps.releaseFileLock(
					{
						lockId: indexLockId,
						filePath: path.join(
							filePaths.directoryPath,
							IndexManager.INDEX_FILE_NAME,
						),
					},
					this.activeLocks,
				);
			}
			if (dataLockId && filePaths) {
				FileOps.releaseFileLock(
					{ lockId: dataLockId, filePath: filePaths.dataFile },
					this.activeLocks,
				);
			}
		}
	}

	/**
	 * Validate intercepted data structure
	 * @param data
	 */
	private validateInterceptedData(data: EntityExtraction.InterceptedData): void {
		if (!data || typeof data !== "object") {
			throw new Error("Invalid intercepted data: must be an object");
		}

		const requiredFields = [
			"url",
			"method",
			"responseData",
			"statusCode",
			"timestamp",
		];
		const missingFields = requiredFields.filter((field) => !(field in data));

		if (missingFields.length > 0) {
			throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
		}

		if (typeof data.url !== "string" || !data.url) {
			throw new Error("Invalid URL: must be a non-empty string");
		}

		if (
			typeof data.statusCode !== "number" ||
			data.statusCode < 100 ||
			data.statusCode > 599
		) {
			throw new Error("Invalid status code: must be a number between 100-599");
		}

		if (!data.responseData) {
			throw new Error("Invalid response data: must be present");
		}
	}

	/**
	 * Get the current configuration (for testing)
	 */
	public getConfig(): Readonly<Required<DiskWriterConfig>> {
		return this.config;
	}

	/**
	 * Get current cache statistics
	 */
	public getCacheStats(): {
		activeLocks: number;
		activeWrites: number;
		maxConcurrentWrites: number;
	} {
		return {
			activeLocks: this.activeLocks.size,
			activeWrites: this.writeQueue.size,
			maxConcurrentWrites: this.config.maxConcurrentWrites,
		};
	}

	/**
	 * Clean up resources
	 */
	public async cleanup(): Promise<void> {
		// Wait for all active writes to complete
		if (this.writeQueue.size > 0) {
			await Promise.allSettled(this.writeQueue);
		}

		// Clear all locks
		this.activeLocks.clear();

		logger.debug("LOGGER_NAME", "DiskCacheWriter cleanup completed");
	}
}

/**
 * Default disk cache writer instance
 */
export const defaultDiskWriter = new DiskCacheWriter();

/**
 * Convenience function to write intercepted data to cache
 * @param data
 */
export const writeToDiskCache = async (
	data: EntityExtraction.InterceptedData,
): Promise<void> => defaultDiskWriter.writeToCache(data);
