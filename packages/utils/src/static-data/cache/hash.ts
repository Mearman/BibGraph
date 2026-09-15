/**
 * Content Hashing Utilities Generate stable content hashes for cache entries
 */

import { logger } from "../../logger.js"

const SHA256_HASH_PREFIX_LENGTH = 16
const HASH_SHIFT_BITS = 5
const FALLBACK_HASH_RADIX = 16
const FALLBACK_HASH_PAD_LENGTH = 8

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Determine whether the current runtime is Node.js (as opposed to a browser). `typeof process` is a safe check even when `process` is never declared at all, unlike referencing the identifier directly.
 */
const isNodeRuntime = (): boolean => typeof process !== "undefined" && typeof process.versions.node === "string"

/**
 * Generate content hash excluding volatile metadata fields Uses SHA256 for consistency and excludes fields that change without content changing
 */
export const generateContentHash = async (data: unknown): Promise<string> => {
	try {
		// Create a copy and remove volatile metadata fields
		let cleanContent: unknown = data

		if (isRecord(data)) {
			const dataObject: Record<string, unknown> = { ...data }

			// Remove the entire meta field as it contains API metadata, not entity content
			delete dataObject.meta

			cleanContent = dataObject
		}

		// Generate stable hash
		const jsonString = JSON.stringify(cleanContent, Object.keys(cleanContent ?? {}).sort())

		// Use dynamic import for crypto to support both Node.js and browser environments
		if (isNodeRuntime()) {
			// Node.js environment
			const { createHash } = await import("node:crypto")
			return createHash("sha256").update(jsonString).digest("hex").slice(0, SHA256_HASH_PREFIX_LENGTH)
		} else {
			// Browser environment - use a simple hash fallback
			let hash = 0
			for (let index = 0; index < jsonString.length; index++) {
				const char = jsonString.charCodeAt(index)
				hash = (hash << HASH_SHIFT_BITS) - hash + char
				hash &= hash // Convert to 32bit integer
			}
			return Math.abs(hash).toString(FALLBACK_HASH_RADIX).padStart(FALLBACK_HASH_PAD_LENGTH, "0")
		}
	} catch (error) {
		logger.warn("cache", "Failed to generate content hash", { error })
		return "hash-error"
	}
}
