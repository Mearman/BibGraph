/**
 * Cache management command handlers
 */

import type { Command } from "commander"

import { StaticCacheManager } from "../cache/static-cache-manager.js"
import {
	CACHE_GENERATE_STATIC_CMD,
	ENTITY_TYPE_OPTION,
	FORMAT_OPTION,
	FORMAT_TABLE_DESC,
	LIMIT_OPTION,
	LIMIT_RESULTS_DESC,
} from "../cli-options.js"
import {
	CacheClearCommandOptionsSchema,
	CacheClearStaticCommandOptionsSchema,
	CacheFieldCoverageCommandOptionsSchema,
	CacheGenerateStaticCommandOptionsSchema,
	CachePopularCollectionsCommandOptionsSchema,
	CachePopularEntitiesCommandOptionsSchema,
	CacheStatsCommandOptionsSchema,
	CacheValidateStaticCommandOptionsSchema,
	StaticEntityTypeSchema,
} from "../cli-schemas.js"
import type { StaticEntityType } from "../entity-detection.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register cache:stats command
 * @param program
 * @param cli
 */
export const registerCacheStatsCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("cache:stats")
		.description("Show synthetic cache statistics and field accumulation data")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (options: unknown) => {
			const optionsValidation = CacheStatsCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const stats = await cli.getCacheStats()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(stats, null, 2))
			} else {
				console.log("\nSynthetic Cache Statistics:")
				console.log("=".repeat(50))

				if (stats.performance) {
					console.log("Performance Metrics:")
					console.log(`  Total Requests: ${stats.performance.totalRequests.toString()}`)
					console.log(`  Cache Hit Rate: ${(stats.performance.cacheHitRate * 100).toFixed(1)}%`)
					console.log(`  Surgical Requests: ${stats.performance.surgicalRequestCount.toString()}`)
					console.log(`  Bandwidth Saved: ${(stats.performance.bandwidthSaved / 1024).toFixed(1)} KB`)
					console.log("")
				}

				if (stats.storage?.memory) {
					console.log("Memory Storage:")
					console.log(`  Entities: ${(stats.storage.memory.entities ?? 0).toString()}`)
					console.log(`  Fields: ${(stats.storage.memory.fields ?? 0).toString()}`)
					console.log(`  Collections: ${(stats.storage.memory.collections ?? 0).toString()}`)
					console.log(`  Size: ${((stats.storage.memory.size ?? 0) / 1024).toFixed(1)} KB`)
				}
			}
		})
}

/**
 * Register cache:field-coverage command
 * @param program
 * @param cli
 */
export const registerCacheFieldCoverageCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("cache:field-coverage")
		.description("Show field coverage for a specific entity across all cache tiers")
		.argument("<entity-type>", "Type of entity")
		.argument("<entity-id>", "ID of entity")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (entityType: string, entityId: string, options: unknown) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const optionsValidation = CacheFieldCoverageCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const coverage = await cli.getFieldCoverage()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(coverage, null, 2))
			} else {
				console.log(`\nField Coverage for ${entityType.toUpperCase()}: ${entityId}`)
				console.log("=".repeat(50))

				console.log(`Memory: ${coverage.memory.length.toString()} fields`)
				if (coverage.memory.length > 0) {
					console.log(`  ${coverage.memory.join(", ")}`)
				}

				console.log(`Local Storage: ${coverage.localStorage.length.toString()} fields`)
				if (coverage.localStorage.length > 0) {
					console.log(`  ${coverage.localStorage.join(", ")}`)
				}

				console.log(`IndexedDB: ${coverage.indexedDB.length.toString()} fields`)
				if (coverage.indexedDB.length > 0) {
					console.log(`  ${coverage.indexedDB.join(", ")}`)
				}

				console.log(`Static Data: ${coverage.static.length.toString()} fields`)
				if (coverage.static.length > 0) {
					console.log(`  ${coverage.static.join(", ")}`)
				}

				console.log(`\nTotal Unique Fields: ${coverage.total.length.toString()}`)
			}
		})
}

/**
 * Register cache:popular-entities command
 * @param program
 * @param cli
 */
export const registerCachePopularEntitiesCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("cache:popular-entities")
		.description("Show well-populated entities with extensive field coverage")
		.argument("<entity-type>", "Type of entity")
		.option(LIMIT_OPTION, LIMIT_RESULTS_DESC)
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (entityType: string, options: unknown) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const optionsValidation = CachePopularEntitiesCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const entities = await cli.getWellPopulatedEntities()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(entities, null, 2))
			} else {
				console.log(
					`\nWell-Populated ${entityType.toUpperCase()} Entities (${entities.length.toString()}):`
				)
				console.log("=".repeat(50))

				for (const [index, entity] of entities.entries()) {
					console.log(
						`${(index + 1).toString().padStart(3)}: ${entity.entityId} (${entity.fieldCount.toString()} fields)`
					)
					if (entity.fields.length > 0) {
						const displayFields = entity.fields.slice(0, 5)
						const extraCount = entity.fields.length - displayFields.length
						const fieldsText = displayFields.join(", ")
						const suffix = extraCount > 0 ? ` +${extraCount.toString()} more` : ""
						console.log(`     Fields: ${fieldsText}${suffix}`)
					}
				}
			}
		})
}

/**
 * Register cache:popular-collections command
 * @param program
 * @param cli
 */
export const registerCachePopularCollectionsCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("cache:popular-collections")
		.description("Show popular cached collections with high entity counts")
		.option(LIMIT_OPTION, LIMIT_RESULTS_DESC)
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (options: unknown) => {
			const optionsValidation = CachePopularCollectionsCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const collections = await cli.getPopularCollections()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(collections, null, 2))
			} else {
				console.log(`\nPopular Cached Collections (${collections.length.toString()}):`)
				console.log("=".repeat(50))

				for (const [index, collection] of collections.entries()) {
					console.log(`${(index + 1).toString().padStart(3)}: ${collection.queryKey}`)
					console.log(
						`     Entities: ${collection.entityCount.toString()}, Pages: ${collection.pageCount.toString()}`
					)
				}
			}
		})
}

/**
 * Register cache:clear command
 * @param program
 * @param cli
 */
export const registerCacheClearCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("cache:clear")
		.description("Clear all synthetic cache data (memory, collections)")
		.option("--confirm", "Skip confirmation prompt")
		.action(async (options: unknown) => {
			const optionsValidation = CacheClearCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			if (!validatedOptions.confirm) {
				console.log("This will clear all synthetic cache data including:")
				console.log("- Entity field accumulations in memory")
				console.log("- Collection result mappings")
				console.log("- Performance metrics")
				console.log("")
				console.log("Static data cache files will NOT be affected.")
				console.log("")
				console.log("To confirm, run: pnpm cli cache:clear --confirm")
				return
			}

			await cli.clearSyntheticCache()
			console.log("Synthetic cache cleared successfully.")
		})
}

/**
 * Register cache:generate-static command
 * @param program
 * @param staticCacheManager
 */
export const registerCacheGenerateStaticCommand = (
	program: Command,
	staticCacheManager: StaticCacheManager
): void => {
	program
		.command(CACHE_GENERATE_STATIC_CMD)
		.description("Generate static cache with environment-aware operations")
		.option(ENTITY_TYPE_OPTION, "Generate for specific entity type only")
		.option("--limit <limit>", "Limit number of entities to generate")
		.option("--force", "Force regeneration even if files exist")
		.option("--dry-run", "Show what would be generated without writing files")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (options: unknown) => {
			const optionsValidation = CacheGenerateStaticCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			let entityType: StaticEntityType | undefined

			if (validatedOptions.entityType) {
				const entityTypeValidation = StaticEntityTypeSchema.safeParse(validatedOptions.entityType)
				if (!entityTypeValidation.success) {
					console.error(`Unsupported entity type: ${validatedOptions.entityType}`)
					console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
					process.exit(1)
				}
				entityType = entityTypeValidation.data
			}

			const config = staticCacheManager.getConfig()
			console.log(`\nStatic Cache Generation (${config.mode} mode):`)
			console.log("=".repeat(50))

			if (config.mode === "production") {
				console.error("Error: Cannot generate static cache in production mode")
				console.error("Set NODE_ENV=development to enable cache generation")
				process.exit(1)
			}

			try {
				const limit = validatedOptions.limit ? Number.parseInt(validatedOptions.limit) : undefined
				const generateOptions = {
					entityTypes: entityType ? [entityType] : undefined,
					limit,
					force: !!validatedOptions.force,
					dryRun: !!validatedOptions.dryRun,
				}

				await staticCacheManager.generateStaticCache(generateOptions)

				console.log(`\nGeneration ${validatedOptions.dryRun ? "(Dry Run) " : ""}completed successfully`)

				if (!validatedOptions.dryRun) {
					console.log("Run 'pnpm cli cache:validate-static' to verify the generated cache")
				}
			} catch (error) {
				console.error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`)
				process.exit(1)
			}
		})
}

/**
 * Register cache:validate-static command
 * @param program
 * @param staticCacheManager
 */
export const registerCacheValidateStaticCommand = (
	program: Command,
	staticCacheManager: StaticCacheManager
): void => {
	program
		.command("cache:validate-static")
		.description("Validate static cache integrity and structure")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.option("--verbose", "Show detailed validation information")
		.action(async (options: unknown) => {
			const optionsValidation = CacheValidateStaticCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const config = staticCacheManager.getConfig()

			console.log(`\nStatic Cache Validation (${config.mode} mode):`)
			console.log("=".repeat(50))

			try {
				const validation = await staticCacheManager.validateCache()

				if (validatedOptions.format === "json") {
					console.log(JSON.stringify(validation, null, 2))
				} else {
					console.log(`Status: ${validation.isValid ? "VALID" : "INVALID"}`)
					console.log(`Errors: ${validation.errors.length.toString()}`)
					console.log(`Warnings: ${validation.warnings.length.toString()}`)
					console.log(`Corrupted Files: ${validation.corruptedFiles.length.toString()}`)
					console.log(`Missing Indexes: ${validation.missingIndexes.length.toString()}`)
				}

				if (validatedOptions.verbose || !validation.isValid) {
					if (validation.errors.length > 0) {
						console.log("\nErrors:")
						for (const [index, error] of validation.errors.entries()) {
							console.log(`  ${(index + 1).toString()}. ${error}`)
						}
					}

					if (validation.warnings.length > 0) {
						console.log("\nWarnings:")
						for (const [index, warning] of validation.warnings.entries()) {
							console.log(`  ${(index + 1).toString()}. ${warning}`)
						}
					}

					if (validation.corruptedFiles.length > 0) {
						console.log("\nCorrupted Files:")
						for (const [index, file] of validation.corruptedFiles.entries()) {
							console.log(`  ${(index + 1).toString()}. ${file}`)
						}
					}
				}

				console.log("\nEntity Counts:")
				for (const [entityType, count] of Object.entries(validation.entityCounts)) {
					console.log(`  ${entityType}: ${count.toString()}`)
				}
			} catch (error) {
				console.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`)
				process.exit(1)
			}
		})
}

