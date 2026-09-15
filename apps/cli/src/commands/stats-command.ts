/**
 * Stats and index command handlers
 */

import type { Command } from "commander"

import { FORMAT_OPTION, FORMAT_TABLE_DESC } from "../cli-options.js"
import { StaticEntityTypeSchema, StatsCommandOptionsSchema } from "../cli-schemas.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import type { OpenAlexCLI } from "../openalex-cli-class.js"

/**
Width, in characters, that a stats row's entity-type column is padded to.
 */
const STATS_ENTITY_TYPE_COLUMN_WIDTH = 12
/**
Width, in characters, that a stats row's entity-count column is padded to.
 */
const STATS_ENTITY_COUNT_COLUMN_WIDTH = 4
/**
Width, in characters, of the divider line printed under the stats header.
 */
const STATS_DIVIDER_WIDTH = 50

/**
 * Register stats command with program
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
				console.log("=".repeat(STATS_DIVIDER_WIDTH))

				for (const [entityType, data] of Object.entries(stats)) {
					const lastModule = new Date(data.lastModified).toLocaleString()

					console.log(
						`${entityType.toUpperCase().padEnd(STATS_ENTITY_TYPE_COLUMN_WIDTH)}: ${data.count.toString().padStart(STATS_ENTITY_COUNT_COLUMN_WIDTH)} entities, last: ${lastModule}`
					)
				}
			}
		})
}

/**
 * Register index command with program
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
