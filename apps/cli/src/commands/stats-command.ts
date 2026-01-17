/**
 * Stats and index command handlers
 */

import type { Command } from "commander"

import { FORMAT_OPTION, FORMAT_TABLE_DESC } from "../cli-options.js"
import { StaticEntityTypeSchema, StatsCommandOptionsSchema } from "../cli-schemas.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import { OpenAlexCLI } from "../openalex-cli-class.js"

/**
 * Register stats command with program
 * @param program
 * @param cli
 */
export const registerStatsCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("stats")
		.description("Show statistics for all entity types")
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (options: unknown) => {
			const optionsValidation = StatsCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const validatedOptions = optionsValidation.data
			const stats: Record<string, { count: number; lastModified: string }> = await cli.getStatistics()

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(stats, null, 2))
			} else {
				console.log("\nOpenAlex Static Data Statistics:")
				console.log("=".repeat(50))

				for (const [entityType, data] of Object.entries(stats)) {
					const lastMod = new Date(data.lastModified).toLocaleString()

					console.log(
						`${entityType.toUpperCase().padEnd(12)}: ${data.count.toString().padStart(4)} entities, last: ${lastMod}`
					)
				}
			}
		})
}

/**
 * Register index command with program
 * @param program
 * @param cli
 */
export const registerIndexCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("index")
		.description("Show index information for entity type")
		.argument("<entity-type>", "Type of entity")
		.action(async (entityType: string) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const staticEntityType = entityTypeValidation.data
			const index = await cli.loadUnifiedIndex(staticEntityType)

			if (!index) {
				console.error(`No unified index found for ${entityType}`)
				process.exit(1)
			}

			console.log(JSON.stringify(index, null, 2))
		})
}