/**
 * Register cache:clear-static command
 * @param program
 * @param staticCacheManager
 */
export const registerCacheClearStaticCommand = (
	program: Command,
	staticCacheManager: StaticCacheManager
): void => {
	program
		.command("cache:clear-static")
		.description("Clear static cache data")
		.option("--entity-type <type>", "Clear only specific entity type")
		.option("--confirm", "Skip confirmation prompt")
		.action(async (options: unknown) => {
			const optionsValidation = CacheClearStaticCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const config = staticCacheManager.getConfig()

			if (config.mode === "production") {
				console.error("Error: Cannot clear static cache in production mode")
				console.error("Set NODE_ENV=development to enable cache clearing")
				process.exit(1)
			}

			let entityTypes: StaticEntityType[] | undefined
			if (validatedOptions.entityType) {
				const entityTypeValidation = StaticEntityTypeSchema.safeParse(validatedOptions.entityType)
				if (!entityTypeValidation.success) {
					console.error(`Unsupported entity type: ${validatedOptions.entityType}`)
					console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
					process.exit(1)
				}
				entityTypes = [entityTypeValidation.data]
			}

			if (!validatedOptions.confirm) {
				console.log("This will clear static cache data including:")
				if (entityTypes) {
					console.log(`- Entity data for: ${entityTypes.join(", ")}`)
				} else {
					console.log("- All entity data files")
					console.log("- All index files")
					console.log("- All query cache files")
				}
				console.log("")
				console.log("To confirm, run with --confirm flag")
				return
			}

			try {
				await staticCacheManager.clearStaticCache(entityTypes)
				const targetDesc = entityTypes ? entityTypes.join(", ") : "all entity types"
				console.log(`Static cache cleared successfully for: ${targetDesc}`)
			} catch (error) {
				console.error(
					`Clear operation failed: ${error instanceof Error ? error.message : String(error)}`
				)
				process.exit(1)
			}
		})
}

/**
 * Register all cache commands
 * @param program
 * @param cli
 * @param staticCacheManager
 */
export const registerCacheCommands = (
	program: Command,
	cli: OpenAlexCLI,
	staticCacheManager: StaticCacheManager
): void => {
	registerCacheStatsCommand(program, cli)
	registerCacheFieldCoverageCommand(program, cli)
	registerCachePopularEntitiesCommand(program, cli)
	registerCachePopularCollectionsCommand(program, cli)
	registerCacheClearCommand(program, cli)
	registerCacheGenerateStaticCommand(program, staticCacheManager)
	registerCacheValidateStaticCommand(program, staticCacheManager)
	registerCacheClearStaticCommand(program, staticCacheManager)
}
