/**
 * Node.js modules management for disk cache operations
 * Handles dynamic imports to avoid browser bundling issues
 */

// Unused imports removed - logging handled by caller modules

import type * as CryptoModule from "node:crypto";
import type * as FsPromisesModule from "node:fs/promises";
import type * as PathModule from "node:path";

/**
 * Type guard narrowing an unknown value to a plain record, used to safely inspect `package.json` contents parsed from disk without an unchecked type assertion.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: typeof FsPromisesModule | undefined;
let path: typeof PathModule | undefined;
let crypto: typeof CryptoModule | undefined;

/**
 * For testing: allow injecting mock Node.js modules
 */
export const __setMockModules = ({
	mockFs,
	mockPath,
	mockCrypto,
}: Readonly<{
	mockFs?: typeof FsPromisesModule;
	mockPath?: typeof PathModule;
	mockCrypto?: typeof CryptoModule;
}>): void => {
	fs = mockFs;
	path = mockPath;
	crypto = mockCrypto;
};

/**
 * Initialize Node.js modules (required before using any file operations)
 */
export const initializeNodeModules = async (): Promise<void> => {
	if (fs && path && crypto) {
		return;
	}

	const [fsModule, pathModule, cryptoModule] = await Promise.all([
		import("node:fs/promises"),
		import("node:path"),
		import("node:crypto"),
	]);
	fs = fsModule.default;
	path = pathModule.default;
	crypto = cryptoModule.default;
};

/**
 * Get initialized Node modules (throws if not initialized)
 */
export const getNodeModules = (): {
	fs: typeof FsPromisesModule;
	path: typeof PathModule;
	crypto: typeof CryptoModule;
} => {
	if (!fs || !path || !crypto) {
		throw new Error(
			"Node modules not initialized. Call initializeNodeModules() first.",
		);
	}
	return { fs, path, crypto };
};

/**
 * Find the workspace root by looking for pnpm-workspace.yaml or package.json with workspaces
 * Walks up the directory tree from the current working directory
 */
export const findWorkspaceRoot = async (): Promise<string> => {
	await initializeNodeModules();
	const { fs: fsModule, path: pathModule } = getNodeModules();

	let currentDir = process.cwd();
	const root = pathModule.parse(currentDir).root;

	while (currentDir !== root) {
		try {
			// Check for pnpm-workspace.yaml (pnpm monorepo)
			const pnpmWorkspace = pathModule.join(currentDir, "pnpm-workspace.yaml");
			await fsModule.access(pnpmWorkspace);
			return currentDir;
		} catch {
			// Not found, try package.json with workspaces field
			try {
				const packageJson = pathModule.join(currentDir, "package.json");
				const content = await fsModule.readFile(packageJson, "utf8");
				const package_: unknown = JSON.parse(content);
				if (isPlainObject(package_) && package_.workspaces !== undefined) {
					return currentDir;
				}
			} catch {
				// Continue searching
			}
		}

		// Move up one directory
		currentDir = pathModule.dirname(currentDir);
	}

	// Fallback to current working directory if no workspace root found
	return process.cwd();
};

/**
 * Sleep for specified milliseconds
 */
export const sleep = async (ms: number): Promise<void> => {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
};

/**
 * Format bytes for human-readable display
 */
const BYTES_PER_UNIT = 1024;

export const formatBytes = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= BYTES_PER_UNIT && unitIndex < units.length - 1) {
		size /= BYTES_PER_UNIT;
		unitIndex++;
	}

	return `${size.toFixed(2)} ${units[unitIndex]}`;
};
