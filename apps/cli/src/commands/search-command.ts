/**
 * Search command handler
 */

import type { Command } from "commander"

import { FORMAT_OPTION, FORMAT_TABLE_DESC, LIMIT_OPTION, LIMIT_RESULTS_DESC } from "../cli-options.js"
import { SearchCommandOptionsSchema,StaticEntityTypeSchema } from "../cli-schemas.js"
import { SUPPORTED_ENTITIES } from "../entity-detection.js"
import type { OpenAlexCLI } from "../openalex-cli-class.js"

/**
Default number of search results returned when no `--limit` option is provided.
 */
const DEFAULT_SEARCH_RESULT_LIMIT = 10
/**
Width, in characters, that search result row numbers are padded to.
 */
const SEARCH_ROW_NUMBER_WIDTH = 3

/**
 * Register search command with program
 */
export const registerSearchCommand = (program: Command, cli: OpenAlexCLI): void => {
	program
		.command("search")
		.description("Search entities by display name")
		.argument("<entity-type>", "Type of entity to search")
		.argument("<term>", "Search term")
		.option(LIMIT_OPTION, LIMIT_RESULTS_DESC)
		.option(FORMAT_OPTION, FORMAT_TABLE_DESC)
		.action(async (entityType: string, searchTerm: string, options: unknown) => {
			const entityTypeValidation = StaticEntityTypeSchema.safeParse(entityType)
			if (!entityTypeValidation.success) {
				console.error(`Unsupported entity type: ${entityType}`)
				console.error(`Supported types: ${SUPPORTED_ENTITIES.join(", ")}`)
				process.exit(1)
			}

			const optionsValidation = SearchCommandOptionsSchema.safeParse(options)
			if (!optionsValidation.success) {
				console.error(`Invalid options: ${optionsValidation.error.message}`)
				process.exit(1)
			}

			const staticEntityType = entityTypeValidation.data
			const validatedOptions = optionsValidation.data
			const results = await cli.searchEntities(staticEntityType, searchTerm)
			const limit =
				typeof validatedOptions.limit === "string" ? Number(validatedOptions.limit) : DEFAULT_SEARCH_RESULT_LIMIT
			const limitedResults = results.slice(0, limit)

			if (validatedOptions.format === "json") {
				console.log(JSON.stringify(limitedResults, null, 2))
			} else {
				console.log(
					`\nSearch results for "${searchTerm}" in ${entityType} (${limitedResults.length.toString()}/${results.length.toString()}):`
				)
				for (const [index, entity] of limitedResults.entries()) {
					console.log(`${(index + 1).toString().padStart(SEARCH_ROW_NUMBER_WIDTH)}: ${entity.display_name} (${entity.id})`)
				}
			}
		})
}
