/**
 * Zod schemas for CLI validation
 */

import { z } from "zod"

/**
 * Static entity type schema - validates supported entity types
 */
export const StaticEntityTypeSchema = z.enum([
	"authors",
	"works",
	"institutions",
	"topics",
	"publishers",
	"funders",
])

/**
 * Query result item schema for display
 */
export const QueryResultItemSchema = z
	.object({
		display_name: z.string().optional(),
		id: z.string().optional(),
	})
	.strict()

/**
 * Query result schema for API responses
 */
export const QueryResultSchema = z
	.object({
		results: z.array(QueryResultItemSchema),
		meta: z
			.object({
				count: z.number().optional(),
			})
			.strict()
			.optional(),
	})
	.strict()

/**
 * List command options schema
 */
export const ListCommandOptionsSchema = z.object({
	count: z.boolean().optional(),
	format: z.string().optional(),
})

/**
 * Search command options schema
 */
export const SearchCommandOptionsSchema = z.object({
	limit: z.union([z.string(), z.undefined()]).optional(),
	format: z.string().optional(),
})

/**
 * Get typed command options schema
 */
export const GetTypedCommandOptionsSchema = z.object({
	format: z.string().optional(),
	pretty: z.boolean().optional(),
	noCache: z.boolean().optional(),
	noSave: z.boolean().optional(),
	cacheOnly: z.boolean().optional(),
})

/**
 * Stats command options schema
 */
export const StatsCommandOptionsSchema = z.object({
	format: z.string().optional(),
})

/**
 * Cache stats command options schema
 */
export const CacheStatsCommandOptionsSchema = z.object({
	format: z.string().optional(),
})

/**
 * Cache field coverage command options schema
 */
export const CacheFieldCoverageCommandOptionsSchema = z.object({
	format: z.string().optional(),
})

/**
 * Cache popular entities command options schema
 */
export const CachePopularEntitiesCommandOptionsSchema = z.object({
	limit: z.union([z.string(), z.undefined()]).optional(),
	format: z.string().optional(),
})

/**
 * Cache popular collections command options schema
 */
export const CachePopularCollectionsCommandOptionsSchema = z.object({
	limit: z.union([z.string(), z.undefined()]).optional(),
	format: z.string().optional(),
})

/**
 * Cache clear command options schema
 */
export const CacheClearCommandOptionsSchema = z.object({
	confirm: z.boolean().optional(),
})

/**
 * Static analyze command options schema
 */
export const StaticAnalyzeCommandOptionsSchema = z.object({
	format: z.string().optional(),
})

/**
 * Static generate command options schema
 */
export const StaticGenerateCommandOptionsSchema = z.object({
	entityType: z.string().optional(),
	dryRun: z.boolean().optional(),
	force: z.boolean().optional(),
})

/**
 * Cache generate static command options schema
 */
export const CacheGenerateStaticCommandOptionsSchema = z.object({
	entityType: z.string().optional(),
	limit: z.union([z.string(), z.undefined()]).optional(),
	force: z.boolean().optional(),
	dryRun: z.boolean().optional(),
	format: z.string().optional(),
})

/**
 * Cache validate static command options schema
 */
export const CacheValidateStaticCommandOptionsSchema = z.object({
	format: z.string().optional(),
	verbose: z.boolean().optional(),
})

/**
 * Cache clear static command options schema
 */
export const CacheClearStaticCommandOptionsSchema = z.object({
	entityType: z.string().optional(),
	confirm: z.boolean().optional(),
})

/**
 * Fetch command options schema
 */
export const FetchCommandOptionsSchema = z.object({
	perPage: z.union([z.string(), z.undefined()]).optional(),
	page: z.union([z.string(), z.undefined()]).optional(),
	filter: z.string().optional(),
	select: z.string().optional(),
	sort: z.string().optional(),
	noCache: z.boolean().optional(),
	noSave: z.boolean().optional(),
	cacheOnly: z.boolean().optional(),
	format: z.string().optional(),
})

// Export inferred types
export type GetTypedCommandOptions = z.infer<typeof GetTypedCommandOptionsSchema>
export type FetchCommandOptions = z.infer<typeof FetchCommandOptionsSchema>
export type ListCommandOptions = z.infer<typeof ListCommandOptionsSchema>
export type SearchCommandOptions = z.infer<typeof SearchCommandOptionsSchema>
export type StatsCommandOptions = z.infer<typeof StatsCommandOptionsSchema>
export type CacheStatsCommandOptions = z.infer<typeof CacheStatsCommandOptionsSchema>
export type CacheFieldCoverageCommandOptions = z.infer<typeof CacheFieldCoverageCommandOptionsSchema>
export type CachePopularEntitiesCommandOptions = z.infer<typeof CachePopularEntitiesCommandOptionsSchema>
export type CachePopularCollectionsCommandOptions = z.infer<typeof CachePopularCollectionsCommandOptionsSchema>
export type CacheClearCommandOptions = z.infer<typeof CacheClearCommandOptionsSchema>
export type StaticAnalyzeCommandOptions = z.infer<typeof StaticAnalyzeCommandOptionsSchema>
export type StaticGenerateCommandOptions = z.infer<typeof StaticGenerateCommandOptionsSchema>
export type CacheGenerateStaticCommandOptions = z.infer<typeof CacheGenerateStaticCommandOptionsSchema>
export type CacheValidateStaticCommandOptions = z.infer<typeof CacheValidateStaticCommandOptionsSchema>
export type CacheClearStaticCommandOptions = z.infer<typeof CacheClearStaticCommandOptionsSchema>
