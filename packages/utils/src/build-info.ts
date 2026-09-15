/**
 * Build information utilities
 * Provides functions to work with build metadata and generate links
 */

import { getRelativeTime } from "./date-helpers.js"

// Global build info injected at build time by Vite
declare const __BUILD_INFO__: BuildInfo

export interface BuildInfo {
	buildTimestamp: string
	commitHash: string
	shortCommitHash: string
	commitTimestamp: string
	branchName: string
	version: string
	repositoryUrl: string
}

/**
 * Get build information from global metadata injected during build
 * This relies on build-time metadata injection via Vite or similar bundler
 *
 * Note: __BUILD_INFO__ is a compile-time constant replaced by Vite's define option.
 * In environments without build-time injection (e.g., CLI, tests), it falls back to defaults.
 */
export const getBuildInfo = (): BuildInfo => {
	// __BUILD_INFO__ is replaced at compile-time by Vite's define option
	// Use typeof check to handle environments where it's not defined
	if (typeof __BUILD_INFO__ !== "undefined") {
		return __BUILD_INFO__
	}

	// Fallback for development or when build info is not available
	return {
		buildTimestamp: new Date().toISOString(),
		commitHash: "unknown",
		shortCommitHash: "unknown",
		commitTimestamp: new Date().toISOString(),
		branchName: "unknown",
		version: "0.0.0-dev",
		repositoryUrl: "https://github.com/Mearman/BibGraph",
	}
};

/**
 * Format build timestamp to human-readable string
 */
export const formatBuildTimestamp = (timestamp: string): string => {
	try {
		const date = new Date(timestamp)
		return date.toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		})
	} catch {
		return "Unknown"
	}
};

/**
 * Generate GitHub commit URL
 */
export const getCommitUrl = ({
	repositoryUrl,
	commitHash,
}: {
	repositoryUrl: string
	commitHash: string
}): string => {
	if (commitHash === "unknown" || !repositoryUrl) {
		return repositoryUrl || "#"
	}

	// Handle both github.com and raw GitHub URLs
	const baseUrl = repositoryUrl.replace(/\.git$/, "")
	return `${baseUrl}/commit/${commitHash}`
};

/**
 * Generate GitHub release URL
 */
export const getReleaseUrl = ({
	repositoryUrl,
	version,
}: {
	repositoryUrl: string
	version: string
}): string => {
	if (version === "0.0.0-dev" || !repositoryUrl) {
		return repositoryUrl || "#"
	}

	// Handle both github.com and raw GitHub URLs
	const baseUrl = repositoryUrl.replace(/\.git$/, "")

	// Check if version starts with 'v', if not add it
	const tagVersion = version.startsWith("v") ? version : `v${version}`

	return `${baseUrl}/releases/tag/${tagVersion}`
};

/**
 * Get relative time since build
 */
export const getRelativeBuildTime = (buildTimestamp: string): string => {
	try {
		const buildDate = new Date(buildTimestamp)
		return getRelativeTime(buildDate)
	} catch {
		return "unknown time ago"
	}
};
