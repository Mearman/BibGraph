/**
 * File system operations for disk cache
 * Handles atomic writes, file locking, and directory management
 */

import { logError, logger } from "@bibgraph/utils";

import * as NodeModules from "./nodejs-modules";

const _ERROR_MESSAGE_FS_NOT_INITIALIZED = "Node.js fs module not initialized";
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

/**
 * File lock entry for concurrent access control
 */
export interface FileLock {
	lockId: string;
	timestamp: number;
	filePath: string;
}

/**
 * Configuration for file operations
 */
export interface FileOperationsConfig {
	maxConcurrentWrites: number;
	lockTimeoutMs: number;
}

/**
 * Ensure directory structure exists
 * @param dirPath
 */
export const ensureDirectoryStructure = async (dirPath: string): Promise<void> => {
	try {
		await NodeModules.initializeNodeModules();
		const { fs } = NodeModules.getNodeModules();
		await fs.mkdir(dirPath, { recursive: true });
	} catch (error) {
		logError(logger, "Failed to create directory structure", error);
		throw new Error(
			`Directory creation failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
		);
	}
};

/**
 * Write file atomically using temporary file
 * @param root0
 * @param root0.filePath
 * @param root0.content
 */
export const writeFileAtomic = async ({
	filePath,
	content,
}: {
	filePath: string;
	content: string;
}): Promise<void> => {
	await NodeModules.initializeNodeModules();
	const { crypto, fs } = NodeModules.getNodeModules();

	const tempPath = `${filePath}.tmp.${crypto.randomUUID()}`;

	try {
		// Write to temporary file first
		await fs.writeFile(tempPath, content, "utf8");

		// Atomically move to final location
		await fs.rename(tempPath, filePath);
	} catch (error) {
		// Clean up temporary file if it exists
		try {
			await fs.unlink(tempPath);
		} catch {
			// Ignore cleanup errors
		}

		logError(logger, "Atomic file write failed", error);
		throw new Error(
			`Atomic write failed: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
		);
	}
};

/**
 * Acquire file lock for concurrent access control
 *
 * LOCKING EXTENSIONS: Implements optimistic locking with timeout-based
 * stale lock cleanup. Uses UUID for lock IDs and in-memory Map for tracking.
 * Polls with 50ms intervals up to lockTimeoutMs (default 5s). Stale locks
 * (older than timeout) are automatically removed to prevent deadlocks from
 * crashed processes. Essential for safe concurrent writes in multi-tab
 * development or server environments.
 * @param filePath
 * @param activeLocks
 * @param config
 */
export const acquireFileLock = async (
	filePath: string,
	activeLocks: Map<string, FileLock>,
	config: FileOperationsConfig,
): Promise<string> => {
	await NodeModules.initializeNodeModules();
	const { crypto } = NodeModules.getNodeModules();

	const lockId = crypto.randomUUID();
	const maxWaitTime = config.lockTimeoutMs;
	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitTime) {
		if (!activeLocks.has(filePath)) {
			// Acquire lock
			activeLocks.set(filePath, {
				lockId,
				timestamp: Date.now(),
				filePath,
			});

			logger.debug("LOGGER_NAME", "File lock acquired", {
				filePath,
				lockId,
			});
			return lockId;
		}

		// Check for stale locks (older than timeout)
		const existingLock = activeLocks.get(filePath);
		if (existingLock && Date.now() - existingLock.timestamp > maxWaitTime) {
			// Remove stale lock
			activeLocks.delete(filePath);
			logger.warn("LOGGER_NAME", "Removed stale file lock", {
				filePath,
				staleLockId: existingLock.lockId,
			});
			continue;
		}

		// Wait before retrying
		await NodeModules.sleep(50);
	}

	throw new Error(
		`Failed to acquire file lock for ${filePath} within ${maxWaitTime}ms`,
	);
};

/**
 * Release file lock
 * @param root0
 * @param root0.lockId
 * @param root0.filePath
 * @param activeLocks
 */
export const releaseFileLock = (
	{ lockId, filePath }: { lockId: string; filePath: string },
	activeLocks: Map<string, FileLock>,
): void => {
	const existingLock = activeLocks.get(filePath);

	if (existingLock?.lockId === lockId) {
		activeLocks.delete(filePath);
		logger.debug("LOGGER_NAME", "File lock released", {
			filePath,
			lockId,
		});
	} else {
		logger.warn(
			"LOGGER_NAME",
			"Attempted to release non-existent or mismatched lock",
			{ filePath, lockId },
		);
	}
};

/**
 * Check available disk space
 * @param basePath
 * @param minDiskSpaceBytes
 */
export const ensureSufficientDiskSpace = async (
	basePath: string,
	minDiskSpaceBytes: number,
): Promise<void> => {
	try {
		await NodeModules.initializeNodeModules();
		const { fs } = NodeModules.getNodeModules();

		const stats = await fs.statfs(basePath);
		const availableBytes = stats.bavail * stats.bsize;

		if (availableBytes < minDiskSpaceBytes) {
			throw new Error(
				`Insufficient disk space: ${NodeModules.formatBytes(availableBytes)} available, ` +
					`${NodeModules.formatBytes(minDiskSpaceBytes)} required`,
			);
		}

		logger.debug("LOGGER_NAME", "Disk space check passed", {
			availableBytes,
			requiredBytes: minDiskSpaceBytes,
		});
	} catch (error) {
		// If statfs is not available or directory doesn't exist yet, skip the check
		if (
			error instanceof Error &&
			(error.message.includes("ENOSYS") || error.message.includes("ENOENT"))
		) {
			logger.warn(
				"LOGGER_NAME",
				error.message.includes("ENOSYS")
					? "Disk space checking not available on this platform"
					: "Base path does not exist yet, skipping disk space check",
			);
			return;
		}

		throw error;
	}
};
