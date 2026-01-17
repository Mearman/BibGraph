/**
 * Validation helper functions for CLI
 */

import {
	type FetchCommandOptions,
	FetchCommandOptionsSchema,
	type GetTypedCommandOptions,
	GetTypedCommandOptionsSchema,
	StaticEntityTypeSchema,
} from "./cli-schemas.js"
import type { StaticEntityType } from "./entity-detection.js"
import { detectEntityType, SUPPORTED_ENTITIES, toStaticEntityType } from "./entity-detection.js"
import type { CacheOptions, QueryOptions } from "./openalex-cli-class.js"

/**
 * Validate and convert string to StaticEntityType
 * @param entityType
 */
export const validateEntityType = (entityType: string): StaticEntityType => {
	const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
	if (!entityTypeValidation.success) {
		console.error(`Unsupported entity type: ${entityType}`)
		console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
		process.exit(1)
	}
	return entityTypeValidation.data
}

/**
 * Validate get command options
 * @param options
 */
export const validateGetCommandOptions = (options: unknown): GetTypedCommandOptions => {
	const optionsValidation = GetTypedCommandOptionsSchema.safeParse(options)
	if (!optionsValidation.success) {
		console.error(`Invalid options: ${optionsValidation.error.message}`)
		process.exit(1)
	}
	return optionsValidation.data
}

/**
 * Build cache options from validated command options
 * @param validatedOptions
 */
export const buildCacheOptions = (validatedOptions: GetTypedCommandOptions): CacheOptions => ({
	useCache: !validatedOptions.noCache,
	saveToCache: !validatedOptions.noSave,
	cacheOnly: validatedOptions.cacheOnly ?? false,
})

/**
 * Detect and validate entity type from entity ID
 * @param entityId
 */
export const detectAndValidateEntityType = (entityId: string): StaticEntityType => {
	try {
		const entityType = detectEntityType(entityId)
		return toStaticEntityType(entityType)
	} catch {
		console.error(`Cannot detect entity type from ID: ${entityId}`)
		console.error(
			"Expected format: W2241997964 (works), A5017898742 (authors), S123 (sources), I123 (institutions), T123 (topics), P123 (publishers)"
		)
		console.error("Or full URLs like: https://openalex.org/A5017898742")
		console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
		process.exit(1)
	}
}

/**
 * Validate fetch command options
 * @param options
 */
export const validateFetchCommandOptions = (options: unknown): FetchCommandOptions => {
	const optionsValidation = FetchCommandOptionsSchema.safeParse(options)
	if (!optionsValidation.success) {
		console.error(`Invalid options: ${optionsValidation.error.message}`)
		process.exit(1)
	}
	return optionsValidation.data
}

/**
 * Build query options from validated fetch command options
 * @param validatedOptions
 */
export const buildQueryOptions = (validatedOptions: FetchCommandOptions): QueryOptions => {
	const perPage =
		typeof validatedOptions.perPage === "string" ? Number.parseInt(validatedOptions.perPage, 10) : 25
	const page = typeof validatedOptions.page === "string" ? Number.parseInt(validatedOptions.page, 10) : 1

	const queryOptions: QueryOptions = {
		per_page: perPage,
		page,
	}

	if (validatedOptions.filter) queryOptions.filter = validatedOptions.filter
	if (validatedOptions.select)
		queryOptions.select = validatedOptions.select.split(",").map((s) => s.trim())
	if (validatedOptions.sort) queryOptions.sort = validatedOptions.sort

	return queryOptions
}
