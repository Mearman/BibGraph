/**
 * Static data command handlers
 */

import type { Command } from "commander"

import { ENTITY_TYPE_OPTION,FORMAT_OPTION, FORMAT_TABLE_DESC } from "../cli-options.js"
import {
	StaticAnalyzeCommandOptionsSchema,
	StaticEntityTypeSchema,
	StaticGenerateCommandOptionsSchema,
} from "../cli-schemas.js"
import type { StaticEntityType } from "../entity-detection.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import type { OpenAlexCLI } from "../openalex-cli-class.js"

/**
Width, in characters, of the divider line printed under a static-command header.
 */
const STATIC_DIVIDER_WIDTH = 50
/**
Width, in characters, that an entity-type column is padded to.
 */
const ENTITY_TYPE_COLUMN_WIDTH = 12
/**
Width, in characters, that an entity-count column is padded to.
 */
const ENTITY_COUNT_COLUMN_WIDTH = 4
/**
Multiplier used to convert a 0-1 cache-hit ratio into a percentage.
 */
const PERCENTAGE_MULTIPLIER = 100
/**
Maximum number of identified gaps previewed before eliding the rest.
 */
const MAX_GAPS_PREVIEW = 5
/**
Maximum number of generation errors previewed before eliding the rest.
 */
const MAX_ERRORS_PREVIEW = 3

/**
 * Register static:analyze command
 */
export const registerStaticAnalyzeCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("static:analyze")
		.description("Analyze static data cache usage patterns and suggest optimizations")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (options: unknown) => {
			const optionsValidation = StaticAnalyzeCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const analysis = await cli.analyzeStaticDataUsage()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(analysis, null, 2))
			} else {
				console.log("\nStatic Data Cache Analysis:")
				console.log("=".repeat(STATIC_DIVIDER_WIDTH))

				console.log("Entity Type Distribution:")
				for (const [type, count] of Object.entries(analysis.entityDistribution)) {
					console.log(`  ${type.padEnd(ENTITY_TYPE_COLUMN_WIDTH)}: ${count.toString().padStart(ENTITY_COUNT_COLUMN_WIDTH)} entities`)
				}

				console.log(`\nTotal Static Entities: ${analysis.totalEntities.toString()}`)
				console.log(`Cache Hit Potential: ${(analysis.cacheHitPotential * PERCENTAGE_MULTIPLIER).toFixed(1)}%`)
				console.log(
					`Recommended for Generation: ${analysis.recommendedForGeneration.length.toString()} entity types`
				)

				if (analysis.recommendedForGeneration.length > 0) {
					console.log(`  ${analysis.recommendedForGeneration.join(", ")}`)
				}

				if (analysis.gaps.length > 0) {
					console.log(`\nIdentified Gaps: ${analysis.gaps.length.toString()}`)
					for (const [index, gap] of analysis.gaps.slice(0, MAX_GAPS_PREVIEW).entries()) {
						console.log(`  ${(index + 1).toString().padStart(2)}: ${gap}`)
					}
					if (analysis.gaps.length > MAX_GAPS_PREVIEW) {
						console.log(`     +${(analysis.gaps.length - MAX_GAPS_PREVIEW).toString()} more gaps identified`)
					}
				}
			}
		})
}

/**
 * Register static:generate command
 */
export const registerStaticGenerateCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("static:generate")
		.description("Generate optimized static data cache from usage patterns")
		.option(ENTITY_TYPE_OPTION, "Generate for specific entity type only")
		.option("--dry-run", "Show what would be generated without writing files")
		.option("--force", "Force regeneration even if files exist")
		.action(async (options: unknown) => {
			const optionsValidation = StaticGenerateCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			let entityType: StaticEntityType | undefined

			if (validatedOptions.entityType !== undefined && validatedOptions.entityType !== "") {
				const entityTypeValidation = StaticEntityTypeSchema.safeParse(validatedOptions.entityType)
				if (!entityTypeValidation.success) {
					console.error(`Unsupported entity type: ${validatedOptions.entityType}`)
					console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
					process.exit(1)
				}
				entityType = entityTypeValidation.data
			}

			const isDryRun = validatedOptions.dryRun === true

			const result = await cli.generateStaticDataFromPatterns(entityType, {
				dryRun: isDryRun,
				force: validatedOptions.force === true,
			})

			console.log(`\nStatic Data Generation ${isDryRun ? "(Dry Run)" : "Completed"}:`)
			console.log("=".repeat(STATIC_DIVIDER_WIDTH))

			console.log(
				`Files ${isDryRun ? "would be" : ""} processed: ${result.filesProcessed.toString()}`
			)
			console.log(
				`Entities ${isDryRun ? "would be" : ""} cached: ${result.entitiesCached.toString()}`
			)
			console.log(
				`Queries ${isDryRun ? "would be" : ""} cached: ${result.queriesCached.toString()}`
			)

			if (result.errors.length > 0) {
				console.log(`\nErrors encountered: ${result.errors.length.toString()}`)
				for (const [index, error] of result.errors.slice(0, MAX_ERRORS_PREVIEW).entries()) {
					console.log(`  ${(index + 1).toString().padStart(2)}: ${error}`)
				}
				if (result.errors.length > MAX_ERRORS_PREVIEW) {
					console.log(`     +${(result.errors.length - MAX_ERRORS_PREVIEW).toString()} more errors`)
				}
			}

			if (!isDryRun && result.filesProcessed > 0) {
				console.log(`\nStatic data cache updated. Run 'pnpm cli static:analyze' to verify.`)
			}
		})
}

/**
 * Register all static commands
 */
export const registerStaticCommands = (program: Command, cli: OpenAlexCLI): void => {
	registerStaticAnalyzeCommand(program, cli)
	registerStaticGenerateCommand(program, cli)
}
