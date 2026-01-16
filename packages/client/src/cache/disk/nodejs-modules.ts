/**
 * Node.js modules management for disk cache operations
 * Handles dynamic imports to avoid browser bundling issues
 */

import { logError, logger } from "@bibgraph/utils";

// Dynamic imports for Node.js modules to avoid browser bundling issues
let fs: typeof import("node:fs/promises") | undefined;
let path: typeof import("node:path") | undefined;
let crypto: typeof import("node:crypto") | undefined;

/**
 * For testing: allow injecting mock Node.js modules
 */
export const __setMockModules = ({
	mockFs,
	mockPath,
	mockCrypto,
}: {
	mockFs?: typeof import("fs/promises");
	mockPath?: typeof import("path");
	mockCrypto?: typeof import("crypto");
}): void => {
	fs = mockFs;
	path = mockPath;
	crypto = mockCrypto;
};

/**
 * Initialize Node.js modules (required before using any file operations)
 */
export const initializeNodeModules = async (): Promise<void> => {
	if (!fs || !path || !crypto) {
		const [fsModule, pathModule, cryptoModule] = await Promise.all([
			import("node:fs/promises"),
			import("node:path"),
			import("node:crypto"),
		]);
		fs = fsModule.default || fsModule;
		path = pathModule.default || pathModule;
		crypto = cryptoModule.default || cryptoModule;
	}
};

/**
 * Get initialized Node modules (throws if not initialized)
 */
export const getNodeModules = (): {
	fs: typeof import("node:fs/promises");
	path: typeof import("node:path");
	crypto: typeof import("node:crypto");
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
				const pkg = JSON.parse(content) as { workspaces?: unknown };
				if (pkg.workspaces) {
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
export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Format bytes for human-readable display
 */
export const formatBytes = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(2)} ${units[unitIndex]}`;
};
