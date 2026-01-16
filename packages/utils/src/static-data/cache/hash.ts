/**
 * Content Hashing Utilities
 * Generate stable content hashes for cache entries
 */

import { logger } from "../../logger.js"

/**
 * Generate content hash excluding volatile metadata fields
 * Uses SHA256 for consistency and excludes fields that change without content changing
 * @param data
 */
export const generateContentHash = async (data: unknown): Promise<string> => {
	try {
		// Create a copy and remove volatile metadata fields
		let cleanContent: unknown = data

		if (data && typeof data === "object" && !Array.isArray(data)) {
			const dataObj = data as Record<string, unknown>
			cleanContent = { ...dataObj }

			// Remove the entire meta field as it contains API metadata, not entity content
			if ("meta" in dataObj) {
				delete (cleanContent as Record<string, unknown>).meta
			}
		}

		// Generate stable hash
		const jsonString = JSON.stringify(cleanContent, Object.keys(cleanContent ?? {}).sort())

		// Use dynamic import for crypto to support both Node.js and browser environments
		if (globalThis.process?.versions?.node) {
			// Node.js environment
			const { createHash } = await import("node:crypto")
			return createHash("sha256").update(jsonString).digest("hex").slice(0, 16)
		} else {
			// Browser environment - use a simple hash fallback
			let hash = 0
			for (let i = 0; i < jsonString.length; i++) {
				const char = jsonString.charCodeAt(i)
				hash = (hash << 5) - hash + char
				hash = hash & hash // Convert to 32bit integer
			}
			return Math.abs(hash).toString(16).padStart(8, "0")
		}
	} catch (error) {
		logger.warn("cache", "Failed to generate content hash", { error })
		return "hash-error"
	}
}
