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
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register static:analyze command
 * @param program
 * @param cli
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
				console.log("=".repeat(50))

				console.log("Entity Type Distribution:")
				for (const [type, count] of Object.entries(analysis.entityDistribution)) {
					console.log(`  ${type.padEnd(12)}: ${count.toString().padStart(4)} entities`)
				}

				console.log(`\nTotal Static Entities: ${analysis.totalEntities.toString()}`)
				console.log(`Cache Hit Potential: ${(analysis.cacheHitPotential * 100).toFixed(1)}%`)
				console.log(
					`Recommended for Generation: ${analysis.recommendedForGeneration.length.toString()} entity types`
				)

				if (analysis.recommendedForGeneration.length > 0) {
					console.log(`  ${analysis.recommendedForGeneration.join(", ")}`)
				}

				if (analysis.gaps.length > 0) {
					console.log(`\nIdentified Gaps: ${analysis.gaps.length.toString()}`)
					for (const [index, gap] of analysis.gaps.slice(0, 5).entries()) {
						console.log(`  ${(index + 1).toString().padStart(2)}: ${gap}`)
					}
					if (analysis.gaps.length > 5) {
						console.log(`     +${(analysis.gaps.length - 5).toString()} more gaps identified`)
					}
				}
			}
		})
}

/**
 * Register static:generate command
 * @param program
 * @param cli
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

			if (validatedOptions.entityType) {
				const entityTypeValidation = StaticEntityTypeSchema.safeParse(validatedOptions.entityType)
				if (!entityTypeValidation.success) {
					console.error(`Unsupported entity type: ${validatedOptions.entityType}`)
					console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
					process.exit(1)
				}
				entityType = entityTypeValidation.data
			}

			const result = await cli.generateStaticDataFromPatterns(entityType, {
				dryRun: !!validatedOptions.dryRun,
				force: !!validatedOptions.force,
			})

			console.log(`\nStatic Data Generation ${validatedOptions.dryRun ? "(Dry Run)" : "Completed"}:`)
			console.log("=".repeat(50))

			console.log(
				`Files ${validatedOptions.dryRun ? "would be" : ""} processed: ${result.filesProcessed.toString()}`
			)
			console.log(
				`Entities ${validatedOptions.dryRun ? "would be" : ""} cached: ${result.entitiesCached.toString()}`
			)
			console.log(
				`Queries ${validatedOptions.dryRun ? "would be" : ""} cached: ${result.queriesCached.toString()}`
			)

			if (result.errors.length > 0) {
				console.log(`\nErrors encountered: ${result.errors.length.toString()}`)
				for (const [index, error] of result.errors.slice(0, 3).entries()) {
					console.log(`  ${(index + 1).toString().padStart(2)}: ${error}`)
				}
				if (result.errors.length > 3) {
					console.log(`     +${(result.errors.length - 3).toString()} more errors`)
				}
			}

			if (!validatedOptions.dryRun && result.filesProcessed > 0) {
				console.log(`\nStatic data cache updated. Run 'pnpm cli static:analyze' to verify.`)
			}
		})
}

/**
 * Register all static commands
 * @param program
 * @param cli
 */
export const registerStaticCommands = (program: Command, cli: OpenAlexCLI): void => {
	registerStaticAnalyzeCommand(program, cli)
	registerStaticGenerateCommand(program, cli)
}
